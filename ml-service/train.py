import json
import logging
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.config import (
    TRAINING_DATA_PATH,
    MODEL_PATH,
    METADATA_PATH,
    MODEL_DIR,
    MODEL_VERSION
)
from app.feature_engineering import FEATURE_COLUMNS, prepare_dataframe_features
from generate_data import generate_synthetic_historical_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train")

def run_training_pipeline():
    logger.info("=========================================================")
    logger.info("--- Starting SmartShelf Demand Model Training Pipeline ---")
    logger.info("=========================================================")

    # 1. Load or generate training dataset
    if not TRAINING_DATA_PATH.exists():
        logger.info("No existing dataset found. Generating realistic historical baseline dataset...")
        df_raw = generate_synthetic_historical_data(days=180)
    else:
        df_raw = pd.read_csv(TRAINING_DATA_PATH)
        logger.info(f"Loaded {len(df_raw)} records from {TRAINING_DATA_PATH}")

    # 2. Prepare feature vectors
    logger.info("Generating temporal, category, lag, and rolling mean features...")
    df_featured = prepare_dataframe_features(df_raw)

    # 3. Chronological Time-Series Split (80% Train, 20% Test)
    # Sort strictly by date so no future lookahead leakage occurs
    df_sorted = df_featured.sort_values("date").reset_index(drop=True)

    split_idx = int(len(df_sorted) * 0.8)
    train_df = df_sorted.iloc[:split_idx]
    test_df = df_sorted.iloc[split_idx:]

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["unitsSold"]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["unitsSold"]

    logger.info(f"Chronological split complete: {len(X_train)} training rows, {len(X_test)} test rows.")

    # 4. Train Baseline Model (DummyRegressor - Mean)
    logger.info("Training baseline model (DummyRegressor - mean strategy)...")
    baseline = DummyRegressor(strategy="mean")
    baseline.fit(X_train, y_train)
    baseline_preds = baseline.predict(X_test)

    baseline_mae = mean_absolute_error(y_test, baseline_preds)
    baseline_rmse = np.sqrt(mean_squared_error(y_test, baseline_preds))
    baseline_r2 = r2_score(y_test, baseline_preds)

    logger.info(f"Baseline -> MAE: {baseline_mae:.2f}, RMSE: {baseline_rmse:.2f}, R2: {baseline_r2:.4f}")

    # 5. Train Random Forest Regressor
    logger.info("Training candidate model (RandomForestRegressor)...")
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_preds = np.maximum(0, rf_model.predict(X_test))

    rf_mae = mean_absolute_error(y_test, rf_preds)
    rf_rmse = np.sqrt(mean_squared_error(y_test, rf_preds))
    rf_r2 = r2_score(y_test, rf_preds)

    logger.info(f"Random Forest -> MAE: {rf_mae:.2f}, RMSE: {rf_rmse:.2f}, R2: {rf_r2:.4f}")

    mae_improvement = ((baseline_mae - rf_mae) / baseline_mae) * 100
    logger.info(f"[OK] Random Forest improved MAE over baseline by {mae_improvement:.1f}%")

    # 6. Save Model Artifact
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf_model, MODEL_PATH)
    logger.info(f"[OK] Model artifact saved -> {MODEL_PATH}")

    # 7. Save Model Metadata
    metadata = {
        "modelVersion": MODEL_VERSION,
        "modelType": "RandomForestRegressor",
        "trainedAt": datetime.now().isoformat(),
        "trainingRows": int(len(X_train)),
        "testRows": int(len(X_test)),
        "featureNames": FEATURE_COLUMNS,
        "metrics": {
            "mae": round(float(rf_mae), 2),
            "rmse": round(float(rf_rmse), 2),
            "r2": round(float(rf_r2), 4),
            "baseline_mae": round(float(baseline_mae), 2),
            "baseline_rmse": round(float(baseline_rmse), 2),
            "baseline_r2": round(float(baseline_r2), 4),
            "mae_improvement_pct": round(float(mae_improvement), 1)
        }
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"[OK] Metadata saved -> {METADATA_PATH}")
    logger.info("=========================================================")
    logger.info("Training pipeline completed successfully!")
    logger.info("=========================================================")

    return metadata

if __name__ == "__main__":
    run_training_pipeline()
