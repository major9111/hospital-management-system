import os
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import redis.asyncio as redis
from app.deps import get_request_context, RequestContext
from app.claude_client import get_receptionist_reply
from app.internal_client import book_appointment_via_ehr

router = APIRouter()
_redis = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))


class IntakeMessage(BaseModel):
    patient_message: str
    session_id: str
    # Client resends prior turns each call (this service is stateless) —
    # a real deployment would key this off session_id in Redis instead.
    history: list[dict] = []


class BookingRequest(BaseModel):
    department: str
    scheduled_at: str  # ISO 8601


# Symptom keywords that always escalate to a human instead of letting the
# AI continue the conversation. Keep this conservative — false positives
# (unnecessary escalation) are far cheaper than false negatives here.
URGENT_KEYWORDS = [
    "chest pain", "can't breathe", "severe bleeding", "unconscious",
    "suicidal", "stroke", "seizure",
]


@router.post("/chat")
async def chat(msg: IntakeMessage, ctx: RequestContext = Depends(get_request_context)):
    lowered = msg.patient_message.lower()

    if any(keyword in lowered for keyword in URGENT_KEYWORDS):
        await _redis.publish(
            "events:ai_escalation",
            json.dumps({
                "patientPhone": None,  # populate from the patient record once looked up
                "reason": "urgent_symptom_detected",
                "sessionId": msg.session_id,
            }),
        )
        return {
            "action": "escalate_to_human",
            "reason": "urgent_symptom_detected",
            "message": (
                "This sounds urgent — connecting you with a nurse right away. "
                "If this is an emergency, please call emergency services immediately."
            ),
        }

    # Non-urgent path: Claude handles intake/FAQ conversation under a system
    # prompt that forbids diagnosis (see claude_client.py). It only ever
    # gathers information here — actual booking happens via POST /book,
    # a separate deterministic call, so the model can never silently create
    # a record on the hospital's behalf.
    reply = await get_receptionist_reply(msg.patient_message, msg.history)
    return {
        "action": "continue_conversation",
        "hospital_id": ctx.hospital_id,
        "message": reply,
    }


@router.post("/book")
async def book(req: BookingRequest, ctx: RequestContext = Depends(get_request_context)):
    # Deterministic, non-AI booking call — the receptionist chat gathers the
    # department/time conversationally, but this endpoint is what actually
    # creates the appointment, so there's always a concrete audit trail of
    # who/what triggered the write.
    result = await book_appointment_via_ehr(
        user_id=ctx.user_id,
        hospital_id=ctx.hospital_id,
        roles=ctx.roles,
        department=req.department,
        scheduled_at=req.scheduled_at,
    )
    return {"action": "booked", "appointment": result}
