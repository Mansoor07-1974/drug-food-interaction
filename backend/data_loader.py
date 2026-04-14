"""
data_loader.py — loads and indexes the CSV datasets for fast lookup.

Dataset path resolution (works for both local dev and Docker):
  Local dev : backend/../datasets/  (relative, two levels up)
  Docker    : /datasets/            (volume mount)
"""

import os
import csv
import logging
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)


def _resolve_dataset_dir() -> Path:
    """Find the datasets folder whether running locally or in Docker."""
    # Docker: /datasets is mounted directly
    docker_path = Path("/datasets")
    if docker_path.exists():
        return docker_path
    # Local dev: project_root/datasets/
    local_path = Path(__file__).parent.parent / "datasets"
    return local_path


DATASET_DIR = _resolve_dataset_dir()
DRUG_CSV    = DATASET_DIR / "drug_interactions.csv"
FOOD_CSV    = DATASET_DIR / "food_constituents.csv"


class DataLoader:
    def __init__(self):
        self._drugs: dict[str, dict] = {}
        self._foods: dict[str, list] = defaultdict(list)
        # Map lowercase food key → original display name
        self._food_display: dict[str, str] = {}

    def load(self):
        self._load_drugs()
        self._load_foods()
        logger.info(f"Loaded {len(self._drugs)} drugs | {len(self._foods)} foods")

    # ── Drug Dataset ──────────────────────────────────────────────────────────
    def _load_drugs(self):
        if not DRUG_CSV.exists():
            logger.error(f"Drug dataset not found at {DRUG_CSV}")
            return
        with open(DRUG_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                key = row["drug_name"].strip().lower()
                if key not in self._drugs:
                    self._drugs[key] = {
                        "drug_name":    row["drug_name"].strip(),
                        "drug_smiles":  row["drug_smiles"].strip(),
                        "interactions": [],
                    }
                self._drugs[key]["interactions"].append({
                    "harmful_constituent": row["harmful_constituent"].strip(),
                    "constituent_smiles":  row["constituent_smiles"].strip(),
                    "interaction_effect":  row["interaction_effect"].strip(),
                    "severity":            row["severity"].strip(),
                    "label":               int(row["label"]),
                })
        logger.info(f"  Drug dataset: {len(self._drugs)} unique drugs")

    # ── Food Dataset ──────────────────────────────────────────────────────────
    def _load_foods(self):
        if not FOOD_CSV.exists():
            logger.error(f"Food dataset not found at {FOOD_CSV}")
            return
        with open(FOOD_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                display = row["food_name"].strip()
                key     = display.lower()
                self._foods[key].append({
                    "constituent_name":     row["constituent_name"].strip(),
                    "constituent_smiles":   row["constituent_smiles"].strip(),
                    "constituent_category": row["constituent_category"].strip(),
                    "description":          row["description"].strip(),
                })
                self._food_display[key] = display
        logger.info(f"  Food dataset: {len(self._foods)} unique foods")

    # ── Lookup ────────────────────────────────────────────────────────────────
    def get_drug(self, name: str) -> dict | None:
        return self._drugs.get(name.strip().lower())

    def get_food_constituents(self, name: str) -> list[dict]:
        return self._foods.get(name.strip().lower(), [])

    def list_drugs(self) -> list[str]:
        return sorted(v["drug_name"] for v in self._drugs.values())

    def list_foods(self) -> list[str]:
        # Pure in-memory — no disk access after initial load
        return sorted(self._food_display.values())
