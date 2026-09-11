import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
import numpy as np

from app.config import MODEL_PATH, METADATA_PATH, MODEL_VERSION
from app.feature_engineering import FEATURE_COLUMNS, build_feature_vector
from app.schemas import PredictionRequest, PredictionResponse

logger = logging.getLogger("smart-shelf-ml")

class ModelService:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.is_loaded = False
        self.load_model()

    def load_model(self) -> bool:
        """Load trained scikit-learn model and associated metadata from disk."""
        if MODEL_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                self.is_loaded = True
                logger.info(f"Successfully loaded demand model from {MODEL_PATH}")
            except Exception as e:
                logger.error(f"Failed to load model from {MODEL_PATH}: {str(e)}")
                self.model = None
                self.is_loaded = False
        else:
            logger.warning(f"No trained model artifact found at {MODEL_PATH}")
            self.model = None
            self.is_loaded = False

        if METADATA_PATH.exists():
            try:
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load model metadata: {str(e)}")
                self.metadata = {}
        else:
            self.metadata = {
                "modelVersion": MODEL_VERSION,
                "modelType": "RandomForestRegressor",
                "status": "Not trained yet"
            }

        return self.is_loaded

    def predict_single(self, request: PredictionRequest) -> PredictionResponse:
        """Execute single product demand prediction."""
        # 1. Build feature vector
        features_dict = build_feature_vector(
            date_str=request.date,
            product_category=request.productCategory,
            lag_1=request.lag_1,
            lag_7=request.lag_7,
            rolling_mean_7=request.rollingMean_7,
            rolling_mean_14=request.rollingMean_14,
            historical_sales=request.historicalDailySales
        )

        # 2. Arrange features into ordered DataFrame matching training schema
        df_features = pd.DataFrame([features_dict])[FEATURE_COLUMNS]

        # 3. Model inference (or fallback to rolling average if model not trained yet)
        if self.is_loaded and self.model is not None:
            raw_pred = self.model.predict(df_features)[0]
        else:
            # Safe heuristic baseline fallback (e.g. 7-day rolling mean)
            raw_pred = features_dict.get("rollingMean_7", 10.0)

        # 4. Enforce non-negative constraint
        clean_pred = max(0.0, float(raw_pred))
        rounded_pred = int(round(clean_pred))

        version = self.metadata.get("modelVersion", MODEL_VERSION)

        return PredictionResponse(
            prediction=round(clean_pred, 2),
            roundedPrediction=rounded_pred,
            modelVersion=version,
            date=request.date,
            productId=request.productId,
            storeId=request.storeId,
            featureValues=features_dict
        )

    def predict_batch(self, items: List[PredictionRequest]) -> List[PredictionResponse]:
        """Execute batch predictions efficiently."""
        return [self.predict_single(item) for item in items]

    def get_health_info(self) -> Dict[str, Any]:
        """Retrieve diagnostic health and performance metrics."""
        return {
            "status": "healthy",
            "modelLoaded": self.is_loaded,
            "modelVersion": self.metadata.get("modelVersion", MODEL_VERSION),
            "modelType": self.metadata.get("modelType", "RandomForestRegressor"),
            "metrics": self.metadata.get("metrics", None),
            "trainedAt": self.metadata.get("trainedAt", None),
            "trainingRows": self.metadata.get("trainingRows", None)
        }

# Global singleton instance
model_service = ModelService()
