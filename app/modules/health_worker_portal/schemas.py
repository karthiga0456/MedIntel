"""
Pydantic request/response models for the Health Worker Portal.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HealthRecordCreate(BaseModel):
    patient_name: str
    village: str
    age: Optional[int] = None
    symptoms: Optional[str] = None
    vaccination_status: Optional[str] = None
    worker_id: str


class HealthRecordResponse(BaseModel):
    id: int
    patient_name: str
    village: str
    age: Optional[int] = None
    symptoms: Optional[str] = None
    vaccination_status: Optional[str] = None
    worker_id: str
    created_at: datetime
    synced: bool = False

    class Config:
        from_attributes = True
