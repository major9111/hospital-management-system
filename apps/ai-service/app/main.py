from fastapi import FastAPI
from app.routers import receptionist

app = FastAPI(title="AI Receptionist Service", version="0.1.0")

app.include_router(receptionist.router, prefix="/receptionist", tags=["receptionist"])


@app.get("/health")
def health():
    return {"status": "ok"}
