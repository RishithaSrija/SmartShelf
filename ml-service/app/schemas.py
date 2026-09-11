from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PredictionRequest(BaseModel):
    storeId: str = Field(..., description="Unique Store ID")
    productId: str = Field(..., description="Unique Product ID")
    productCategory: Optional[str] = Field("OTHER", description="Product category (e.g. DAIRY, BAKERY)")
    date: str = Field(..., description="Prediction target date in YYYY-MM-DD format")
    lag_1: Optional[float] = Field(None, description="Units sold 1 day prior")
    lag_7: Optional[float] = Field(None, description="Units sold 7 days prior")
    rollingMean_7: Optional[float] = Field(None, description="7-day rolling average units sold")
    rollingMean_14: Optional[float] = Field(None, description="14-day rolling average units sold")
    historicalDailySales: Optional[List[Dict[str, Any]]] = Field(
        None, description="Recent daily sales list [{'date': 'YYYY-MM-DD', 'unitsSold': 20}]"
    )

class PredictionResponse(BaseModel):
    prediction: float = Field(..., description="Predicted demand units (non-negative float)")
    roundedPrediction: int = Field(..., description="Integer rounded expected units")
    modelVersion: str = Field(..., description="Model version string (e.g. 1.0)")
    date: str = Field(..., description="Target prediction date")
    productId: str = Field(..., description="Product ID")
    storeId: str = Field(..., description="Store ID")
    featureValues: Optional[Dict[str, Any]] = Field(None, description="Extracted feature inputs")

class BatchPredictionRequest(BaseModel):
    items: List[PredictionRequest] = Field(..., description="List of prediction items")

class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse] = Field(..., description="List of item predictions")
    totalCount: int = Field(..., description="Total batch count processed")

class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Service health state")
    modelLoaded: bool = Field(..., description="Whether trained regression model is loaded")
    modelVersion: str = Field(..., description="Current model version")
    modelType: Optional[str] = Field(None, description="Model algorithm name (e.g. RandomForestRegressor)")
    metrics: Optional[Dict[str, Any]] = Field(None, description="Model evaluation performance metrics (MAE, RMSE, R2)")
