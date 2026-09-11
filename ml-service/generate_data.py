import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

from app.config import DATA_DIR, TRAINING_DATA_PATH

def generate_synthetic_historical_data(days: int = 180) -> pd.DataFrame:
    """
    Generates realistic daily sales history for standard retail grocery categories
    to validate the ML pipeline in development before extensive production orders accumulate.
    """
    np.random.seed(42)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    date_range = pd.date_range(start=start_date, end=end_date, freq="D")

    sample_products = [
        {"productId": "prod_milk_01", "name": "Fresh Organic Whole Milk (1L)", "category": "DAIRY", "baseDemand": 35},
        {"productId": "prod_bread_01", "name": "Artisan Whole Wheat Bread", "category": "BAKERY", "baseDemand": 28},
        {"productId": "prod_croissant_01", "name": "Butter Croissants 4-Pack", "category": "BAKERY", "baseDemand": 20},
        {"productId": "prod_tomatoes_01", "name": "Organic Roma Tomatoes (1kg)", "category": "PRODUCE", "baseDemand": 30},
        {"productId": "prod_chicken_01", "name": "Fresh Chicken Breast (500g)", "category": "MEAT", "baseDemand": 22},
        {"productId": "prod_yogurt_01", "name": "Greek Style Yogurt (500g)", "category": "DAIRY", "baseDemand": 18},
        {"productId": "prod_rice_01", "name": "Basmati Rice (1kg)", "category": "PANTRY", "baseDemand": 25},
        {"productId": "prod_apples_01", "name": "Royal Gala Apples (1kg)", "category": "PRODUCE", "baseDemand": 24}
    ]

    sample_stores = ["store_freshmart_01", "store_bakerydelight_02"]

    rows = []

    for dt in date_range:
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0
        weekend_boost = 1.35 if is_weekend else 1.0

        for store in sample_stores:
            for prod in sample_products:
                # Base volume with day-of-week multiplier and random noise
                base = prod["baseDemand"]
                seasonal_factor = 1.0 + 0.1 * np.sin(dt.dayofyear / 365.25 * 2 * np.pi)
                noise = np.random.normal(0, 3)

                units_sold = int(max(0, round(base * weekend_boost * seasonal_factor + noise)))

                rows.append({
                    "date": dt.strftime("%Y-%m-%d"),
                    "storeId": store,
                    "productId": prod["productId"],
                    "productName": prod["name"],
                    "category": prod["category"],
                    "unitsSold": units_sold
                })

    df = pd.DataFrame(rows)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_DATA_PATH, index=False)
    print(f"[OK] Generated {len(df)} historical daily sales rows across {len(sample_products)} products -> {TRAINING_DATA_PATH}")
    return df

if __name__ == "__main__":
    generate_synthetic_historical_data()
