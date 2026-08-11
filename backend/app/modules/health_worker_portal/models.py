"""
SQLAlchemy ORM models for offline-first local storage (Health Worker Portal).
Records are created locally by ASHA workers even without internet, then
synced to the central server when connectivity is available.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime

from app.db.session import Base


class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, nullable=False)
    village = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    symptoms = Column(String, nullable=True)
    vaccination_status = Column(String, nullable=True)
    worker_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=False)   # True once pushed to central server
