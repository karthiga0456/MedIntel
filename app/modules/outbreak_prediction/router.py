"""
API routes for the Outbreak Prediction Engine module.
"""
from fastapi import APIRouter

from app.modules.outbreak_prediction.schemas import (
    OutbreakPredictionRequest,
    OutbreakPredictionResponse,
)
from app.modules.outbreak_prediction.service import outbreak_prediction_service

router = APIRouter()


@router.post("/predict", response_model=OutbreakPredictionResponse)
def predict_outbreak(request: OutbreakPredictionRequest):
    """Predict disease outbreak risk for a given region."""
    return outbreak_prediction_service.predict(request)


@router.get("/ping")
def ping():
    return {"module": "outbreak_prediction", "status": "ok"}
