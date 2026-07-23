from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_request_context, RequestContext
from app.db import scoped_connection
from app.audit import log_access

router = APIRouter()


@router.get("/me")
async def get_my_patient_record(ctx: RequestContext = Depends(get_request_context)):
    # Lets a patient-role caller resolve their own patient_id without it
    # ever appearing as a URL param they could tamper with — the frontend
    # calls this first, then uses the returned id for
    # /prescriptions/patient/:id and /lab/orders/patient/:id.
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            SELECT id, full_name, date_of_birth, gender, phone, email
            FROM patients WHERE user_id = $1 AND hospital_id = $2
            """,
            ctx.user_id, ctx.hospital_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="No patient record linked to this account")
    return dict(row) | {"id": str(row["id"])}


@router.get("/{patient_id}")
async def get_patient(patient_id: str, ctx: RequestContext = Depends(get_request_context)):
    # scoped_connection sets `app.current_hospital_id` for this transaction,
    # activating the RLS policy on `patients` as defense-in-depth on top of
    # the explicit hospital_id filter below — belt and suspenders, not
    # either/or, since RLS alone wouldn't catch a query that forgot the
    # WHERE clause, and the WHERE clause alone wouldn't catch a future
    # query path that bypasses this router entirely.
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            SELECT id, hospital_id, user_id, full_name, date_of_birth, gender,
                   phone, emergency_contact, created_at
            FROM patients WHERE id = $1 AND hospital_id = $2
            """,
            patient_id, ctx.hospital_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    # scope='own' means the caller should only see their own record — if
    # this is a patient token, enforce that their user_id matches.
    if ctx.scope == "own" and row["user_id"] and str(row["user_id"]) != ctx.user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this record")

    await log_access(ctx.user_id, ctx.hospital_id, "patient_record", patient_id, "read")
    return dict(row) | {"id": str(row["id"])}


@router.get("/")
async def list_patients(ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        rows = await conn.fetch(
            """
            SELECT id, full_name, date_of_birth, gender, phone
            FROM patients WHERE hospital_id = $1
            ORDER BY full_name
            """,
            ctx.hospital_id,
        )
    return {
        "hospital_id": ctx.hospital_id,
        "patients": [dict(r) | {"id": str(r["id"])} for r in rows],
    }
