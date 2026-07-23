from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.deps import get_request_context, RequestContext
from app.db import scoped_connection

router = APIRouter()


class CreateLabOrderRequest(BaseModel):
    patientId: str
    appointmentId: str | None = None
    testName: str
    priority: str = "routine"  # 'routine' | 'urgent' | 'stat'


class ReportLabResultRequest(BaseModel):
    resultSummary: str
    resultData: dict | None = None
    isAbnormal: bool = False
    attachmentUrl: str | None = None


@router.post("/orders")
async def create_lab_order(body: CreateLabOrderRequest, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lab_orders (hospital_id, patient_id, ordered_by, appointment_id, test_name, priority)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status
            """,
            ctx.hospital_id, body.patientId, ctx.user_id, body.appointmentId, body.testName, body.priority,
        )
    return {"id": str(row["id"]), "status": row["status"]}


@router.get("/orders/{order_id}")
async def get_lab_order(order_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        order = await conn.fetchrow(
            "SELECT * FROM lab_orders WHERE id = $1 AND hospital_id = $2", order_id, ctx.hospital_id
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Lab order not found")
        results = await conn.fetch("SELECT * FROM lab_results WHERE lab_order_id = $1", order_id)
    return {
        **{k: (str(v) if k.endswith("_id") or k == "id" else v) for k, v in dict(order).items()},
        "results": [dict(r) | {"id": str(r["id"])} for r in results],
    }


@router.get("/orders/patient/{patient_id}")
async def list_patient_lab_orders(patient_id: str, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        rows = await conn.fetch(
            """
            SELECT id, test_name, priority, status, created_at FROM lab_orders
            WHERE patient_id = $1 AND hospital_id = $2 ORDER BY created_at DESC
            """,
            patient_id, ctx.hospital_id,
        )
    return {"labOrders": [dict(r) | {"id": str(r["id"])} for r in rows]}


@router.post("/orders/{order_id}/results")
async def report_result(order_id: str, body: ReportLabResultRequest, ctx: RequestContext = Depends(get_request_context)):
    async with scoped_connection(ctx.hospital_id) as conn:
        order = await conn.fetchrow(
            "SELECT id FROM lab_orders WHERE id = $1 AND hospital_id = $2", order_id, ctx.hospital_id
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Lab order not found")

        row = await conn.fetchrow(
            """
            INSERT INTO lab_results (lab_order_id, result_summary, result_data, is_abnormal, reported_by, attachment_url)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            """,
            order_id, body.resultSummary, body.resultData, body.isAbnormal, ctx.user_id, body.attachmentUrl,
        )
        await conn.execute("UPDATE lab_orders SET status = 'completed' WHERE id = $1", order_id)

    return {"id": str(row["id"]), "labOrderId": order_id, "status": "completed"}
