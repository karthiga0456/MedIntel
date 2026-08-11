"""
Pydantic request/response models for the Outbreak Prediction Engine.
"""
from pydantic import BaseModel
from typing import List


class OutbreakPredictionRequest(BaseModel):
    region: str
    disease: str                 # e.g. "malaria", "dengue"
    recent_case_counts: List[float] = []   # time-series input for LSTM
    weather_features: dict = {}            # e.g. rainfall, temperature, humidity


class OutbreakPredictionResponse(BaseModel):
    region: str
    disease: str
    risk_level: str              # "low" | "moderate" | "high"
    predicted_cases_next_7_days: float
