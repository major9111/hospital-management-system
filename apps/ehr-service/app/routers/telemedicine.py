import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_request_context, RequestContext
from app.db import scoped_connection

router = APIRouter()

DAILY_API_KEY = os.environ.get("DAILY_API_KEY")  # if unset, falls back to the stub provider


async def _create_room(appointment_id: str) -> tuple[str, str]:
    """Returns (room_url, provider_name)."""
    if DAILY_API_KEY:
        # Real provider: Daily.co. One room per appointment, auto-expiring
        # a day after creation so stale rooms don't pile up.
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.daily.co/v1/rooms",
                headers={"Authorization": f"Bearer {DAILY_API_KEY}"},
                json={
                    "name": f"appt-{appointment_id}-{uuid.uuid4().hex[:6]}",
                    "properties": {"exp": None},  # set an expiry timestamp in production
                },
            )
            response.raise_for_status()
            return response.json()["url"], "daily_co"

    # STUB fallback — lets the whole booking/join flow work end to end
    # without a Daily.co account configured yet.
    return f"https://meet.stub-provider.example/{appointment_id}-{uuid.uuid4().hex[:8]}", "stub"


@router.post("/sessions")
async def create_session(appointment_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        appointment = await conn.fetchrow(
            "SELECT id FROM appointments WHERE id = $1 AND hospital_id = $2",
            appointment_id, ctx.hospital_id,
        )
        if appointment is None:
            raise HTTPException(status_code=404, detail="Appointment not found")

        existing = await conn.fetchrow(
            "SELECT id, room_url, status FROM telemedicine_sessions WHERE appointment_id = $1",
            appointment_id,
        )
        if existing:
            return {"id": str(existing["id"]), "roomUrl": existing["room_url"], "status": existing["status"]}

        room_url, provider = await _create_room(appointment_id)
        row = await conn.fetchrow(
            """
            INSERT INTO telemedicine_sessions (appointment_id, room_url, provider)
            VALUES ($1, $2, $3) RETURNING id, status
            """,
            appointment_id, room_url, provider,
        )
    return {"id": str(row["id"]), "roomUrl": room_url, "status": row["status"], "provider": provider}


@router.get("/sessions/{appointment_id}")
async def get_session(appointment_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            SELECT ts.* FROM telemedicine_sessions ts
            JOIN appointments a ON a.id = ts.appointment_id
            WHERE ts.appointment_id = $1 AND a.hospital_id = $2
            """,
            appointment_id, ctx.hospital_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="No session for this appointment")
    return dict(row) | {"id": str(row["id"]), "appointment_id": str(row["appointment_id"])}


@router.post("/sessions/{appointment_id}/start")
async def start_session(appointment_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            UPDATE telemedicine_sessions SET status = 'active', started_at = now()
            WHERE appointment_id = $1 RETURNING id
            """,
            appointment_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "active"}


@router.post("/sessions/{appointment_id}/end")
async def end_session(appointment_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            UPDATE telemedicine_sessions SET status = 'ended', ended_at = now()
            WHERE appointment_id = $1 RETURNING id
            """,
            appointment_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ended"}
