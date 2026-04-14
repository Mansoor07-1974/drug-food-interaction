"""
MolGuard — Drug-Food Interaction API  v3
========================================
POST /predict            → single drug + food prediction
POST /predict/batch      → batch predictions (up to 20 pairs)
GET  /drug/{name}        → drug info + SMILES
GET  /food/{name}        → food constituents
GET  /drugs              → all known drugs
GET  /foods              → all known foods
GET  /stats              → dataset + model stats for dashboard
GET  /cache/stats        → cache metrics
DELETE /cache            → clear prediction cache
GET  /health             → health check
"""

import asyncio
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inference import InteractionPredictor
from pubchem import PubChemClient
from data_loader import DataLoader as AppDataLoader
from cache.prediction_cache import cache as pred_cache
from logger import get_logger, log_prediction
from stats import get_dataset_stats, get_model_stats

logger      = get_logger("molguard.api")
predictor   = None
pubchem     = PubChemClient()
data_loader = AppDataLoader()

app = FastAPI(
    title="MolGuard — Drug-Food Interaction API",
    description="D-MPNN GNN drug-food interaction prediction via SMILES molecular graphs",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware: request timing ─────────────────────────────────────────────────
@app.middleware("http")
async def add_timing(request: Request, call_next):
    t0       = time.perf_counter()
    response = await call_next(request)
    ms       = (time.perf_counter() - t0) * 1000
    response.headers["X-Response-Time-Ms"] = f"{ms:.1f}"
    if request.url.path not in ("/health", "/cache/stats"):
        logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms:.0f}ms)")
    return response


@app.on_event("startup")
async def startup_event():
    global predictor
    logger.info("Starting MolGuard API v3...")
    predictor = InteractionPredictor()
    data_loader.load()
    logger.info(f"Server ready | model_loaded={predictor.is_loaded}")


# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    drug_name:  str
    food_name:  str
    threshold:  Optional[float] = 0.5

class BatchPredictRequest(BaseModel):
    pairs: list[PredictRequest]

class ConstituentResult(BaseModel):
    constituent_name:   str
    constituent_smiles: str
    interaction_effect: str
    severity:           str
    probability:        float
    label:              str

class PredictResponse(BaseModel):
    drug_name:            str
    food_name:            str
    overall_label:        str
    overall_risk:         str
    max_probability:      float
    constituents_checked: list[ConstituentResult]
    drug_smiles:          Optional[str]
    summary:              str
    duration_ms:          Optional[float] = None


# ── Core prediction logic ─────────────────────────────────────────────────────
SEVERITY_RANK = {"Critical": 4, "High": 3, "Moderate": 2, "Low": 1, "Unknown": 0, "None": -1}


async def run_prediction(drug_name: str, food_name: str,
                         threshold: float = 0.5) -> PredictResponse:
    t0 = time.perf_counter()

    # 1. Drug SMILES
    drug_entry = data_loader.get_drug(drug_name)
    if drug_entry:
        drug_smiles     = drug_entry["drug_smiles"]
        harmful_entries = drug_entry["interactions"]
    else:
        logger.info(f"'{drug_name}' not in dataset — querying PubChem")
        drug_smiles = await pubchem.get_smiles(drug_name)
        if not drug_smiles:
            raise HTTPException(
                status_code=404,
                detail=(f"Drug '{drug_name}' not found in dataset or PubChem. "
                        f"Check spelling or try the generic/INN name.")
            )
        harmful_entries = []

    # 2. Food constituents
    food_constituents = data_loader.get_food_constituents(food_name)
    if not food_constituents:
        raise HTTPException(
            status_code=404,
            detail=(f"Food '{food_name}' not found. "
                    f"Try: {', '.join(data_loader.list_foods()[:8])}...")
        )

    # 3. GNN per constituent (with cache)
    results = []
    for constituent in food_constituents:
        c_smiles = constituent["constituent_smiles"]
        c_name   = constituent["constituent_name"]

        cached = pred_cache.get(drug_smiles, c_smiles, threshold)
        pred   = cached if cached else predictor.predict(drug_smiles, c_smiles, threshold)
        if not cached:
            pred_cache.set(drug_smiles, c_smiles, threshold, pred)

        known = next(
            (e for e in harmful_entries
             if e["harmful_constituent"].lower() == c_name.lower()), None
        )
        results.append(ConstituentResult(
            constituent_name=c_name,
            constituent_smiles=c_smiles,
            interaction_effect=(known["interaction_effect"] if known
                                else "Predicted by GNN — no known interaction on record"),
            severity=(known["severity"] if known else "Unknown"),
            probability=pred["probability"],
            label=pred["label"],
        ))

    # 4. Aggregate
    unsafe        = [r for r in results if r.label == "UNSAFE"]
    max_prob      = max((r.probability for r in results), default=0.0)
    overall_label = "UNSAFE" if unsafe else "SAFE"
    overall_risk  = (
        max(unsafe, key=lambda r: SEVERITY_RANK.get(r.severity, 0)).severity
        if unsafe else "None"
    )

    if overall_label == "SAFE":
        summary = (f"No significant harmful interactions detected between "
                   f"{drug_name} and {food_name}. Safe to consume together.")
    else:
        names   = ", ".join(r.constituent_name for r in unsafe[:3])
        summary = (f"UNSAFE: {food_name} contains {names} which may interact "
                   f"harmfully with {drug_name}. Risk level: {overall_risk}. "
                   f"Consult your doctor or pharmacist.")

    duration_ms = (time.perf_counter() - t0) * 1000
    log_prediction(drug_name, food_name, overall_label, overall_risk, max_prob, duration_ms)

    return PredictResponse(
        drug_name=drug_name,
        food_name=food_name,
        overall_label=overall_label,
        overall_risk=overall_risk,
        max_probability=round(max_prob, 4),
        constituents_checked=results,
        drug_smiles=drug_smiles,
        summary=summary,
        duration_ms=round(duration_ms, 1),
    )


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":      "ok",
        "version":     "3.0.0",
        "model_loaded": predictor is not None and predictor.is_loaded,
        "cache":        pred_cache.stats(),
    }


@app.get("/stats")
def stats():
    """Returns dataset counts + model training metrics for the dashboard."""
    return {
        "dataset": get_dataset_stats(),
        "model":   get_model_stats(),
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    return await run_prediction(req.drug_name.strip(), req.food_name.strip(), req.threshold)


@app.post("/predict/batch")
async def predict_batch(req: BatchPredictRequest):
    if len(req.pairs) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 pairs per batch request")
    tasks   = [run_prediction(p.drug_name.strip(), p.food_name.strip(), p.threshold)
               for p in req.pairs]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    output  = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            output.append({"error": str(r),
                           "drug_name": req.pairs[i].drug_name,
                           "food_name": req.pairs[i].food_name})
        else:
            output.append(r)
    return {"results": output, "count": len(output)}


@app.get("/drug/{name}")
async def get_drug(name: str):
    entry = data_loader.get_drug(name)
    if not entry:
        smiles = await pubchem.get_smiles(name)
        if not smiles:
            raise HTTPException(status_code=404, detail=f"Drug '{name}' not found")
        return {"drug_name": name, "drug_smiles": smiles, "source": "PubChem", "interactions": []}
    return entry


@app.get("/food/{name}")
def get_food(name: str):
    constituents = data_loader.get_food_constituents(name)
    if not constituents:
        raise HTTPException(status_code=404, detail=f"Food '{name}' not found")
    return {"food_name": name, "constituents": constituents}


@app.get("/drugs")
def list_drugs():
    return {"drugs": data_loader.list_drugs()}


@app.get("/foods")
def list_foods():
    return {"foods": data_loader.list_foods()}


@app.get("/cache/stats")
def cache_stats():
    return pred_cache.stats()


@app.delete("/cache")
def clear_cache():
    pred_cache.clear()
    return {"message": "Cache cleared successfully"}
