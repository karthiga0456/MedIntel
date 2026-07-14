"""
API routes for the Health Worker Portal module.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.modules.health_worker_portal.schemas import HealthRecordCreate, HealthRecordResponse
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


@router.get("/ping")
def ping():
    return {"module": "health_worker_portal", "status": "ok"}
