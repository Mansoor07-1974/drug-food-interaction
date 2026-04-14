"""
stats.py — Dataset + model stats for the /stats API endpoint.
All return values are JSON-serializable (ints, floats, strings, dicts).
Works in both local dev and Docker (same path resolution as data_loader.py).
"""

import csv
import json
from pathlib import Path


def _resolve_dataset_dir() -> Path:
    docker_path = Path("/datasets")
    if docker_path.exists():
        return docker_path
    return Path(__file__).parent.parent / "datasets"


DATASET_DIR  = _resolve_dataset_dir()
DRUG_CSV     = DATASET_DIR / "drug_interactions.csv"
FOOD_CSV     = DATASET_DIR / "food_constituents.csv"
MODEL_CONFIG = Path(__file__).parent / "model_artifacts" / "model_config.json"


def get_dataset_stats() -> dict:
    """Returns JSON-serializable dataset counts and breakdowns."""

    di: dict = {
        "total_rows":          0,
        "unique_drugs":        0,
        "unique_constituents": 0,
        "label_1_unsafe":      0,
        "label_0_safe":        0,
        "severity_counts":     {},
    }

    fc: dict = {
        "total_rows":          0,
        "unique_foods":        0,
        "unique_constituents": 0,
        "category_counts":     {},
    }

    # ── Drug interactions ─────────────────────────────────────────────────────
    if DRUG_CSV.exists():
        drugs_seen, const_seen = set(), set()
        with open(DRUG_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                di["total_rows"] += 1
                drugs_seen.add(row["drug_name"])
                const_seen.add(row["harmful_constituent"])
                if int(row.get("label", 0)) == 1:
                    di["label_1_unsafe"] += 1
                else:
                    di["label_0_safe"]   += 1
                sev = row.get("severity", "Unknown")
                di["severity_counts"][sev] = di["severity_counts"].get(sev, 0) + 1
        # Convert sets → ints (JSON-safe)
        di["unique_drugs"]        = int(len(drugs_seen))
        di["unique_constituents"] = int(len(const_seen))

    # ── Food constituents ─────────────────────────────────────────────────────
    if FOOD_CSV.exists():
        foods_seen, const_seen = set(), set()
        with open(FOOD_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                fc["total_rows"] += 1
                foods_seen.add(row["food_name"])
                const_seen.add(row["constituent_name"])
                cat = row.get("constituent_category", "Other")
                fc["category_counts"][cat] = fc["category_counts"].get(cat, 0) + 1
        # Convert sets → ints
        fc["unique_foods"]        = int(len(foods_seen))
        fc["unique_constituents"] = int(len(const_seen))

    return {"drug_interactions": di, "food_constituents": fc}


def get_model_stats() -> dict:
    """Returns model training metrics as JSON-safe primitives."""
    if not MODEL_CONFIG.exists():
        return {
            "status":  "not_trained",
            "message": (
                "Model not found. Train in Google Colab and place "
                "full_checkpoint.pt + model_config.json in backend/model_artifacts/"
            ),
        }
    try:
        with open(MODEL_CONFIG) as f:
            cfg = json.load(f)
        return {
            "status":        "loaded",
            "model_type":    str(cfg.get("model_type",    "D-MPNN")),
            "hidden_dim":    int(cfg.get("hidden_dim",    300)),
            "n_layers":      int(cfg.get("n_layers",      3)),
            "dropout":       float(cfg.get("dropout",     0.2)),
            "threshold":     float(cfg.get("threshold",   0.5)),
            "best_epoch":    int(cfg.get("best_epoch",    0)),
            "best_val_auc":  float(cfg.get("best_val_auc",  0.0)),
            "test_auc":      float(cfg.get("test_auc",      0.0)),
            "test_accuracy": float(cfg.get("test_accuracy", 0.0)),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
