from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.surveillance import schemas, service

router = APIRouter()


@router.post("/cases", response_model=schemas.DiseaseCaseResponse)
def report_disease_case(
    data: schemas.DiseaseCaseCreate,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Log an epidemiological disease case for public health surveillance."""
    return service.surveillance_service.create_case(db, data)


@router.get("/summary", response_model=schemas.SurveillanceSummaryResponse)
def get_surveillance_summary(
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve community-wide disease surveillance summary, village stats, and anomalies."""
    return service.surveillance_service.get_summary(db)


@router.get("/ping")
def ping():
    return {"module": "surveillance", "status": "ok"}
