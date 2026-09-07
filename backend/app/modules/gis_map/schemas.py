from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class VillageGeoPoint(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    population: int
    total_cases: int
    active_cases_7d: int
    vaccination_rate_percent: float
    risk_level: str  # LOW, MODERATE, HIGH, OUTBREAK
    top_disease: str


class HealthFacility(BaseModel):
    id: str
    name: str
    facility_type: str  # Primary Health Centre, Community Health Centre, District Hospital
    latitude: float
    longitude: float
    available_beds: int
    emergency_contact: str


class OutbreakCluster(BaseModel):
    id: str
    disease: str
    center_lat: float
    center_lng: float
    radius_meters: int
    case_count: int
    severity: str


class MapLayersResponse(BaseModel):
    villages: List[VillageGeoPoint] = []
    facilities: List[HealthFacility] = []
    outbreak_clusters: List[OutbreakCluster] = []
