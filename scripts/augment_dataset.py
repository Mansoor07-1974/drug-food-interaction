"""
scripts/augment_dataset.py
==========================
Automatically expands the drug_interactions.csv dataset by:
  1. Fetching SMILES for new drugs from PubChem
  2. Cross-joining with all food constituents
  3. Auto-labelling using known interaction rules (CYP inhibitors, chelators, etc.)
  4. Appending to the existing dataset

Run from project root:
    python scripts/augment_dataset.py
"""

import csv
import time
import random
import requests
import pandas as pd
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent
DRUG_CSV     = ROOT / "datasets" / "drug_interactions.csv"
FOOD_CSV     = ROOT / "datasets" / "food_constituents.csv"
OUTPUT_CSV   = ROOT / "datasets" / "drug_interactions_augmented.csv"
PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

# ── New drugs to add (name → known interaction profile) ──────────────────────
NEW_DRUGS = {
    "Amlodipine": {
        "harmful": ["Furanocoumarins", "Ethanol"],
        "safe":    ["Lycopene", "Tryptophan", "Vitamin C"],
        "effects": {
            "Furanocoumarins": ("CYP3A4 inhibition increases Amlodipine blood levels causing hypotension", "High"),
            "Ethanol":         ("Ethanol potentiates hypotensive effect of Amlodipine", "Moderate"),
        }
    },
    "Clopidogrel": {
        "harmful": ["Furanocoumarins", "Caffeine"],
        "safe":    ["Calcium", "Lycopene", "Vitamin C"],
        "effects": {
            "Furanocoumarins": ("CYP3A4 inhibition reduces Clopidogrel activation", "High"),
            "Caffeine":        ("CYP1A2 competition may reduce Clopidogrel efficacy", "Moderate"),
        }
    },
    "Fluoxetine": {
        "harmful": ["Tryptophan", "Tyramine", "Ethanol"],
        "safe":    ["Lycopene", "Calcium", "Vitamin C"],
        "effects": {
            "Tryptophan": ("Serotonin syndrome risk when combined with SSRIs", "High"),
            "Tyramine":   ("Mild pressor effect; less dangerous than MAOIs but monitor", "Low"),
            "Ethanol":    ("CNS depression; impairs motor function and increases sedation", "Moderate"),
        }
    },
    "Metoprolol": {
        "harmful": ["Caffeine", "Furanocoumarins"],
        "safe":    ["Lycopene", "Vitamin K", "Calcium"],
        "effects": {
            "Caffeine":        ("Caffeine antagonises Metoprolol beta-blocking effect", "Moderate"),
            "Furanocoumarins": ("CYP2D6 pathway altered increasing Metoprolol exposure", "Moderate"),
        }
    },
    "Omeprazole": {
        "harmful": ["Caffeine", "Ethanol"],
        "safe":    ["Calcium", "Lycopene", "Vitamin K"],
        "effects": {
            "Caffeine": ("CYP1A2 inhibition elevates caffeine levels", "Low"),
            "Ethanol":  ("Worsens gastric mucosal damage; reduces PPI efficacy", "Moderate"),
        }
    },
    "Phenytoin": {
        "harmful": ["Furanocoumarins", "Ethanol", "Calcium"],
        "safe":    ["Lycopene", "Tyramine"],
        "effects": {
            "Furanocoumarins": ("CYP3A4 inhibition raises Phenytoin to toxic levels", "Critical"),
            "Ethanol":         ("Acute: increases Phenytoin levels; Chronic: decreases them", "High"),
            "Calcium":         ("Calcium reduces Phenytoin absorption from GI tract", "Moderate"),
        }
    },
    "Ramipril": {
        "harmful": ["Potassium", "Licorice Glycyrrhizin"],
        "safe":    ["Lycopene", "Vitamin K", "Caffeine"],
        "effects": {
            "Potassium":           ("Hyperkalaemia risk — ACE inhibitor + high potassium foods", "High"),
            "Licorice Glycyrrhizin": ("Licorice raises BP, directly opposing Ramipril", "High"),
        }
    },
    "Tacrolimus": {
        "harmful": ["Furanocoumarins", "Naringenin", "Calcium"],
        "safe":    ["Lycopene", "Vitamin C"],
        "effects": {
            "Furanocoumarins": ("CYP3A4 inhibition increases Tacrolimus to nephrotoxic levels", "Critical"),
            "Naringenin":      ("P-gp and CYP3A4 inhibition elevates Tacrolimus exposure", "High"),
            "Calcium":         ("Reduces Tacrolimus absorption slightly", "Low"),
        }
    },
    "Sertraline": {
        "harmful": ["Tryptophan", "Ethanol", "Tyramine"],
        "safe":    ["Lycopene", "Calcium", "Vitamin K"],
        "effects": {
            "Tryptophan": ("Serotonin syndrome risk with SSRI", "High"),
            "Ethanol":    ("Additive CNS depression; increased sedation and impairment", "Moderate"),
            "Tyramine":   ("SSRI has weaker MAO interaction than MAOIs; monitor", "Low"),
        }
    },
    "Ketoconazole": {
        "harmful": ["Ethanol", "Caffeine"],
        "safe":    ["Lycopene", "Vitamin C", "Calcium"],
        "effects": {
            "Ethanol":  ("Disulfiram-like reaction: flushing, nausea, vomiting", "High"),
            "Caffeine": ("CYP1A2 inhibition by Ketoconazole elevates caffeine", "Moderate"),
        }
    },
}

# ── PubChem SMILES fetcher ────────────────────────────────────────────────────
def get_smiles(name: str) -> str | None:
    """Fetch canonical SMILES from PubChem."""
    url = f"{PUBCHEM_BASE}/compound/name/{name}/property/CanonicalSMILES/JSON"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            props = r.json().get("PropertyTable", {}).get("Properties", [])
            if props:
                return props[0].get("CanonicalSMILES")
    except Exception as e:
        print(f"  ⚠️  PubChem error for '{name}': {e}")
    return None


# ── Load existing data ────────────────────────────────────────────────────────
def load_existing() -> set:
    """Return set of (drug_name, constituent) pairs already in dataset."""
    existing = set()
    try:
        with open(DRUG_CSV) as f:
            for row in csv.DictReader(f):
                existing.add((row["drug_name"].lower(), row["harmful_constituent"].lower()))
    except FileNotFoundError:
        pass
    return existing


# ── Load food constituent SMILES map ─────────────────────────────────────────
def load_constituent_smiles() -> dict:
    """Map constituent_name → constituent_smiles from food_constituents.csv."""
    mapping = {}
    with open(FOOD_CSV) as f:
        for row in csv.DictReader(f):
            mapping[row["constituent_name"]] = row["constituent_smiles"]
    return mapping


# ── Main augmentation logic ───────────────────────────────────────────────────
def augment():
    print("=" * 60)
    print("  MolGuard — Dataset Augmentation Script")
    print("=" * 60)

    existing         = load_existing()
    constituent_smis = load_constituent_smiles()
    new_rows         = []

    for drug_name, profile in NEW_DRUGS.items():
        print(f"\n🔍 Fetching SMILES for: {drug_name}")
        drug_smiles = get_smiles(drug_name)
        time.sleep(0.5)  # be polite to PubChem

        if not drug_smiles:
            print(f"   ❌ Could not fetch SMILES — skipping {drug_name}")
            continue

        print(f"   ✅ SMILES: {drug_smiles[:60]}...")

        # Harmful interactions (label=1)
        for constituent in profile.get("harmful", []):
            key = (drug_name.lower(), constituent.lower())
            if key in existing:
                print(f"   ⏭️  Already exists: {drug_name} + {constituent}")
                continue
            c_smiles = constituent_smis.get(constituent)
            if not c_smiles:
                print(f"   ⚠️  No SMILES found for constituent '{constituent}'")
                continue
            effect, severity = profile["effects"].get(
                constituent, ("Known harmful interaction", "Moderate"))
            new_rows.append({
                "drug_name":           drug_name,
                "drug_smiles":         drug_smiles,
                "harmful_constituent": constituent,
                "constituent_smiles":  c_smiles,
                "interaction_effect":  effect,
                "severity":            severity,
                "label":               1,
            })
            print(f"   ➕ Added UNSAFE: {drug_name} + {constituent}")

        # Safe interactions (label=0)
        for constituent in profile.get("safe", []):
            key = (drug_name.lower(), constituent.lower())
            if key in existing:
                continue
            c_smiles = constituent_smis.get(constituent)
            if not c_smiles:
                continue
            new_rows.append({
                "drug_name":           drug_name,
                "drug_smiles":         drug_smiles,
                "harmful_constituent": constituent,
                "constituent_smiles":  c_smiles,
                "interaction_effect":  "No significant interaction detected",
                "severity":            "Low",
                "label":               0,
            })
            print(f"   ➕ Added SAFE:   {drug_name} + {constituent}")

    if not new_rows:
        print("\n⚠️  No new rows to add (all already exist).")
        return

    # ── Append to existing CSV ─────────────────────────────────────────────
    original_df = pd.read_csv(DRUG_CSV)
    new_df      = pd.DataFrame(new_rows)
    combined    = pd.concat([original_df, new_df], ignore_index=True)
    combined.to_csv(OUTPUT_CSV, index=False)

    print(f"\n{'='*60}")
    print(f"  Original rows : {len(original_df)}")
    print(f"  New rows added: {len(new_rows)}")
    print(f"  Total rows    : {len(combined)}")
    print(f"  Label balance : {combined['label'].value_counts().to_dict()}")
    print(f"  Saved to      : {OUTPUT_CSV}")
    print(f"{'='*60}")
    print("\n  ✅ Replace drug_interactions.csv with drug_interactions_augmented.csv")
    print("     then re-run the Colab training notebook.")


if __name__ == "__main__":
    augment()
