from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class HealthRecordCreate(BaseModel):
    patient_name: str
    village: str
    age: Optional[int] = None
    symptoms: Optional[str] = None
    vaccination_status: Optional[str] = None
    worker_id: str


class HealthRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_name: str
    village: str
    age: Optional[int] = None
    symptoms: Optional[str] = None
    vaccination_status: Optional[str] = None
    worker_id: str
    created_at: datetime
    synced: bool = False


class FieldVisitCreate(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    village: str
    symptoms: Optional[str] = None
    vaccination_administered: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class WorkerProfileResponse(BaseModel):
    worker_id: str
    name: str
    employee_code: Optional[str] = None
    assigned_villages: List[str] = []
    total_visits_logged: int = 0
    total_patients_assisted: int = 0
