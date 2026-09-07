from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AuditLog
from app.core.security import require_roles
from app.modules.audit.schemas import AuditLogResponse

router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    resource: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_payload: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin-only: Retrieve system audit logs with optional filtering.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
