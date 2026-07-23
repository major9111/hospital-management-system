import os
import time
import jwt
import httpx

INTERNAL_SERVICE_SECRET = os.environ["INTERNAL_SERVICE_SECRET"]
EHR_SERVICE_URL = os.environ.get("EHR_SERVICE_URL", "http://localhost:8001")
NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://localhost:3002")


def _sign_internal_token(user_id: str, hospital_id: str, roles: list[str], scope: str) -> str:
    # Same claims shape and secret as the gateway's InternalTokenService —
    # any service that has INTERNAL_SERVICE_SECRET can mint one of these,
    # which is why that secret must be as tightly held as JWT_ACCESS_SECRET.
    payload = {
        "userId": user_id,
        "hospitalId": hospital_id,
        "roles": roles,
        "scope": scope,
        "exp": int(time.time()) + 30,
    }
    return jwt.encode(payload, INTERNAL_SERVICE_SECRET, algorithm="HS256")


async def book_appointment_via_ehr(
    user_id: str, hospital_id: str, roles: list[str], department: str, scheduled_at: str
) -> dict:
    token = _sign_internal_token(user_id, hospital_id, roles, scope="own")
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{EHR_SERVICE_URL}/appointments/",
            json={
                "department": department,
                "scheduledAt": scheduled_at,
                "bookedVia": "ai_receptionist",
            },
            headers={"x-internal-token": token},
        )
        response.raise_for_status()
        return response.json()


async def notify_escalation(session_id: str, reason: str, patient_phone: str | None = None):
    token = _sign_internal_token("system", "system", ["system"], scope="all")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notify/ai-escalation",
                json={"patientPhone": patient_phone, "reason": reason, "sessionId": session_id},
                headers={"x-internal-token": token},
            )
    except Exception:
        # An escalation notification failing shouldn't block the response
        # that's already telling the patient a human is being connected.
        pass
