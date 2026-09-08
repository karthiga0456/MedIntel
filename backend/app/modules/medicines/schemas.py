from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class MedicineBase(BaseModel):
    generic_name: str
    brand_name: Optional[str] = None
    category: Optional[str] = None
    default_dosage: Optional[str] = None
    standard_frequency: Optional[str] = None
    warnings: Optional[str] = None
    indications: Optional[str] = None
    side_effects: Optional[str] = None
    interactions: Optional[List[str]] = []


class MedicineCreate(MedicineBase):
    pass


class MedicineResponse(MedicineBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration_days: Optional[int] = 5
    instructions: Optional[str] = "Take after meals"


class PrescriptionCreate(BaseModel):
    patient_id: str
    prescriber_name: str
    consultation_id: Optional[str] = None
    items: List[PrescriptionItemCreate]
    notes: Optional[str] = None


class InteractionWarning(BaseModel):
    severity: str  # SEVERE, MODERATE, MILD
    drug_a: str
    drug_b: str
    description: str


class AllergyWarning(BaseModel):
    severity: str
    drug_name: str
    allergy_matched: str
    warning_message: str


class SafetyCheckRequest(BaseModel):
    patient_id: Optional[str] = None
    medicine_names: List[str]


class PrescriptionValidationResult(BaseModel):
    has_warnings: bool
    allergy_warnings: List[AllergyWarning] = []
    drug_interactions: List[InteractionWarning] = []


class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    prescriber_name: str
    issue_date: datetime
    status: str
    notes: Optional[str] = None
    items: List[Dict[str, Any]] = []
    warnings: Optional[PrescriptionValidationResult] = None
