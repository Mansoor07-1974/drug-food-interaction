"""
data_loader.py — loads and indexes the CSV datasets for fast lookup.

Dataset path resolution (works for both local dev and Docker):
  Local dev : backend/../datasets/  (relative, two levels up)
  Docker    : /datasets/            (volume mount)
"""

"""
data_loader.py — optimized loader for large CSV datasets (1M+ rows supported)

Works for:
  Local dev : project_root/datasets/
  Docker    : /datasets/
"""

import csv
import logging
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)


def _resolve_dataset_dir() -> Path:
    docker_path = Path("/datasets")
    if docker_path.exists():
        return docker_path

    return Path(__file__).parent.parent / "datasets"


DATASET_DIR = _resolve_dataset_dir()
DRUG_CSV = DATASET_DIR / "S3.9292_drug_food_interactions.csv"
FOOD_CSV = DATASET_DIR / "food_constituents_cleaned.csv"


class DataLoader:
    def __init__(self):
        self._drugs: dict[str, dict] = {}

        # food_name -> list of constituents
        self._foods: dict[str, list] = defaultdict(list)

        # lower food -> display name
        self._food_display: dict[str, str] = {}

    # ==========================================================
    # PUBLIC LOAD
    # ==========================================================
    def load(self):
        self._load_drugs()
        self._load_foods()

        logger.info(
            f"Loaded {len(self._drugs)} drugs | {len(self._foods)} foods"
        )

    # ==========================================================
    # DRUG DATASET
    # ==========================================================
    def _load_drugs(self):
        if not DRUG_CSV.exists():
            logger.error(f"Drug dataset not found: {DRUG_CSV}")
            return

        with open(DRUG_CSV, newline="", encoding="latin-1") as f:
            reader = csv.DictReader(f)

            for row in reader:
                drug_name = row["drug_name"].strip()
                key = drug_name.lower()

                if key not in self._drugs:
                    self._drugs[key] = {
                        "drug_name": drug_name,
                        "drug_smiles": row["drug_smiles"].strip(),
                        "interactions": []
                    }

                self._drugs[key]["interactions"].append({
                    "harmful_constituent": row["harmful_constituent"].strip(),
                    "constituent_smiles": row["constituent_smiles"].strip(),
                    "interaction_effect": row["interaction_effect"].strip(),
                    "severity": row["severity"].strip(),
                    "label": int(row["label"]),
                })

        logger.info(f"Drug dataset loaded: {len(self._drugs)} unique drugs")

    # ==========================================================
    # FOOD DATASET (OPTIMIZED FOR HUGE FILES)
    # Expected columns:
    # food_name, constituent_name, constituent_smiles
    #
    # Optional:
    # constituent_category, description
    # ==========================================================
    def _load_foods(self):
        if not FOOD_CSV.exists():
            logger.error(f"Food dataset not found: {FOOD_CSV}")
            return

        total_rows = 0
        skipped = 0

        with open(FOOD_CSV, newline="", encoding="latin-1") as f:
            reader = csv.DictReader(f)

            for row in reader:
                total_rows += 1

                try:
                    food_name = row["food_name"].strip()
                    constituent = row["constituent_name"].strip()
                    smiles = row["constituent_smiles"].strip()

                    if not food_name or not constituent or not smiles:
                        skipped += 1
                        continue

                    key = food_name.lower()

                    self._foods[key].append({
                        "constituent_name": constituent,
                        "constituent_smiles": smiles,
                        "constituent_category": row.get(
                            "constituent_category", "FoodDB"
                        ).strip(),
                        "description": row.get(
                            "description",
                            f"{constituent} found in {food_name}"
                        ).strip()
                    })

                    self._food_display[key] = food_name

                except Exception:
                    skipped += 1
                    continue

                # Progress log every 100k rows
                if total_rows % 100000 == 0:
                    logger.info(f"Loaded {total_rows:,} food rows...")

        logger.info(
            f"Food dataset loaded: {len(self._foods)} foods | "
            f"{total_rows:,} rows | skipped {skipped:,}"
        )

    # ==========================================================
    # LOOKUPS
    # ==========================================================
    def get_drug(self, name: str) -> dict | None:
        return self._drugs.get(name.strip().lower())

    def get_food_constituents(self, name: str) -> list[dict]:
        return self._foods.get(name.strip().lower(), [])

    def list_drugs(self) -> list[str]:
        return sorted(v["drug_name"] for v in self._drugs.values())

    def list_foods(self) -> list[str]:
        return sorted(self._food_display.values())