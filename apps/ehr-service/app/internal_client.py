import os
import time
import jwt
import httpx

INTERNAL_SERVICE_SECRET = os.environ["INTERNAL_SERVICE_SECRET"]
BILLING_SERVICE_URL = os.environ.get("BILLING_SERVICE_URL", "http://localhost:3001")


def _sign_internal_token(user_id: str, hospital_id: str, roles: list[str], scope: str) -> str:
    payload = {
        "userId": user_id,
        "hospitalId": hospital_id,
        "roles": roles,
        "scope": scope,
        "exp": int(time.time()) + 30,
    }
    return jwt.encode(payload, INTERNAL_SERVICE_SECRET, algorithm="HS256")


async def adjust_inventory(
    user_id: str, hospital_id: str, roles: list[str], item_id: str, change_quantity: int, reason: str
) -> dict:
    token = _sign_internal_token(user_id, hospital_id, roles, scope="department")
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{BILLING_SERVICE_URL}/inventory/{item_id}/adjust",
            json={"changeQuantity": change_quantity, "reason": reason},
            headers={"x-internal-token": token},
        )
        response.raise_for_status()
        return response.json()
