"""
Centralized audit logging service for MedIntel.
Records security and data operations into the AuditLog table.
Never logs sensitive secrets like passwords, tokens, or API keys.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.core.logging import get_logger

logger = get_logger(__name__)


def log_audit_event(
    db: Session,
    user_id: Optional[str],
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    result: str = "SUCCESS",
    ip_address: Optional[str] = None
) -> None:
    """
    Log an event to the audit table and system logger.
    """
    try:
        from app.db.models import AuditLog
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            result=result,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.commit()
        logger.info(f"AUDIT: action={action} user={user_id} resource={resource}:{resource_id} result={result}")
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")
