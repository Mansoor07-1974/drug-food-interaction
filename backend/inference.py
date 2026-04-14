"""
inference.py — Chemprop D-MPNN inference for the backend
"""

import os
import json
import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "model_artifacts", "full_checkpoint.pt")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "model_artifacts", "model_config.json")


class InteractionPredictor:
    """Wraps the trained Chemprop D-MPNN for inference."""

    def __init__(self):
        self.model      = None
        self.device     = "cuda" if torch.cuda.is_available() else "cpu"
        self.config     = {}
        self.is_loaded  = False
        self._load()

    def _load(self):
        if not os.path.exists(MODEL_PATH):
            logger.warning(
                f"⚠️  Model not found at {MODEL_PATH}. "
                f"Running in DEMO MODE with random predictions. "
                f"Train the model in Colab and place artifacts in backend/model_artifacts/"
            )
            self.is_loaded = False
            return

        try:
            from chemprop import nn as cnn, models as cmodels

            with open(CONFIG_PATH) as f:
                self.config = json.load(f)

            # Rebuild architecture (must match training)
            mp  = cnn.BondMessagePassing()
            agg = cnn.MeanAggregation()
            ffn = cnn.BinaryClassificationFFN(
                input_dim=mp.output_dim ,
                hidden_dim=self.config.get("hidden_dim", 300),
                n_layers=self.config.get("n_layers", 3),
                dropout=self.config.get("dropout", 0.2),
            )
            self.model = cmodels.MPNN(
                message_passing=mp, agg=agg, predictor=ffn
            ).to(self.device)

            checkpoint = torch.load(MODEL_PATH, map_location=self.device)
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.model.eval()

            self.is_loaded = True
            logger.info(
                f"✅ Model loaded | Device: {self.device.upper()} | "
                f"Val AUC: {self.config.get('best_val_auc', 'N/A')}"
            )

        except ImportError:
            logger.error("❌ chemprop not installed. Run: pip install chemprop==2.0.4")
            self.is_loaded = False
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            self.is_loaded = False

    def predict(self, drug_smiles: str, constituent_smiles: str,
                threshold: float = 0.5) -> dict:
        """
        Returns:
          { probability: float, label: "SAFE"|"UNSAFE", confidence: float }
        """
        if not self.is_loaded:
            return self._demo_predict(drug_smiles, constituent_smiles, threshold)

        try:
            from chemprop import data as cdata, featurizers as cfeat

            dp = cdata.MoleculeDatapoint.from_smi(
                smis=[drug_smiles, constituent_smiles],
                y=np.array([[0.0]])
            )
            featurizer = cfeat.SimpleMoleculeMolGraphFeaturizer()
            dset       = cdata.MoleculeDataset([dp], featurizer=featurizer)
            loader     = cdata.build_dataloader(dset, shuffle=False, batch_size=1)

            with torch.no_grad():
                for batch in loader:
                    batch = batch.to(self.device)
                    logit = self.model(batch).squeeze(-1)
                    prob  = torch.sigmoid(logit).item()

            return {
                "probability": round(prob, 4),
                "label":       "UNSAFE" if prob >= threshold else "SAFE",
                "confidence":  round(max(prob, 1 - prob) * 100, 1),
            }

        except Exception as e:
            logger.error(f"Inference error: {e}")
            return self._demo_predict(drug_smiles, constituent_smiles, threshold)

    def _demo_predict(self, drug_smiles: str, constituent_smiles: str,
                      threshold: float) -> dict:
        """
        Fallback rule-based heuristic when model is not loaded.
        Uses known dangerous substructures as a rough proxy.
        """
        # Dangerous structural patterns (SMARTS-based)
        DANGEROUS_PATTERNS = [
            "CCO",                          # Ethanol
            "NCCc1ccc(O)cc1",              # Tyramine
            "OC([O-])=O.[Ca+2]",           # Calcium chelation
            "O=S(=O)([O-])O.[Fe+2]",       # Iron chelation
            "Cn1cnc2c1c(=O)n(C)n2C",       # Caffeine-like
        ]

        prob = 0.15  # default safe probability
        for pat in DANGEROUS_PATTERNS:
            if pat in constituent_smiles:
                prob = 0.80
                break

        return {
            "probability": prob,
            "label":       "UNSAFE" if prob >= threshold else "SAFE",
            "confidence":  round(max(prob, 1 - prob) * 100, 1),
            "note":        "Demo mode — train model in Colab for real predictions",
        }
