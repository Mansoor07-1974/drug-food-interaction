# model_artifacts/

This folder is empty by default.
After training in Google Colab, place these files here:

  model_artifacts/
  ├── full_checkpoint.pt      ← PyTorch model weights + config
  ├── model_config.json       ← Architecture hyperparameters + metrics
  ├── training_curves.png     ← Loss / AUC plots
  └── confusion_matrix.png    ← Test set confusion matrix

## How to get these files

1. Open `colab/MolGuard_Training.ipynb` in Google Colab
2. Enable GPU: Runtime → Change runtime type → T4 GPU
3. Run all cells (Cell 1 → Cell 13)
4. Cell 13 automatically downloads `model_artifacts.zip`
5. Extract the zip and copy the `model_artifacts/` folder here

## What happens without the model?

The backend runs in **Demo Mode** automatically.
Demo mode uses rule-based heuristics (known dangerous SMILES substructures)
to make approximate predictions — useful for UI testing without GPU training.

You will see this log message on startup:
  ⚠️  Model not found — Running in DEMO MODE
