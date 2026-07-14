"""
Business logic for the Health Worker Portal.

Intended pipeline (to be implemented):
  1. Allow ASHA / health workers to log patient visits, symptoms, and
     vaccination status entirely offline, backed by a local SQLite DB.
  2. Queue unsynced records and push them to the central server /
     outbreak-prediction pipeline once internet connectivity returns.
  3. Feed anonymized aggregate data to the government analytics dashboard.
"""
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.modules.health_worker_portal.models import HealthRecord
from app.modules.health_worker_portal.schemas import HealthRecordCreate

logger = get_logger(__name__)


class HealthWorkerPortalService:
    def create_record(self, db: Session, record: HealthRecordCreate) -> HealthRecord:
        logger.info("Logging health record for worker %s", record.worker_id)
        db_record = HealthRecord(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record

    def list_records(self, db: Session, worker_id: str | None = None):
        query = db.query(HealthRecord)
        if worker_id:
            query = query.filter(HealthRecord.worker_id == worker_id)
        return query.all()

    def sync_pending(self, db: Session):
        """TODO: push unsynced records to central server, mark as synced."""
        pending = db.query(HealthRecord).filter(HealthRecord.synced == False).all()  # noqa: E712
        logger.info("%d records pending sync", len(pending))
        return pending


health_worker_portal_service = HealthWorkerPortalService()
