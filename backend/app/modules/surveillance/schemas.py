from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DiseaseCaseCreate(BaseModel):
    disease: str
    village: str
    case_count: int = 1
    severity: Optional[str] = "moderate"
    patient_id: Optional[str] = None
    notes: Optional[str] = None


class DiseaseCaseResponse(BaseModel):
    id: str
    disease: str
    village: str
    reported_date: datetime
    case_count: int
    severity: str
    patient_id: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class VillageStat(BaseModel):
    village: str
    total_cases: int
    top_disease: str
    risk_status: str  # NORMAL, WATCH, OUTBREAK


class SurveillanceSummaryResponse(BaseModel):
    total_cases_all_time: int
    cases_last_7_days: int
    cases_last_30_days: int
    active_outbreak_clusters: int
    village_statistics: List[VillageStat] = []
    disease_breakdown: Dict[str, int] = {}
    time_series_trend: Dict[str, Any] = {}  # labels, data
    anomalies_detected: List[Dict[str, Any]] = []
