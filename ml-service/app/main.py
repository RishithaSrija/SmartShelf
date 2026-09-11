from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.schemas import (
    PredictionRequest,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse
)
from app.model_service import model_service
from app.config import HOST, PORT

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smart-shelf-ml")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SmartShelf ML Service...")
    model_service.load_model()
    logger.info(f"Model loaded status: {model_service.is_loaded}")
    yield

app = FastAPI(
    title="SmartShelf ML Demand Forecasting Service",
    description="Machine learning microservice for retail product demand and footfall estimation.",
    version="1.0",
    lifespan=lifespan
)

# Enable CORS for local and backend microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Node.js backend and Admin diagnostics."""
    info = model_service.get_health_info()
    return HealthResponse(
        status=info["status"],
        modelLoaded=info["modelLoaded"],
        modelVersion=info["modelVersion"],
        modelType=info.get("modelType"),
        metrics=info.get("metrics")
    )

@app.post("/predict", response_model=PredictionResponse)
async def predict_demand(request: PredictionRequest):
    """Predict expected demand units for a given product and target date."""
    try:
        response = model_service.predict_single(request)
        return response
    except Exception as e:
        logger.error(f"Prediction failed for product {request.productId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_demand(request: BatchPredictionRequest):
    """Predict expected demand units for multiple products."""
    try:
        predictions = model_service.predict_batch(request.items)
        return BatchPredictionResponse(
            predictions=predictions,
            totalCount=len(predictions)
        )
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
