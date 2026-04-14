"""
cache/prediction_cache.py
Simple in-memory + file-based LRU cache for predictions.
Avoids re-running GNN for the same drug+food pair.
"""

import json
import os
import hashlib
import time
from collections import OrderedDict
from threading import Lock

CACHE_FILE = os.path.join(os.path.dirname(__file__), "predictions.json")
MAX_MEMORY = 500   # max entries in memory
MAX_AGE_S  = 86400 * 7  # 7 days


class PredictionCache:
    def __init__(self):
        self._mem:  OrderedDict = OrderedDict()
        self._lock: Lock        = Lock()
        self._load_from_disk()

    # ── Key ────────────────────────────────────────────────────────────────
    @staticmethod
    def _key(drug_smiles: str, constituent_smiles: str, threshold: float) -> str:
        raw = f"{drug_smiles}|{constituent_smiles}|{threshold:.2f}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    # ── Public API ─────────────────────────────────────────────────────────
    def get(self, drug_smiles: str, constituent_smiles: str,
            threshold: float = 0.5) -> dict | None:
        k = self._key(drug_smiles, constituent_smiles, threshold)
        with self._lock:
            entry = self._mem.get(k)
            if entry is None:
                return None
            if time.time() - entry["ts"] > MAX_AGE_S:
                del self._mem[k]
                return None
            # LRU: move to end
            self._mem.move_to_end(k)
            return entry["value"]

    def set(self, drug_smiles: str, constituent_smiles: str,
            threshold: float, value: dict):
        k = self._key(drug_smiles, constituent_smiles, threshold)
        with self._lock:
            self._mem[k] = {"value": value, "ts": time.time()}
            self._mem.move_to_end(k)
            if len(self._mem) > MAX_MEMORY:
                self._mem.popitem(last=False)
        self._persist()

    def clear(self):
        with self._lock:
            self._mem.clear()
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)

    def stats(self) -> dict:
        with self._lock:
            return {"entries": len(self._mem), "max": MAX_MEMORY}

    # ── Disk persistence ───────────────────────────────────────────────────
    def _persist(self):
        try:
            with self._lock:
                data = {k: v for k, v in self._mem.items()}
            with open(CACHE_FILE, "w") as f:
                json.dump(data, f)
        except Exception:
            pass

    def _load_from_disk(self):
        if not os.path.exists(CACHE_FILE):
            return
        try:
            with open(CACHE_FILE) as f:
                data = json.load(f)
            now = time.time()
            for k, v in data.items():
                if now - v.get("ts", 0) < MAX_AGE_S:
                    self._mem[k] = v
        except Exception:
            pass


# Singleton
cache = PredictionCache()
