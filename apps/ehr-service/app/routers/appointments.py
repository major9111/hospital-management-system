from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.deps import get_request_context, RequestContext
from app.db import scoped_connection
from app.notify_client import notify_appointment_booked

router = APIRouter()


class CreateAppointmentRequest(BaseModel):
    department: str
    scheduledAt: str  # ISO 8601
    bookedVia: str = "staff"  # 'staff' | 'ai_receptionist' | 'patient_portal'
    patientId: str | None = None  # required for staff/ai bookings; defaults to ctx.user_id's patient row


@router.get("/")
async def list_appointments(ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        if ctx.scope == "own" and "patient" in ctx.roles:
            rows = await conn.fetch(
                """
                SELECT a.id, a.department, a.scheduled_at, a.status, a.booked_via,
                       p.full_name AS patient_name
                FROM appointments a JOIN patients p ON p.id = a.patient_id
                WHERE a.hospital_id = $1 AND p.user_id = $2
                ORDER BY a.scheduled_at
                """,
                ctx.hospital_id, ctx.user_id,
            )
        elif ctx.scope == "own" and "doctor" in ctx.roles:
            rows = await conn.fetch(
                """
                SELECT a.id, a.department, a.scheduled_at, a.status, a.booked_via,
                       p.full_name AS patient_name
                FROM appointments a JOIN patients p ON p.id = a.patient_id
                WHERE a.hospital_id = $1 AND a.doctor_id = $2
                ORDER BY a.scheduled_at
                """,
                ctx.hospital_id, ctx.user_id,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT a.id, a.department, a.scheduled_at, a.status, a.booked_via,
                       p.full_name AS patient_name
                FROM appointments a JOIN patients p ON p.id = a.patient_id
                WHERE a.hospital_id = $1
                ORDER BY a.scheduled_at
                """,
                ctx.hospital_id,
            )
    return {
        "hospital_id": ctx.hospital_id,
        "appointments": [
            {
                "id": str(r["id"]),
                "department": r["department"],
                "scheduledAt": r["scheduled_at"].isoformat(),
                "status": r["status"],
                "bookedVia": r["booked_via"],
                "patientName": r["patient_name"],
            }
            for r in rows
        ],
    }


@router.post("/")
async def create_appointment(
    body: CreateAppointmentRequest, ctx: RequestContext = Depends(get_request_context)
):
    async with scoped_connection(ctx.hospital_id) as conn:
        patient_id = body.patientId
        if patient_id is None:
            # Self-service booking (patient_portal / ai_receptionist on the
            # patient's own behalf): resolve their patient row from ctx.user_id.
            patient_row = await conn.fetchrow(
                "SELECT id, full_name, phone, email FROM patients WHERE user_id = $1 AND hospital_id = $2",
                ctx.user_id, ctx.hospital_id,
            )
            if patient_row is None:
                raise HTTPException(status_code=404, detail="No patient record linked to this account")
            patient_id = str(patient_row["id"])
        else:
            patient_row = await conn.fetchrow(
                "SELECT id, full_name, phone, email FROM patients WHERE id = $1 AND hospital_id = $2",
                patient_id, ctx.hospital_id,
            )
            if patient_row is None:
                raise HTTPException(status_code=404, detail="Patient not found")

        row = await conn.fetchrow(
            """
            INSERT INTO appointments (hospital_id, patient_id, department, scheduled_at, booked_via)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, status
            """,
            ctx.hospital_id, patient_id, body.department, body.scheduledAt, body.bookedVia,
        )

    await notify_appointment_booked(
        patient_email=patient_row["email"],
        patient_phone=patient_row["phone"],
        scheduled_at=body.scheduledAt,
        department=body.department,
    )

    return {
        "status": row["status"],
        "id": str(row["id"]),
        "hospital_id": ctx.hospital_id,
        "department": body.department,
        "scheduledAt": body.scheduledAt,
        "bookedVia": body.bookedVia,
    }
