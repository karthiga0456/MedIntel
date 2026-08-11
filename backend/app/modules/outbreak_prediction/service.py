"""
Business logic for the Outbreak Prediction Engine.

Intended pipeline (to be implemented):
  1. Aggregate weather data + symptom-query volume + historical case counts
     per region.
  2. LSTM model for time-series case forecasting.
  3. XGBoost model for classifying outbreak risk level from tabular features.
  4. Expose results to the Health Worker Portal / government dashboard.
"""
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import xgboost as xgb
import os

from app.core.logging import get_logger
from app.modules.outbreak_prediction.schemas import (
    OutbreakPredictionRequest,
    OutbreakPredictionResponse,
)

logger = get_logger(__name__)

class OutbreakPredictionService:
    def __init__(self):
        self.lstm_model = None
        self.xgboost_model = None
        self._load_models()

    def _load_models(self):
        lstm_path = "./data/models/outbreak_lstm.keras"
        xgb_path = "./data/models/outbreak_xgb.json"
        
        if os.path.exists(lstm_path):
            self.lstm_model = load_model(lstm_path)
            logger.info("Loaded LSTM model.")
        else:
            logger.warning(f"LSTM model not found at {lstm_path}")
            
        if os.path.exists(xgb_path):
            self.xgboost_model = xgb.XGBClassifier()
            self.xgboost_model.load_model(xgb_path)
            logger.info("Loaded XGBoost model.")
        else:
            logger.warning(f"XGBoost model not found at {xgb_path}")

    def predict(self, request: OutbreakPredictionRequest) -> OutbreakPredictionResponse:
        logger.info(f"Predicting outbreak risk for {request.disease} in {request.region}")
        
        predicted_cases = 0.0
        risk_level = "unknown"
        
        # 1. Predict next 7 days cases using LSTM
        if self.lstm_model:
            recent = request.recent_case_counts
            if len(recent) >= 3:
                seq = np.array(recent[-3:]).reshape(1, 3, 1)
                predicted_cases = float(self.lstm_model.predict(seq, verbose=0)[0][0])
            else:
                logger.warning("Not enough recent case data to run LSTM prediction. Need 3 time steps.")
                
        # 2. Predict risk level using XGBoost
        if self.xgboost_model:
            temp = request.weather_features.get("temp", 30)
            humidity = request.weather_features.get("humidity", 75)
            recent_sum = sum(request.recent_case_counts)
            
            features = np.array([[temp, humidity, recent_sum]])
            class_idx = int(self.xgboost_model.predict(features)[0])
            
            mapping = {0: "low", 1: "moderate", 2: "high"}
            risk_level = mapping.get(class_idx, "unknown")
            
        return OutbreakPredictionResponse(
            region=request.region,
            disease=request.disease,
            risk_level=risk_level,
            predicted_cases_next_7_days=max(0.0, round(predicted_cases, 1)),
        )

outbreak_prediction_service = OutbreakPredictionService()
