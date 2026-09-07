from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.emergency import schemas, service

router = APIRouter()


@router.post("", response_model=schemas.EmergencyCaseResponse)
def report_emergency(
    data: schemas.EmergencyCaseCreate,
    db: Session = Depends(get_db),
):
    """Log an immediate emergency case and alert healthcare response teams."""
    return service.emergency_service.create_case(db, data)


@router.get("", response_model=List[schemas.EmergencyCaseResponse])
def get_emergency_queue(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve priority emergency cases filtered by status and triage severity."""
    return service.emergency_service.list_cases(db, status=status, severity=severity)


@router.patch("/{case_id}", response_model=schemas.EmergencyCaseResponse)
def update_emergency_status(
    case_id: str,
    data: schemas.EmergencyCaseUpdate,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Update dispatch status, worker assignment, or resolution notes for an emergency case."""
    return service.emergency_service.update_case(db, case_id, data)
