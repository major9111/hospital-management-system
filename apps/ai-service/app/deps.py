import os
import jwt
from fastapi import Header, HTTPException

# The gateway authenticates the user and RBAC-checks the request BEFORE it
# ever reaches this service, then signs a short-lived internal JWT carrying
# the resolved identity/scope. This service verifies that signature rather
# than trusting plain headers, so nothing else on the private network can
# spoof a request even if it can reach this port directly.

INTERNAL_SERVICE_SECRET = os.environ["INTERNAL_SERVICE_SECRET"]


class RequestContext:
    def __init__(self, user_id: str, hospital_id: str, roles: list[str], scope: str):
        self.user_id = user_id
        self.hospital_id = hospital_id
        self.roles = roles
        self.scope = scope  # 'own' | 'department' | 'hospital' | 'all'


def get_request_context(x_internal_token: str = Header(...)) -> RequestContext:
    try:
        payload = jwt.decode(
            x_internal_token, INTERNAL_SERVICE_SECRET, algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Internal token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid internal token")

    return RequestContext(
        user_id=payload["userId"],
        hospital_id=payload["hospitalId"],
        roles=payload["roles"],
        scope=payload["scope"],
    )
