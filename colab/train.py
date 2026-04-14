# =============================================================================
# DRUG-FOOD INTERACTION — COLAB TRAINING SCRIPT
# Run this cell by cell in Google Colab
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# CELL 1: Check GPU & Install Dependencies
# ─────────────────────────────────────────────────────────────────────────────
"""
!nvidia-smi  # Check if GPU is available (Colab gives T4 free)
!pip install chemprop==2.0.4 rdkit pandas scikit-learn numpy torch matplotlib seaborn
"""

# ─────────────────────────────────────────────────────────────────────────────
# CELL 2: Upload Dataset from Local Machine
# ─────────────────────────────────────────────────────────────────────────────
"""
from google.colab import files
uploaded = files.upload()  # Upload drug_interactions.csv
"""

# ─────────────────────────────────────────────────────────────────────────────
# CELL 3: Imports
# ─────────────────────────────────────────────────────────────────────────────
import pandas as pd
import numpy as np
import os
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, f1_score,
                             roc_auc_score, classification_report,
                             confusion_matrix)
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings("ignore")

print("✅ Imports done")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 4: Load & Validate Dataset
# ─────────────────────────────────────────────────────────────────────────────
df = pd.read_csv("drug_interactions.csv")

print(f"📦 Dataset shape: {df.shape}")
print(f"📊 Label distribution:\n{df['label'].value_counts()}")
print(f"\n📋 Columns: {df.columns.tolist()}")
print(f"\n🔍 Sample rows:")
print(df.head(3))

# Validate SMILES are present
missing = df[["drug_smiles", "constituent_smiles", "label"]].isnull().sum()
print(f"\n⚠️  Missing values:\n{missing}")
df = df.dropna(subset=["drug_smiles", "constituent_smiles", "label"])
print(f"✅ Clean dataset shape: {df.shape}")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 5: Validate SMILES with RDKit
# ─────────────────────────────────────────────────────────────────────────────
from rdkit import Chem
from rdkit import RDLogger
RDLogger.DisableLog("rdApp.*")

def validate_smiles(smiles):
    try:
        mol = Chem.MolFromSmiles(smiles)
        return mol is not None
    except:
        return False

df["drug_valid"]   = df["drug_smiles"].apply(validate_smiles)
df["const_valid"]  = df["constituent_smiles"].apply(validate_smiles)

invalid = df[~(df["drug_valid"] & df["const_valid"])]
if len(invalid) > 0:
    print(f"⚠️  Removing {len(invalid)} rows with invalid SMILES:")
    print(invalid[["drug_name", "harmful_constituent"]])

df = df[df["drug_valid"] & df["const_valid"]].copy()
print(f"✅ Valid SMILES dataset: {df.shape[0]} rows")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 6: Prepare Chemprop Multi-Molecule Format
# ─────────────────────────────────────────────────────────────────────────────
# Chemprop v2 supports multi-molecule input via multiple SMILES columns
# Format: smiles_1, smiles_2, label

chemprop_df = df[["drug_smiles", "constituent_smiles", "label"]].copy()
chemprop_df.columns = ["smiles_drug", "smiles_constituent", "label"]
chemprop_df["label"] = chemprop_df["label"].astype(int)

print(f"📋 Chemprop input shape: {chemprop_df.shape}")
print(chemprop_df.head())

# ─────────────────────────────────────────────────────────────────────────────
# CELL 7: Train / Val / Test Split (70/15/15)
# ─────────────────────────────────────────────────────────────────────────────
train_df, temp_df = train_test_split(
    chemprop_df, test_size=0.30, random_state=42, stratify=chemprop_df["label"]
)
val_df, test_df = train_test_split(
    temp_df, test_size=0.50, random_state=42, stratify=temp_df["label"]
)

os.makedirs("chemprop_data", exist_ok=True)
train_df.to_csv("chemprop_data/train.csv", index=False)
val_df.to_csv("chemprop_data/val.csv",   index=False)
test_df.to_csv("chemprop_data/test.csv",  index=False)

print(f"✅ Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")
print(f"   Train positives: {train_df['label'].sum()} | negatives: {(train_df['label']==0).sum()}")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 8: Train with Chemprop v2 Python API (Multi-Molecule D-MPNN)
# ─────────────────────────────────────────────────────────────────────────────
import torch
from chemprop import data, featurizers, models, nn

print(f"🔥 CUDA available: {torch.cuda.is_available()}")
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"📍 Training on: {device.upper()}")

# --- Build datasets ---
def load_chemprop_data(csv_path):
    df = pd.read_csv(csv_path)
    datapoints = []
    for _, row in df.iterrows():
        mol1 = Chem.MolFromSmiles(row["smiles_drug"])
        mol2 = Chem.MolFromSmiles(row["smiles_constituent"])
        if mol1 and mol2:
            dp = data.MoleculeDatapoint.from_smi(
                smis=[row["smiles_drug"], row["smiles_constituent"]],
                y=np.array([[row["label"]]], dtype=float)
            )
            datapoints.append(dp)
    return datapoints

print("⏳ Loading datasets...")
train_data = load_chemprop_data("chemprop_data/train.csv")
val_data   = load_chemprop_data("chemprop_data/val.csv")
test_data  = load_chemprop_data("chemprop_data/test.csv")

featurizer = featurizers.SimpleMoleculeMolGraphFeaturizer()

train_dset = data.MoleculeDataset(train_data, featurizer=featurizer)
val_dset   = data.MoleculeDataset(val_data,   featurizer=featurizer)
test_dset  = data.MoleculeDataset(test_data,  featurizer=featurizer)

train_loader = data.build_dataloader(train_dset, shuffle=True,  batch_size=32)
val_loader   = data.build_dataloader(val_dset,   shuffle=False, batch_size=32)
test_loader  = data.build_dataloader(test_dset,  shuffle=False, batch_size=32)

print(f"✅ Train: {len(train_dset)} | Val: {len(val_dset)} | Test: {len(test_dset)}")

# --- Build Model ---
# Two separate D-MPNN encoders (one per molecule), then concatenate
mp = nn.BondMessagePassing()          # Message passing on molecular graph
agg = nn.MeanAggregation()            # Aggregate atom features
# Fully connected predictor
ffn = nn.BinaryClassificationFFN(
    input_dim=mp.output_dim * 2,      # *2 for two molecules
    hidden_dim=300,
    n_layers=3,
    dropout=0.2
)

model = models.MPNN(message_passing=mp, agg=agg, predictor=ffn)
model = model.to(device)

total_params = sum(p.numel() for p in model.parameters())
print(f"🧠 Model parameters: {total_params:,}")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 9: Training Loop
# ─────────────────────────────────────────────────────────────────────────────
import torch.nn as torch_nn
from torch.optim import Adam
from torch.optim.lr_scheduler import ReduceLROnPlateau

EPOCHS       = 50
LR           = 1e-4
PATIENCE     = 10   # Early stopping patience

optimizer = Adam(model.parameters(), lr=LR, weight_decay=1e-5)
scheduler = ReduceLROnPlateau(optimizer, mode="max", patience=5, factor=0.5)
criterion = torch_nn.BCEWithLogitsLoss()

best_val_auc  = 0.0
best_epoch    = 0
patience_ctr  = 0
history = {"train_loss": [], "val_loss": [], "val_auc": [], "val_acc": []}

print(f"\n🚀 Starting training for {EPOCHS} epochs...\n")

for epoch in range(1, EPOCHS + 1):
    # ── Train ─────────────────────────────────────────────────────────────
    model.train()
    train_losses = []

    for batch in train_loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        logits = model(batch).squeeze(-1)
        targets = batch.y.float().squeeze(-1)
        loss = criterion(logits, targets)
        loss.backward()
        torch_nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()
        train_losses.append(loss.item())

    # ── Validate ───────────────────────────────────────────────────────────
    model.eval()
    val_losses, val_preds, val_targets = [], [], []

    with torch.no_grad():
        for batch in val_loader:
            batch = batch.to(device)
            logits  = model(batch).squeeze(-1)
            targets = batch.y.float().squeeze(-1)
            loss    = criterion(logits, targets)
            val_losses.append(loss.item())
            probs = torch.sigmoid(logits)
            val_preds.extend(probs.cpu().numpy())
            val_targets.extend(targets.cpu().numpy())

    avg_train_loss = np.mean(train_losses)
    avg_val_loss   = np.mean(val_losses)
    val_preds_bin  = [1 if p >= 0.5 else 0 for p in val_preds]
    val_auc        = roc_auc_score(val_targets, val_preds)
    val_acc        = accuracy_score(val_targets, val_preds_bin)

    scheduler.step(val_auc)

    history["train_loss"].append(avg_train_loss)
    history["val_loss"].append(avg_val_loss)
    history["val_auc"].append(val_auc)
    history["val_acc"].append(val_acc)

    # ── Early stopping ─────────────────────────────────────────────────────
    if val_auc > best_val_auc:
        best_val_auc = val_auc
        best_epoch   = epoch
        patience_ctr = 0
        torch.save({
            "epoch":      epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_auc":    val_auc,
        }, "best_model.pt")
        print(f"  💾 Saved best model (AUC={val_auc:.4f})")
    else:
        patience_ctr += 1

    if epoch % 5 == 0 or patience_ctr == 0:
        print(f"Epoch {epoch:3d}/{EPOCHS} | "
              f"Train Loss: {avg_train_loss:.4f} | "
              f"Val Loss: {avg_val_loss:.4f} | "
              f"Val AUC: {val_auc:.4f} | "
              f"Val Acc: {val_acc:.4f}")

    if patience_ctr >= PATIENCE:
        print(f"\n⏹️  Early stopping at epoch {epoch} "
              f"(best epoch: {best_epoch}, best AUC: {best_val_auc:.4f})")
        break

print(f"\n✅ Training complete! Best epoch: {best_epoch}, Best Val AUC: {best_val_auc:.4f}")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 10: Plot Training History
# ─────────────────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

axes[0].plot(history["train_loss"], label="Train Loss", color="#e74c3c")
axes[0].plot(history["val_loss"],   label="Val Loss",   color="#3498db")
axes[0].set_title("Loss Curves"); axes[0].legend(); axes[0].set_xlabel("Epoch")

axes[1].plot(history["val_auc"],  color="#2ecc71", label="Val AUC")
axes[1].axhline(best_val_auc, color="red", linestyle="--", alpha=0.5, label=f"Best: {best_val_auc:.3f}")
axes[1].set_title("Validation AUC"); axes[1].legend(); axes[1].set_xlabel("Epoch")

axes[2].plot(history["val_acc"],  color="#9b59b6", label="Val Accuracy")
axes[2].set_title("Validation Accuracy"); axes[2].legend(); axes[2].set_xlabel("Epoch")

plt.tight_layout()
plt.savefig("training_history.png", dpi=150, bbox_inches="tight")
plt.show()
print("📊 Training history saved to training_history.png")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 11: Evaluate on Test Set
# ─────────────────────────────────────────────────────────────────────────────
# Load best model
checkpoint = torch.load("best_model.pt", map_location=device)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

test_preds, test_targets = [], []
with torch.no_grad():
    for batch in test_loader:
        batch = batch.to(device)
        logits  = model(batch).squeeze(-1)
        targets = batch.y.float().squeeze(-1)
        probs   = torch.sigmoid(logits)
        test_preds.extend(probs.cpu().numpy())
        test_targets.extend(targets.cpu().numpy())

test_preds_bin = [1 if p >= 0.5 else 0 for p in test_preds]
test_auc = roc_auc_score(test_targets, test_preds)
test_f1  = f1_score(test_targets, test_preds_bin)
test_acc = accuracy_score(test_targets, test_preds_bin)

print("=" * 50)
print("📊 TEST SET RESULTS")
print("=" * 50)
print(f"  AUC-ROC:  {test_auc:.4f}")
print(f"  F1 Score: {test_f1:.4f}")
print(f"  Accuracy: {test_acc:.4f}")
print("\n📋 Classification Report:")
print(classification_report(test_targets, test_preds_bin,
                             target_names=["Safe (0)", "Unsafe (1)"]))

# Confusion matrix
cm = confusion_matrix(test_targets, test_preds_bin)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=["Safe", "Unsafe"],
            yticklabels=["Safe", "Unsafe"])
plt.title("Confusion Matrix — Test Set")
plt.ylabel("Actual"); plt.xlabel("Predicted")
plt.savefig("confusion_matrix.png", dpi=150, bbox_inches="tight")
plt.show()

# ─────────────────────────────────────────────────────────────────────────────
# CELL 12: Save Model Artifacts for Backend
# ─────────────────────────────────────────────────────────────────────────────
os.makedirs("model_artifacts", exist_ok=True)

# Save full model (weights + architecture config)
model_config = {
    "model_type":     "D-MPNN-BinaryClassifier",
    "n_molecules":    2,
    "hidden_dim":     300,
    "n_layers":       3,
    "dropout":        0.2,
    "threshold":      0.5,
    "best_epoch":     best_epoch,
    "best_val_auc":   best_val_auc,
    "test_auc":       test_auc,
    "test_f1":        test_f1,
    "test_accuracy":  test_acc,
}

with open("model_artifacts/model_config.json", "w") as f:
    json.dump(model_config, f, indent=2)

# Save model weights
torch.save(model.state_dict(), "model_artifacts/model_weights.pt")

# Save full checkpoint
torch.save({
    "model_state_dict": model.state_dict(),
    "model_config":     model_config,
}, "model_artifacts/full_checkpoint.pt")

print("✅ Model artifacts saved:")
print("   model_artifacts/model_weights.pt")
print("   model_artifacts/model_config.json")
print("   model_artifacts/full_checkpoint.pt")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 13: Quick Inference Test
# ─────────────────────────────────────────────────────────────────────────────
def predict_interaction(drug_smiles: str, constituent_smiles: str,
                        threshold: float = 0.5) -> dict:
    """
    Predict if a drug-constituent pair is safe or unsafe.
    Returns probability and label.
    """
    from chemprop import data as cdata, featurizers as cfeat

    dp = cdata.MoleculeDatapoint.from_smi(
        smis=[drug_smiles, constituent_smiles],
        y=np.array([[0.0]])
    )
    feat  = cfeat.SimpleMoleculeMolGraphFeaturizer()
    dset  = cdata.MoleculeDataset([dp], featurizer=feat)
    loader = cdata.build_dataloader(dset, shuffle=False, batch_size=1)

    model.eval()
    with torch.no_grad():
        for batch in loader:
            batch = batch.to(device)
            logit = model(batch).squeeze(-1)
            prob  = torch.sigmoid(logit).item()

    return {
        "probability": round(prob, 4),
        "label":       "UNSAFE" if prob >= threshold else "SAFE",
        "confidence":  round(max(prob, 1 - prob) * 100, 1),
    }

# Test with a known interaction
result = predict_interaction(
    drug_smiles="CC1(C2CC3CC(C2)(CC3C1=O)OC(=O)c1ccccc1)O",  # Warfarin
    constituent_smiles="CC1(CCC(=C)C(C1)OC(=O)/C=C/c1ccc(O)cc1)C",  # Vitamin K
)
print(f"\n🧪 Test prediction (Warfarin + Vitamin K):")
print(f"   Probability: {result['probability']}")
print(f"   Label: {result['label']}")
print(f"   Confidence: {result['confidence']}%")

# ─────────────────────────────────────────────────────────────────────────────
# CELL 14: Download Artifacts from Colab → Local Machine
# ─────────────────────────────────────────────────────────────────────────────
"""
import shutil
from google.colab import files

shutil.make_archive("model_artifacts", "zip", "model_artifacts")
files.download("model_artifacts.zip")
files.download("training_history.png")
files.download("confusion_matrix.png")
print("✅ Download complete! Place model_artifacts/ inside your backend/ folder.")
"""
