from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.logging import get_logger
from app.db.models import EmergencyCase, Notification
from app.modules.emergency.schemas import EmergencyCaseCreate, EmergencyCaseUpdate

logger = get_logger(__name__)


class EmergencyService:
    def create_case(self, db: Session, data: EmergencyCaseCreate) -> EmergencyCase:
        ec = EmergencyCase(
            patient_name=data.patient_name,
            patient_id=data.patient_id,
            symptoms=data.symptoms,
            severity=data.severity.upper(),
            location=data.location,
            notes=data.notes,
            status="PENDING",
            created_at=datetime.utcnow(),
        )
        db.add(ec)
        db.commit()
        db.refresh(ec)

        # Automatically broadcast high-priority notification to dashboard
        notif = Notification(
            title=f"🚨 CRITICAL: Emergency Case Reported in {data.location}",
            message=f"Patient {data.patient_name} reported severe symptoms: {data.symptoms}. Severity: {ec.severity}",
            category="EMERGENCY",
        )
        db.add(notif)
        db.commit()
        logger.warning(f"EMERGENCY DISPATCH TRIGGERED: Case {ec.id} in {data.location}")
        return ec

    def list_cases(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[EmergencyCase]:
        q = db.query(EmergencyCase)
        if status:
            q = q.filter(EmergencyCase.status == status.upper())
        if severity:
            q = q.filter(EmergencyCase.severity == severity.upper())
        return q.order_by(EmergencyCase.created_at.desc()).all()

    def update_case(self, db: Session, case_id: str, data: EmergencyCaseUpdate) -> EmergencyCase:
        ec = db.query(EmergencyCase).filter(EmergencyCase.id == case_id).first()
        if not ec:
            raise HTTPException(status_code=404, detail="Emergency case not found")

        if data.status:
            ec.status = data.status.upper()
            if ec.status == "RESOLVED":
                ec.resolved_at = datetime.utcnow()
        if data.assigned_worker_id:
            ec.assigned_worker_id = data.assigned_worker_id
        if data.notes:
            ec.notes = (ec.notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {data.notes}"

        db.commit()
        db.refresh(ec)
        return ec


emergency_service = EmergencyService()
