from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.deps import get_request_context, RequestContext
from app.db import scoped_connection
from app.internal_client import adjust_inventory
from app.audit import log_access

router = APIRouter()


class PrescriptionItemInput(BaseModel):
    medicationName: str
    dosage: str
    frequency: str
    duration: str | None = None
    quantity: int
    inventoryItemId: str | None = None  # link to stock if it's a hospital-dispensed item


class CreatePrescriptionRequest(BaseModel):
    patientId: str
    appointmentId: str | None = None
    notes: str | None = None
    items: list[PrescriptionItemInput]


@router.post("/")
async def create_prescription(
    body: CreatePrescriptionRequest, ctx: RequestContext = Depends(get_request_context)
):
    if not body.items:
        raise HTTPException(status_code=400, detail="Prescription needs at least one item")

    async with scoped_connection(ctx.hospital_id) as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                INSERT INTO prescriptions (hospital_id, patient_id, doctor_id, appointment_id, notes)
                VALUES ($1, $2, $3, $4, $5) RETURNING id, status
                """,
                ctx.hospital_id, body.patientId, ctx.user_id, body.appointmentId, body.notes,
            )
            prescription_id = row["id"]

            for item in body.items:
                await conn.execute(
                    """
                    INSERT INTO prescription_items
                        (prescription_id, inventory_item_id, medication_name, dosage, frequency, duration, quantity)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    prescription_id, item.inventoryItemId, item.medicationName,
                    item.dosage, item.frequency, item.duration, item.quantity,
                )

    await log_access(ctx.user_id, ctx.hospital_id, "prescription", str(prescription_id), "write")
    return {"id": str(prescription_id), "status": row["status"], "itemCount": len(body.items)}


@router.get("/{prescription_id}")
async def get_prescription(prescription_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        prescription = await conn.fetchrow(
            "SELECT * FROM prescriptions WHERE id = $1 AND hospital_id = $2",
            prescription_id, ctx.hospital_id,
        )
        if prescription is None:
            raise HTTPException(status_code=404, detail="Prescription not found")
        items = await conn.fetch(
            "SELECT * FROM prescription_items WHERE prescription_id = $1", prescription_id
        )
    return {
        **{k: str(v) if k in ("id", "patient_id", "doctor_id", "appointment_id") else v
           for k, v in dict(prescription).items()},
        "items": [dict(i) | {"id": str(i["id"])} for i in items],
    }


@router.get("/patient/{patient_id}")
async def list_patient_prescriptions(patient_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        rows = await conn.fetch(
            """
            SELECT id, status, notes, created_at FROM prescriptions
            WHERE patient_id = $1 AND hospital_id = $2 ORDER BY created_at DESC
            """,
            patient_id, ctx.hospital_id,
        )
    return {"prescriptions": [dict(r) | {"id": str(r["id"])} for r in rows]}


@router.post("/items/{item_id}/fulfill")
async def fulfill_item(item_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        item = await conn.fetchrow(
            "SELECT id, prescription_id, inventory_item_id, quantity, fulfilled FROM prescription_items WHERE id = $1",
            item_id,
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Prescription item not found")
        if item["fulfilled"]:
            return {"itemId": item_id, "note": "Already fulfilled — no change made"}

        row = await conn.fetchrow(
            """
            UPDATE prescription_items
            SET fulfilled = true, fulfilled_by = $1, fulfilled_at = now()
            WHERE id = $2
            RETURNING id, prescription_id
            """,
            ctx.user_id, item_id,
        )

        remaining = await conn.fetchval(
            "SELECT count(*) FROM prescription_items WHERE prescription_id = $1 AND fulfilled = false",
            row["prescription_id"],
        )
        new_status = "fulfilled" if remaining == 0 else "partially_fulfilled"
        await conn.execute(
            "UPDATE prescriptions SET status = $1 WHERE id = $2", new_status, row["prescription_id"]
        )

    # Decrement real stock only if this item is linked to an inventory
    # record — walk-in/external medications (inventory_item_id NULL) skip
    # this, since there's no hospital stock to adjust for those.
    inventory_result = None
    if item["inventory_item_id"] is not None:
        try:
            inventory_result = await adjust_inventory(
                user_id=ctx.user_id,
                hospital_id=ctx.hospital_id,
                roles=ctx.roles,
                item_id=str(item["inventory_item_id"]),
                change_quantity=-item["quantity"],
                reason="dispensed",
            )
        except Exception as exc:
            # The prescription-item fulfillment already committed above —
            # a failed stock decrement shouldn't silently roll that back
            # (the patient already received the medication). Surface it
            # instead so staff can reconcile stock manually.
            return {
                "itemId": item_id,
                "prescriptionStatus": new_status,
                "inventoryAdjustment": "failed",
                "inventoryError": str(exc),
            }

    return {
        "itemId": item_id,
        "prescriptionStatus": new_status,
        "inventoryAdjustment": inventory_result,
    }
