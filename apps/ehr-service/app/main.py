from fastapi import FastAPI
from app.routers import patients, appointments, search, prescriptions, lab, telemedicine

app = FastAPI(title="EHR Service", version="0.1.0")

app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(lab.router, prefix="/lab", tags=["lab"])
app.include_router(telemedicine.router, prefix="/telemedicine", tags=["telemedicine"])


@app.get("/health")
def health():
    # Used by the load balancer / gateway for readiness checks
    return {"status": "ok"}
