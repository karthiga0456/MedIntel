from pydantic import BaseModel
from typing import List, Dict, Any

class AnalyticsSummaryResponse(BaseModel):
    total_cases_ytd: int
    active_outbreak_alerts: int
    disease_trends: Dict[str, Any]
    resource_allocation: Dict[str, Any]
