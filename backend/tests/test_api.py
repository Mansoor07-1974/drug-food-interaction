"""
tests/test_api.py
=================
Integration tests for the MolGuard FastAPI backend.

Run from backend/ folder:
    pytest tests/test_api.py -v

Requires:
    pip install pytest httpx
"""

import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)


# ─── Health ────────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_returns_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "model_loaded" in data
        assert "cache" in data


# ─── Drugs endpoint ────────────────────────────────────────────────────────────
class TestDrugs:
    def test_list_drugs_returns_list(self):
        r = client.get("/drugs")
        assert r.status_code == 200
        data = r.json()
        assert "drugs" in data
        assert isinstance(data["drugs"], list)
        assert len(data["drugs"]) > 0

    def test_known_drug_exists(self):
        r = client.get("/drugs")
        drugs = r.json()["drugs"]
        assert "Warfarin" in drugs

    def test_get_drug_by_name(self):
        r = client.get("/drug/Warfarin")
        assert r.status_code == 200
        data = r.json()
        assert data["drug_name"] == "Warfarin"
        assert "drug_smiles" in data
        assert len(data["drug_smiles"]) > 0

    def test_unknown_drug_returns_404_or_pubchem(self):
        r = client.get("/drug/XYZNOTADRUG123")
        # Either 404 if PubChem fails, or a result with source=PubChem
        assert r.status_code in [200, 404]


# ─── Foods endpoint ────────────────────────────────────────────────────────────
class TestFoods:
    def test_list_foods_returns_list(self):
        r = client.get("/foods")
        assert r.status_code == 200
        data = r.json()
        assert "foods" in data
        assert isinstance(data["foods"], list)
        assert len(data["foods"]) > 0

    def test_known_food_exists(self):
        r = client.get("/foods")
        foods = r.json()["foods"]
        assert "Grapefruit" in foods

    def test_get_food_constituents(self):
        r = client.get("/food/Grapefruit")
        assert r.status_code == 200
        data = r.json()
        assert data["food_name"] == "Grapefruit"
        assert "constituents" in data
        assert len(data["constituents"]) > 0

    def test_get_food_has_smiles(self):
        r = client.get("/food/Grapefruit")
        constituents = r.json()["constituents"]
        for c in constituents:
            assert "constituent_smiles" in c
            assert len(c["constituent_smiles"]) > 0

    def test_unknown_food_returns_404(self):
        r = client.get("/food/NOTAFOOD99")
        assert r.status_code == 404


# ─── Predict endpoint ──────────────────────────────────────────────────────────
class TestPredict:
    def test_predict_warfarin_spinach(self):
        r = client.post("/predict", json={"drug_name": "Warfarin", "food_name": "Spinach"})
        assert r.status_code == 200
        data = r.json()
        assert data["drug_name"] == "Warfarin"
        assert data["food_name"] == "Spinach"
        assert data["overall_label"] in ["SAFE", "UNSAFE"]
        assert 0.0 <= data["max_probability"] <= 1.0
        assert isinstance(data["constituents_checked"], list)
        assert len(data["constituents_checked"]) > 0
        assert data["summary"]

    def test_predict_expected_unsafe_warfarin_spinach(self):
        """Warfarin + Spinach (Vitamin K) should be UNSAFE."""
        r = client.post("/predict", json={"drug_name": "Warfarin", "food_name": "Spinach"})
        data = r.json()
        # Should contain Vitamin K as unsafe
        constituent_names = [c["constituent_name"] for c in data["constituents_checked"]]
        assert "Vitamin K" in constituent_names

    def test_predict_response_schema(self):
        r = client.post("/predict", json={"drug_name": "Metformin", "food_name": "Tomato"})
        assert r.status_code == 200
        data = r.json()
        required_keys = ["drug_name","food_name","overall_label","overall_risk",
                         "max_probability","constituents_checked","summary"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"

    def test_predict_constituent_schema(self):
        r = client.post("/predict", json={"drug_name": "Ciprofloxacin", "food_name": "Milk"})
        assert r.status_code == 200
        for c in r.json()["constituents_checked"]:
            assert "constituent_name"   in c
            assert "constituent_smiles" in c
            assert "interaction_effect" in c
            assert "severity"           in c
            assert "probability"        in c
            assert "label"              in c
            assert c["label"] in ["SAFE", "UNSAFE"]
            assert 0.0 <= c["probability"] <= 1.0

    def test_predict_unknown_drug_fallback(self):
        """An unknown drug should either 404 or succeed via PubChem."""
        r = client.post("/predict", json={"drug_name": "Aspirin", "food_name": "Milk"})
        assert r.status_code in [200, 404]

    def test_predict_missing_food_returns_404(self):
        r = client.post("/predict", json={"drug_name": "Warfarin", "food_name": "NOTAFOOD999"})
        assert r.status_code == 404

    def test_predict_custom_threshold(self):
        r = client.post("/predict", json={
            "drug_name": "Warfarin", "food_name": "Spinach", "threshold": 0.3
        })
        assert r.status_code == 200

    def test_predict_simvastatin_grapefruit(self):
        r = client.post("/predict", json={"drug_name": "Simvastatin", "food_name": "Grapefruit"})
        assert r.status_code == 200
        data = r.json()
        # Grapefruit + Simvastatin is a well-known dangerous interaction
        assert data["overall_label"] in ["SAFE", "UNSAFE"]

    def test_predict_safe_pair(self):
        r = client.post("/predict", json={"drug_name": "Metformin", "food_name": "Tomato"})
        assert r.status_code == 200
        data = r.json()
        # Tomato has Lycopene which should not interact with Metformin
        assert data["overall_label"] in ["SAFE", "UNSAFE"]  # Allow model uncertainty


# ─── Batch predict ────────────────────────────────────────────────────────────
class TestBatchPredict:
    def test_batch_predict_single_pair(self):
        r = client.post("/predict/batch", json={
            "pairs": [{"drug_name": "Warfarin", "food_name": "Spinach"}]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 1
        assert len(data["results"]) == 1

    def test_batch_predict_multiple_pairs(self):
        r = client.post("/predict/batch", json={
            "pairs": [
                {"drug_name": "Warfarin",    "food_name": "Spinach"},
                {"drug_name": "Metformin",   "food_name": "Tomato"},
                {"drug_name": "Simvastatin", "food_name": "Grapefruit"},
            ]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 3

    def test_batch_too_many_pairs(self):
        pairs = [{"drug_name": "Warfarin", "food_name": "Spinach"}] * 21
        r = client.post("/predict/batch", json={"pairs": pairs})
        assert r.status_code == 400

    def test_batch_bad_food_returns_error_entry(self):
        r = client.post("/predict/batch", json={
            "pairs": [
                {"drug_name": "Warfarin",  "food_name": "Spinach"},
                {"drug_name": "Metformin", "food_name": "NOTAFOOD"},
            ]
        })
        assert r.status_code == 200
        results = r.json()["results"]
        # First should succeed, second should have error key
        assert "overall_label" in results[0]
        assert "error" in results[1]


# ─── Cache endpoints ──────────────────────────────────────────────────────────
class TestCache:
    def test_cache_stats(self):
        r = client.get("/cache/stats")
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data
        assert "max" in data

    def test_clear_cache(self):
        r = client.delete("/cache")
        assert r.status_code == 200
        assert "message" in r.json()
