import os
import logging
from fastapi import APIRouter, Depends
from elasticsearch import AsyncElasticsearch, ConnectionError as ESConnectionError
from app.deps import get_request_context, RequestContext
from app.db import get_pool

router = APIRouter()
log = logging.getLogger("search")

es = AsyncElasticsearch(os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200"))


@router.get("/patients")
async def search_patients(q: str, ctx: RequestContext = Depends(get_request_context)):
    # Elasticsearch is the primary path (typo-tolerant, scales better for
    # large free-text queries). If it's unreachable, fall back to Postgres
    # full-text search on `patients.search_vector` (see db/schema.sql) —
    # slower and less forgiving of typos, but keeps search working without
    # a second service having to stay up.
    try:
        result = await es.search(
            index="patients",
            query={
                "bool": {
                    "must": [{"match": {"full_name": q}}],
                    "filter": [{"term": {"hospital_id": ctx.hospital_id}}],
                }
            },
            size=20,
        )
        hits = [hit["_source"] | {"id": hit["_id"]} for hit in result["hits"]["hits"]]
        return {"results": hits, "source": "elasticsearch"}
    except ESConnectionError:
        log.warning("Elasticsearch unreachable, falling back to Postgres full-text search")
        return await _search_patients_postgres(q, ctx)


async def _search_patients_postgres(q: str, ctx: RequestContext):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, hospital_id, full_name, date_of_birth, gender, phone, created_at
            FROM patients
            WHERE hospital_id = $1 AND search_vector @@ plainto_tsquery('english', $2)
            ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC
            LIMIT 20
            """,
            ctx.hospital_id, q,
        )
    return {
        "results": [dict(r) | {"id": str(r["id"])} for r in rows],
        "source": "postgres_fallback",
    }
