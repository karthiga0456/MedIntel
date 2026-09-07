from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class PopulationMetrics(BaseModel):
    registered_patients: int
    age_distribution: Dict[str, int]  # "0-18", "19-35", "36-50", "51-65", "65+"
    gender_distribution: Dict[str, int]  # "male", "female", "other"
    village_distribution: Dict[str, int]


class DiseaseMetrics(BaseModel):
    total_cases: int
    disease_prevalence: Dict[str, int]
    high_risk_locations: List[str]
    disease_trends: Dict[str, Any]


class VaccinationMetrics(BaseModel):
    coverage_percentage: float
    fully_vaccinated: int
    partially_vaccinated: int
    unvaccinated: int


class WorkerMetrics(BaseModel):
    total_workers: int
    total_field_visits: int
    patients_assisted: int
    pending_emergency_cases: int


class AnalyticsSummaryResponse(BaseModel):
    total_cases_ytd: int
    active_outbreak_alerts: int
    disease_trends: Dict[str, Any]
    resource_allocation: Dict[str, Any]
    population: PopulationMetrics
    disease: DiseaseMetrics
    vaccination: VaccinationMetrics
    workers: WorkerMetrics
