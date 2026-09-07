import os
import numpy as np
from typing import Dict, Any, List, Optional
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

        try:
            if os.path.exists(lstm_path):
                from tensorflow.keras.models import load_model
                self.lstm_model = load_model(lstm_path)
                logger.info("Loaded LSTM model.")
        except Exception as e:
            logger.warning(f"Could not load LSTM model: {e}")

        try:
            if os.path.exists(xgb_path):
                import xgboost as xgb
                self.xgboost_model = xgb.XGBClassifier()
                self.xgboost_model.load_model(xgb_path)
                logger.info("Loaded XGBoost model.")
        except Exception as e:
            logger.warning(f"Could not load XGBoost model: {e}")

    def _calculate_environmental_risk(self, disease: str, weather: Dict[str, Any]) -> float:
        """Calculate environmental risk score (0.0 - 1.0) based on disease vector biology."""
        temp = weather.get("temp", 28.0)
        humidity = weather.get("humidity", 70.0)
        disease_lower = disease.lower()

        if "dengue" in disease_lower or "malaria" in disease_lower:
            # Optimal mosquito breeding: 25-34C and humidity > 65%
            temp_factor = 1.0 if 25.0 <= temp <= 35.0 else max(0.2, 1.0 - abs(temp - 30.0) * 0.08)
            humidity_factor = min(1.0, max(0.2, (humidity - 40.0) / 50.0))
            return round(temp_factor * 0.6 + humidity_factor * 0.4, 2)

        elif "cholera" in disease_lower:
            # Waterborne risk elevated in flood/heat conditions
            temp_factor = min(1.0, max(0.3, temp / 35.0))
            rain_factor = min(1.0, max(0.3, weather.get("rainfall", 50.0) / 100.0))
            return round(temp_factor * 0.5 + rain_factor * 0.5, 2)

        return 0.5

    def predict(self, request: OutbreakPredictionRequest) -> OutbreakPredictionResponse:
        logger.info(f"Predicting outbreak risk for {request.disease} in {request.region}")

        recent = [float(x) for x in request.recent_case_counts] if request.recent_case_counts else [5.0, 7.0, 10.0]
        weather = request.weather_features or {"temp": 30.0, "humidity": 78.0, "rainfall": 25.0}
        env_index = self._calculate_environmental_risk(request.disease, weather)

        model_used = "Baseline Epidemiological Model"
        predicted_cases = 0.0
        risk_level = "low"
        risk_score = 25.0
        confidence = 0.80

        # Attempt LSTM inference
        lstm_success = False
        if self.lstm_model and len(recent) >= 3:
            try:
                seq = np.array(recent[-3:]).reshape(1, 3, 1)
                pred_val = float(self.lstm_model.predict(seq, verbose=0)[0][0])
                predicted_cases = max(0.0, pred_val)
                model_used = "LSTM Neural Network"
                lstm_success = True
                confidence = 0.88
            except Exception as e:
                logger.warning(f"LSTM prediction failed, falling back to baseline: {e}")

        # Baseline time-series projection if LSTM not used
        if not lstm_success:
            if len(recent) >= 2:
                recent_avg = (recent[-1] * 0.5) + (recent[-2] * 0.3) + (recent[-3] * 0.2 if len(recent) >= 3 else recent[0] * 0.2)
                growth_factor = (recent[-1] / max(1.0, recent[-2]))
                predicted_cases = round(recent_avg * 7 * (0.8 + env_index * 0.4), 1)
            else:
                predicted_cases = round(recent[-1] * 7 * (0.9 + env_index * 0.2), 1)

        # Attempt XGBoost inference
        xgb_success = False
        if self.xgboost_model:
            try:
                temp = weather.get("temp", 30.0)
                humidity = weather.get("humidity", 75.0)
                recent_sum = sum(recent)
                features = np.array([[temp, humidity, recent_sum]])
                class_idx = int(self.xgboost_model.predict(features)[0])
                mapping = {0: ("low", 25.0), 1: ("moderate", 55.0), 2: ("high", 85.0)}
                risk_level, risk_score = mapping.get(class_idx, ("moderate", 50.0))
                model_used = "LSTM + XGBoost" if lstm_success else "XGBoost Classifier"
                xgb_success = True
                confidence = 0.89
            except Exception as e:
                logger.warning(f"XGBoost classification failed: {e}")

        # Baseline risk scoring if XGBoost not used
        if not xgb_success:
            recent_rate = sum(recent[-3:]) if len(recent) >= 3 else sum(recent)
            composite_score = (recent_rate * 2.5) + (env_index * 40.0)
            risk_score = round(min(100.0, max(10.0, composite_score)), 1)
            if risk_score >= 75.0:
                risk_level = "high"
            elif risk_score >= 45.0:
                risk_level = "moderate"
            else:
                risk_level = "low"

        # Determine trend
        if len(recent) >= 2:
            if recent[-1] > recent[-2] * 1.15:
                trend = "rising"
            elif recent[-1] < recent[-2] * 0.85:
                trend = "falling"
            else:
                trend = "stable"
        else:
            trend = "stable"

        # Public health recommendations based on risk
        recommendations = []
        if risk_level in ["high", "severe"]:
            recommendations.append("Activate Rapid Response Team (RRT) for door-to-door larval surveys.")
            recommendations.append("Increase testing supply kits at Primary Health Centres (PHCs).")
            recommendations.append("Issue community boil-water and vector management advisory.")
        elif risk_level == "moderate":
            recommendations.append("Deploy fogging/insecticide spraying in clustered wards.")
            recommendations.append("Review fever clinic patient volume daily.")
        else:
            recommendations.append("Maintain routine disease surveillance and sanitary monitoring.")

        return OutbreakPredictionResponse(
            region=request.region,
            disease=request.disease,
            risk_level=risk_level,
            risk_score=risk_score,
            predicted_cases_next_7_days=max(0.0, round(predicted_cases, 1)),
            trend=trend,
            confidence=confidence,
            model_used=model_used,
            environmental_index=env_index,
            recommendations=recommendations,
        )


outbreak_prediction_service = OutbreakPredictionService()
