from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class LabResultItem(BaseModel):
    test_name: str
    value: float
    unit: str
    reference_range: str
    status: str  # LOW, NORMAL, HIGH, CRITICAL


class LabReportUploadResponse(BaseModel):
    id: str
    patient_id: str
    title: str
    test_type: str
    report_date: datetime
    summary: str
    disclaimer: str
    results: List[LabResultItem] = []


class LabReportResponse(BaseModel):
    id: str
    patient_id: str
    title: str
    test_type: str
    report_date: datetime
    summary: Optional[str] = None
    created_at: datetime
    results: List[LabResultItem] = []

    model_config = {"from_attributes": True}


class LabHistoryResponse(BaseModel):
    patient_id: str
    reports: List[LabReportResponse] = []
    biomarker_trends: Dict[str, List[Dict[str, Any]]] = {}
