from app.db import get_pool


async def log_access(user_id: str, hospital_id: str, resource: str, resource_id: str | None, action: str):
    """
    Fire-and-forget-ish audit write for access to sensitive resources
    (patient records especially). Deliberately swallows its own errors —
    a logging failure should never block the actual request, but silently
    losing audit coverage is also bad, so at minimum this could be swapped
    to also emit to an external log sink (Sentry breadcrumb, etc.) later.
    """
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, hospital_id, resource, resource_id, action)
                VALUES ($1, $2, $3, $4, $5)
                """,
                user_id, hospital_id, resource, resource_id, action,
            )
    except Exception:
        # Don't let audit-logging failures break the actual request.
        # A real deployment should alert on this happening at all, though —
        # silent audit-log gaps are themselves a compliance problem.
        pass
