import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional

# Supported canonical categories
CATEGORIES = [
    "DAIRY",
    "BAKERY",
    "MEAT",
    "SEAFOOD",
    "PRODUCE",
    "PANTRY",
    "BEVERAGES",
    "SNACKS",
    "OTHER"
]

CATEGORY_MAP = {cat: idx for idx, cat in enumerate(CATEGORIES)}

FEATURE_COLUMNS = [
    "dayOfWeek",
    "dayOfMonth",
    "month",
    "isWeekend",
    "categoryEncoded",
    "lag_1",
    "lag_7",
    "rollingMean_7",
    "rollingMean_14"
]

def encode_category(category_name: Optional[str]) -> int:
    """Encode product category string into an integer index."""
    if not category_name:
        return CATEGORY_MAP["OTHER"]
    norm = str(category_name).strip().upper()
    return CATEGORY_MAP.get(norm, CATEGORY_MAP["OTHER"])

def extract_temporal_features(target_date: datetime) -> Dict[str, int]:
    """Extract day of week, day of month, month, and weekend flag from target date."""
    day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
    return {
        "dayOfWeek": day_of_week,
        "dayOfMonth": target_date.day,
        "month": target_date.month,
        "isWeekend": 1 if day_of_week in (5, 6) else 0
    }

def calculate_lags_from_history(
    target_date: datetime,
    historical_sales: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Given a list of {'date': 'YYYY-MM-DD', 'unitsSold': float},
    extracts lag_1, lag_7, rollingMean_7, rollingMean_14 strictly
    prior to target_date without lookahead leakage.
    """
    if not historical_sales:
        return {
            "lag_1": 0.0,
            "lag_7": 0.0,
            "rollingMean_7": 0.0,
            "rollingMean_14": 0.0
        }

    # Convert to DataFrame and sort by date ascending
    df = pd.DataFrame(historical_sales)
    df["date"] = pd.to_datetime(df["date"])
    df["unitsSold"] = pd.to_numeric(df["unitsSold"], errors="coerce").fillna(0.0)

    # Filter to only strictly prior observations
    df = df[df["date"] < target_date].sort_values("date")

    if len(df) == 0:
        return {
            "lag_1": 0.0,
            "lag_7": 0.0,
            "rollingMean_7": 0.0,
            "rollingMean_14": 0.0
        }

    recent_values = df["unitsSold"].values

    lag_1 = float(recent_values[-1]) if len(recent_values) >= 1 else 0.0
    lag_7 = float(recent_values[-7]) if len(recent_values) >= 7 else lag_1

    rolling_7 = float(np.mean(recent_values[-7:])) if len(recent_values) >= 1 else 0.0
    rolling_14 = float(np.mean(recent_values[-14:])) if len(recent_values) >= 1 else rolling_7

    return {
        "lag_1": lag_1,
        "lag_7": lag_7,
        "rollingMean_7": rolling_7,
        "rollingMean_14": rolling_14
    }

def build_feature_vector(
    date_str: str,
    product_category: Optional[str] = None,
    lag_1: Optional[float] = None,
    lag_7: Optional[float] = None,
    rolling_mean_7: Optional[float] = None,
    rolling_mean_14: Optional[float] = None,
    historical_sales: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Constructs the exact feature dictionary for model inference.
    """
    target_dt = pd.to_datetime(date_str)
    features = extract_temporal_features(target_dt)
    features["categoryEncoded"] = encode_category(product_category)

    # If direct lag values provided, use them; otherwise derive from historical sales
    if lag_1 is not None and lag_7 is not None and rolling_mean_7 is not None and rolling_mean_14 is not None:
        features["lag_1"] = float(lag_1)
        features["lag_7"] = float(lag_7)
        features["rollingMean_7"] = float(rolling_mean_7)
        features["rollingMean_14"] = float(rolling_mean_14)
    elif historical_sales:
        lags = calculate_lags_from_history(target_dt, historical_sales)
        features.update(lags)
    else:
        features["lag_1"] = float(lag_1 or 0.0)
        features["lag_7"] = float(lag_7 or 0.0)
        features["rollingMean_7"] = float(rolling_mean_7 or 0.0)
        features["rollingMean_14"] = float(rolling_mean_14 or 0.0)

    return features

def prepare_dataframe_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepares features for training DataFrame.
    Expected input columns: ['date', 'productId', 'storeId', 'category', 'unitsSold']
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["productId", "date"]).reset_index(drop=True)

    df["dayOfWeek"] = df["date"].dt.dayofweek
    df["dayOfMonth"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["isWeekend"] = df["dayOfWeek"].isin([5, 6]).astype(int)
    df["categoryEncoded"] = df["category"].apply(encode_category)

    # Calculate lag and rolling statistics grouped by product
    df["lag_1"] = df.groupby("productId")["unitsSold"].shift(1)
    df["lag_7"] = df.groupby("productId")["unitsSold"].shift(7)
    df["rollingMean_7"] = df.groupby("productId")["unitsSold"].transform(
        lambda x: x.shift(1).rolling(7, min_periods=1).mean()
    )
    df["rollingMean_14"] = df.groupby("productId")["unitsSold"].transform(
        lambda x: x.shift(1).rolling(14, min_periods=1).mean()
    )

    # Fill NaN values for initial history rows safely
    df["lag_1"] = df["lag_1"].fillna(df["unitsSold"])
    df["lag_7"] = df["lag_7"].fillna(df["lag_1"])
    df["rollingMean_7"] = df["rollingMean_7"].fillna(df["unitsSold"])
    df["rollingMean_14"] = df["rollingMean_14"].fillna(df["rollingMean_7"])

    return df
