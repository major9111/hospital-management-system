import os
import asyncpg
from contextlib import asynccontextmanager

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        database_url = os.environ["DATABASE_URL"]
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=2,
            max_size=10,
            ssl="require" if "neon.tech" in database_url else None,
        )
    return _pool


@asynccontextmanager
async def scoped_connection(hospital_id: str):
    """
    Acquires a connection and sets `app.current_hospital_id` for the
    duration of one transaction, activating the RLS policies in
    db/schema.sql (`tenant_isolation_patients`, `tenant_isolation_appointments`)
    as defense-in-depth on top of the WHERE-clause filtering the routers
    already do. Must be set with SET LOCAL inside a transaction — it does
    NOT persist across queries otherwise, and pooled connections get reused
    by other requests, so this can never leak between callers.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("SELECT set_config('app.current_hospital_id', $1, true)", hospital_id)
            yield conn
