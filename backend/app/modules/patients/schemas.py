from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class MedicalHistoryItem(BaseModel):
    condition: str
    diagnosed_date: Optional[str] = None
    notes: Optional[str] = None


class PatientBase(BaseModel):
    name: str
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = "other"
    phone: Optional[str] = None
    address: Optional[str] = None
    village: str
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    vaccination_status: Optional[str] = "partially_vaccinated"


class PatientCreate(PatientBase):
    uhid: Optional[str] = None
    initial_history: Optional[List[MedicalHistoryItem]] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    vaccination_status: Optional[str] = None
    is_archived: Optional[bool] = None


class ConsultationCreate(BaseModel):
    worker_id: Optional[str] = None
    chief_complaint: str
    diagnosis: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None  # bp, pulse, temp, spo2
    notes: Optional[str] = None


class PatientResponse(PatientBase):
    id: str
    uhid: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimelineEvent(BaseModel):
    id: str
    event_type: str  # REGISTRATION, CONSULTATION, PRESCRIPTION, LAB_REPORT, VACCINATION, FIELD_VISIT
    title: str
    description: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class PatientDetailResponse(PatientResponse):
    medical_history: List[Dict[str, Any]] = []
    consultations: List[Dict[str, Any]] = []
    prescriptions: List[Dict[str, Any]] = []
    lab_reports: List[Dict[str, Any]] = []
    vaccinations: List[Dict[str, Any]] = []
    timeline: List[TimelineEvent] = []


class PatientListResponse(BaseModel):
    items: List[PatientResponse]
    total: int
    page: int
    size: int
    pages: int
