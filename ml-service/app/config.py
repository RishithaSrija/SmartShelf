import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
MODEL_PATH = Path(os.getenv("MODEL_PATH", MODEL_DIR / "demand_model.joblib"))
METADATA_PATH = Path(os.getenv("METADATA_PATH", MODEL_DIR / "model_metadata.json"))

DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
TRAINING_DATA_PATH = Path(os.getenv("TRAINING_DATA_PATH", DATA_DIR / "historical_sales.csv"))

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0")

# Ensure required directories exist
MODEL_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
