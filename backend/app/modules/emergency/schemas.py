from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class EmergencyCaseCreate(BaseModel):
    patient_name: str
    patient_id: Optional[str] = None
    symptoms: str
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM
    location: str
    notes: Optional[str] = None


class EmergencyCaseUpdate(BaseModel):
    status: Optional[str] = None  # PENDING, DISPATCHED, RESOLVED, ESCALATED
    assigned_worker_id: Optional[str] = None
    notes: Optional[str] = None


class EmergencyCaseResponse(BaseModel):
    id: str
    patient_name: str
    patient_id: Optional[str] = None
    symptoms: str
    severity: str
    location: str
    assigned_worker_id: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
