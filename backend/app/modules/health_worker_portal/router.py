"""
API routes for the Health Worker Portal module.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles, get_token_payload
from app.modules.health_worker_portal.schemas import (
    HealthRecordCreate,
    HealthRecordResponse,
    FieldVisitCreate,
    WorkerProfileResponse,
)
from app.modules.health_worker_portal.service import health_worker_portal_service

router = APIRouter()


@router.post("/records", response_model=HealthRecordResponse)
def create_record(record: HealthRecordCreate, db: Session = Depends(get_db)):
    """Log a new patient visit / health record (works offline via local SQLite)."""
    return health_worker_portal_service.create_record(db, record)


@router.get("/records", response_model=List[HealthRecordResponse])
def list_records(worker_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List logged health records, optionally filtered by worker."""
    return health_worker_portal_service.list_records(db, worker_id)


@router.post("/sync")
def sync_records(db: Session = Depends(get_db)):
    """Push any locally-logged, unsynced records to the central server."""
    pending = health_worker_portal_service.sync_pending(db)
    return {"pending_count": len(pending)}


@router.get("/profile", response_model=WorkerProfileResponse)
def get_worker_profile(
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve authenticated health worker profile and assigned villages."""
    user_id = token_payload.get("user_id") or "worker-default"
    email = token_payload.get("sub") or "worker@medintel.gov"
    return health_worker_portal_service.get_worker_profile(db, user_id, email)


@router.post("/visits")
def log_field_visit(
    visit: FieldVisitCreate,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Log a detailed home visit or vaccination administration."""
    worker_id = token_payload.get("user_id") or "worker-default"
    created = health_worker_portal_service.log_field_visit(db, worker_id, visit)
    return {"id": created.id, "status": "recorded"}


@router.get("/visits")
def list_field_visits(
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """List field visits for the authenticated worker."""
    worker_id = token_payload.get("user_id")
    visits = health_worker_portal_service.list_field_visits(db, worker_id)
    return [
        {
            "id": v.id,
            "patient_id": v.patient_id,
            "village": v.village,
            "visit_date": v.visit_date,
            "symptoms": v.symptoms,
            "vaccination_administered": v.vaccination_administered,
            "notes": v.notes,
            "follow_up_date": v.follow_up_date,
        }
        for v in visits
    ]


@router.get("/ping")
def ping():
    return {"module": "health_worker_portal", "status": "ok"}
