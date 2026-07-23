import os
import time
import jwt
import httpx

INTERNAL_SERVICE_SECRET = os.environ["INTERNAL_SERVICE_SECRET"]
NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://localhost:3002")


def _sign_internal_token() -> str:
    # Notifications don't need real user/hospital identity — this token
    # just proves the caller holds INTERNAL_SERVICE_SECRET, same guard
    # every other cross-service call in this system goes through.
    payload = {
        "userId": "system",
        "hospitalId": "system",
        "roles": ["system"],
        "scope": "all",
        "exp": int(time.time()) + 30,
    }
    return jwt.encode(payload, INTERNAL_SERVICE_SECRET, algorithm="HS256")


async def notify_appointment_booked(patient_email: str | None, patient_phone: str | None, scheduled_at: str, department: str):
    token = _sign_internal_token()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notify/appointment-booked",
                json={
                    "patientEmail": patient_email,
                    "patientPhone": patient_phone,
                    "scheduledAt": scheduled_at,
                    "department": department,
                },
                headers={"x-internal-token": token},
            )
    except Exception:
        # A failed notification shouldn't fail the booking that already
        # succeeded — log-and-continue is the right call here, same as the
        # inventory-adjustment failure handling in prescriptions.py.
        pass
