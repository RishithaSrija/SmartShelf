import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.model_service import model_service
from app.feature_engineering import encode_category, extract_temporal_features, build_feature_vector
from datetime import datetime

class TestMLService(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        model_service.load_model()

    def test_01_feature_generation(self):
        dt = datetime(2026, 8, 25) # Tuesday
        temp = extract_temporal_features(dt)
        self.assertEqual(temp["dayOfWeek"], 1) # Tuesday
        self.assertEqual(temp["isWeekend"], 0)
        self.assertEqual(temp["month"], 8)

        cat_encoded = encode_category("DAIRY")
        self.assertEqual(cat_encoded, 0)

        cat_other = encode_category("UNKNOWN_CATEGORY")
        self.assertEqual(cat_other, 8) # OTHER

    def test_02_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["modelLoaded"])
        self.assertEqual(data["modelVersion"], "1.0")

    def test_03_predict_single_endpoint(self):
        payload = {
            "storeId": "store_freshmart_01",
            "productId": "prod_milk_01",
            "productCategory": "DAIRY",
            "date": "2026-08-26",
            "lag_1": 32.0,
            "lag_7": 30.0,
            "rollingMean_7": 31.5,
            "rollingMean_14": 30.2
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("prediction", data)
        self.assertIn("roundedPrediction", data)
        self.assertGreaterEqual(data["prediction"], 0.0)
        self.assertEqual(data["productId"], "prod_milk_01")
        self.assertEqual(data["modelVersion"], "1.0")

    def test_04_predict_single_with_history(self):
        payload = {
            "storeId": "store_freshmart_01",
            "productId": "prod_bread_01",
            "productCategory": "BAKERY",
            "date": "2026-08-26",
            "historicalDailySales": [
                {"date": "2026-08-24", "unitsSold": 24},
                {"date": "2026-08-25", "unitsSold": 28}
            ]
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["prediction"], 0.0)

    def test_05_predict_batch_endpoint(self):
        payload = {
            "items": [
                {
                    "storeId": "store_freshmart_01",
                    "productId": "prod_milk_01",
                    "productCategory": "DAIRY",
                    "date": "2026-08-26",
                    "lag_1": 30.0,
                    "lag_7": 28.0,
                    "rollingMean_7": 29.0,
                    "rollingMean_14": 29.0
                },
                {
                    "storeId": "store_freshmart_01",
                    "productId": "prod_bread_01",
                    "productCategory": "BAKERY",
                    "date": "2026-08-26",
                    "lag_1": 25.0,
                    "lag_7": 22.0,
                    "rollingMean_7": 24.0,
                    "rollingMean_14": 23.5
                }
            ]
        }
        response = self.client.post("/predict/batch", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["totalCount"], 2)
        self.assertEqual(len(data["predictions"]), 2)
        self.assertGreaterEqual(data["predictions"][0]["prediction"], 0.0)
        self.assertGreaterEqual(data["predictions"][1]["prediction"], 0.0)

    def test_06_non_negative_enforcement(self):
        # Even if extreme negative lag input is passed, prediction must be non-negative
        payload = {
            "storeId": "store_freshmart_01",
            "productId": "prod_milk_01",
            "productCategory": "DAIRY",
            "date": "2026-08-26",
            "lag_1": 0.0,
            "lag_7": 0.0,
            "rollingMean_7": 0.0,
            "rollingMean_14": 0.0
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["prediction"], 0.0)

    def test_07_invalid_payload_validation(self):
        # Missing required field 'date'
        payload = {
            "storeId": "store_freshmart_01",
            "productId": "prod_milk_01"
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422) # Unprocessable Entity

if __name__ == "__main__":
    unittest.main()
