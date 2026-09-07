from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class OutbreakPredictionRequest(BaseModel):
    region: str
    disease: str                 # e.g. "dengue", "malaria", "cholera", "covid", "typhoid"
    recent_case_counts: List[float] = []   # historical case count sequence
    weather_features: Dict[str, Any] = {}  # temp, humidity, rainfall
    population: Optional[int] = None


class OutbreakPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    region: str
    disease: str
    risk_level: str              # "low" | "moderate" | "high" | "severe"
    risk_score: float = 0.0      # 0 to 100
    predicted_cases_next_7_days: float
    trend: str = "stable"        # "rising" | "falling" | "stable"
    confidence: float = 0.85
    model_used: str = "LSTM + XGBoost"
    environmental_index: float = 0.0
    recommendations: List[str] = []
