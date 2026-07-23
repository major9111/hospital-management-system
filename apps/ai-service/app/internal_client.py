import os
import time
import jwt
import httpx

INTERNAL_SERVICE_SECRET = os.environ["INTERNAL_SERVICE_SECRET"]
EHR_SERVICE_URL = os.environ.get("EHR_SERVICE_URL", "http://localhost:8001")


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
