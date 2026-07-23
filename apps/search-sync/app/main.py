import asyncio
import json
import logging
import os

import asyncpg
from elasticsearch import AsyncElasticsearch, NotFoundError

from app.mappings import (
    PATIENT_INDEX,
    APPOINTMENT_INDEX,
    PATIENT_MAPPING,
    APPOINTMENT_MAPPING,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("search-sync")

DATABASE_URL = os.environ["DATABASE_URL"]
ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200")

# Maps a Postgres table name to its ES index + the query that hydrates the
# full document for that table's id. Elasticsearch is a read-optimized
# mirror here — Postgres stays the system of record; this dict is the only
# place that needs updating when a new table is added to the sync.
TABLE_CONFIG = {
    "patients": {
        "index": PATIENT_INDEX,
        "mapping": PATIENT_MAPPING,
        "query": """
            SELECT id, hospital_id, full_name, date_of_birth, gender, phone, created_at
            FROM patients WHERE id = $1
        """,
    },
    "appointments": {
        "index": APPOINTMENT_INDEX,
        "mapping": APPOINTMENT_MAPPING,
        "query": """
            SELECT id, hospital_id, patient_id, doctor_id, department,
                   scheduled_at, status, booked_via
            FROM appointments WHERE id = $1
        """,
    },
}


async def ensure_indices(es: AsyncElasticsearch):
    for cfg in TABLE_CONFIG.values():
        exists = await es.indices.exists(index=cfg["index"])
        if not exists:
            await es.indices.create(index=cfg["index"], body=cfg["mapping"])
            log.info("Created index %s", cfg["index"])


async def full_reindex(pool: asyncpg.Pool, es: AsyncElasticsearch):
    """One-time (or on-demand) bulk sync — run this after a schema change
    or if the LISTEN/NOTIFY channel was down and events were missed."""
    for table, cfg in TABLE_CONFIG.items():
        async with pool.acquire() as conn:
            rows = await conn.fetch(f"SELECT id FROM {table}")
        for row in rows:
            await sync_row(pool, es, table, str(row["id"]))
        log.info("Reindexed %d rows from %s", len(rows), table)


async def sync_row(pool: asyncpg.Pool, es: AsyncElasticsearch, table: str, record_id: str):
    cfg = TABLE_CONFIG[table]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(cfg["query"], record_id)

    if row is None:
        # Row was deleted (or never existed) — remove from the index too.
        try:
            await es.delete(index=cfg["index"], id=record_id)
        except NotFoundError:
            pass
        return

    doc = dict(row)
    doc_id = str(doc.pop("id"))
    # Elasticsearch needs JSON-serializable values; asyncpg returns
    # datetime/UUID objects that json can't handle directly.
    for key, value in doc.items():
        if hasattr(value, "isoformat"):
            doc[key] = value.isoformat()
        elif not isinstance(value, (str, int, float, bool, type(None))):
            doc[key] = str(value)

    await es.index(index=cfg["index"], id=doc_id, document=doc)


async def listen_loop(pool: asyncpg.Pool, es: AsyncElasticsearch):
    conn = await pool.acquire()

    async def on_notify(_connection, _pid, _channel, payload):
        try:
            event = json.loads(payload)
            table = event["table"]
            record_id = event["id"]
            if table not in TABLE_CONFIG:
                return
            await sync_row(pool, es, table, record_id)
            log.info("Synced %s %s (%s)", table, record_id, event["op"])
        except Exception:
            log.exception("Failed to process change notification: %s", payload)

    await conn.add_listener("record_changes", on_notify)
    log.info("Listening for changes on 'record_changes'...")

    # Keep the connection (and process) alive indefinitely.
    while True:
        await asyncio.sleep(3600)


async def main():
    database_url = DATABASE_URL
    pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=5,
        ssl="require" if "neon.tech" in database_url else None,
    )
    es = AsyncElasticsearch(ELASTICSEARCH_URL)

    await ensure_indices(es)
    await full_reindex(pool, es)
    await listen_loop(pool, es)


if __name__ == "__main__":
    asyncio.run(main())
