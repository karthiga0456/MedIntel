from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.logging import get_logger
from app.db.models import HealthRecord, HealthWorker, Patient, FieldVisit, User
from app.modules.health_worker_portal.schemas import HealthRecordCreate, FieldVisitCreate, WorkerProfileResponse

logger = get_logger(__name__)


class HealthWorkerPortalService:
    def create_record(self, db: Session, record: HealthRecordCreate) -> HealthRecord:
        logger.info("Logging health record for worker %s", record.worker_id)
        db_record = HealthRecord(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record

    def list_records(self, db: Session, worker_id: Optional[str] = None) -> List[HealthRecord]:
        query = db.query(HealthRecord)
        if worker_id:
            query = query.filter(HealthRecord.worker_id == worker_id)
        return query.order_by(HealthRecord.created_at.desc()).all()

    def sync_pending(self, db: Session):
        pending = db.query(HealthRecord).filter(HealthRecord.synced == False).all()  # noqa: E712
        for r in pending:
            r.synced = True
        db.commit()
        logger.info("%d records marked as synced", len(pending))
        return pending

    def get_or_create_worker(self, db: Session, user_email: str, user_id: str) -> HealthWorker:
        worker = db.query(HealthWorker).filter(HealthWorker.user_id == user_id).first()
        if not worker:
            worker = HealthWorker(
                user_id=user_id,
                name=user_email.split("@")[0].capitalize(),
                employee_code=f"HW-{user_id[:6].upper()}",
                assigned_villages="Village A, Village B, Sector 4",
                active=True,
            )
            db.add(worker)
            db.commit()
            db.refresh(worker)
        return worker

    def get_worker_profile(self, db: Session, user_id: str, email: str) -> WorkerProfileResponse:
        worker = self.get_or_create_worker(db, email, user_id)
        visits_count = db.query(FieldVisit).filter(FieldVisit.worker_id == worker.id).count()
        records_count = db.query(HealthRecord).filter(HealthRecord.worker_id == user_id).count()
        
        villages = [v.strip() for v in (worker.assigned_villages or "").split(",") if v.strip()]
        return WorkerProfileResponse(
            worker_id=worker.id,
            name=worker.name,
            employee_code=worker.employee_code,
            assigned_villages=villages or ["Village A", "Village B"],
            total_visits_logged=visits_count + records_count,
            total_patients_assisted=records_count + visits_count,
        )

    def log_field_visit(self, db: Session, worker_id: str, visit: FieldVisitCreate) -> FieldVisit:
        new_visit = FieldVisit(
            worker_id=worker_id,
            patient_id=visit.patient_id,
            village=visit.village,
            symptoms=visit.symptoms,
            vaccination_administered=visit.vaccination_administered,
            notes=visit.notes,
            follow_up_date=visit.follow_up_date,
        )
        db.add(new_visit)
        db.commit()
        db.refresh(new_visit)
        return new_visit

    def list_field_visits(self, db: Session, worker_id: Optional[str] = None) -> List[FieldVisit]:
        q = db.query(FieldVisit)
        if worker_id:
            q = q.filter(FieldVisit.worker_id == worker_id)
        return q.order_by(FieldVisit.created_at.desc()).all()


health_worker_portal_service = HealthWorkerPortalService()
