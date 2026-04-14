# 🧪 MolGuard — Drug-Food Interaction Checker
### D-MPNN Graph Neural Network · SMILES Molecular Graphs · FastAPI · React

---

## 📁 Complete Project Structure

```
drug-food-interaction/
│
├── 📊 datasets/
│   ├── drug_interactions.csv          Drug SMILES + harmful constituents + labels
│   └── food_constituents.csv          Food → constituent SMILES mapping
│
├── 🧠 colab/
│   ├── MolGuard_Training.ipynb        ← Upload & run this in Google Colab
│   ├── train.py                       Same content as .py (reference)
│   └── explainability.py             Atom importance heatmap cells
│
├── ⚙️  backend/
│   ├── main.py                        FastAPI app (all endpoints v3)
│   ├── inference.py                   Chemprop D-MPNN predictor
│   ├── pubchem.py                     Live PubChem SMILES lookup
│   ├── data_loader.py                 CSV dataset reader
│   ├── stats.py                       Dataset + model stats for dashboard
│   ├── logger.py                      Structured JSON file logging
│   ├── cache/
│   │   └── prediction_cache.py        LRU in-memory + disk cache
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_api.py                20 pytest integration tests
│   ├── model_artifacts/               ← Place trained model here
│   │   └── README.md
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── .dockerignore
│
├── 🎨 frontend/
│   ├── src/
│   │   ├── App.jsx                    Home page (Single / Batch / SMILES tabs)
│   │   ├── main.jsx                   Router root + ErrorBoundary
│   │   ├── index.css                  Global dark theme
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          Model metrics + dataset stats
│   │   │   └── About.jsx              Project info + tech stack
│   │   ├── components/
│   │   │   ├── Navbar.jsx             Top navigation bar
│   │   │   ├── BatchChecker.jsx       Multi-pair prediction table
│   │   │   ├── MolViewer.jsx          RDKit.js 2D structure renderer
│   │   │   ├── ExportButton.jsx       CSV / JSON export
│   │   │   ├── HistoryPanel.jsx       Recent searches (localStorage)
│   │   │   ├── DrugInfoPanel.jsx      Drug info sidebar
│   │   │   └── ErrorBoundary.jsx      React crash handler
│   │   └── hooks/
│   │       └── useHistory.js          Search history hook
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── 📜 scripts/
│   └── augment_dataset.py             Auto-fetch 10 new drugs from PubChem
│
├── 🐳 docker-compose.yml
├── .gitignore
│
└── 🖱️  Windows one-click scripts
    ├── start_backend.bat              Local dev backend
    ├── start_frontend.bat             Local dev frontend
    ├── start_docker.bat               Docker deployment (both services)
    ├── stop_docker.bat                Stop Docker services
    ├── augment_dataset.bat            Run dataset augmentation
    └── run_tests.bat                  Run backend pytest suite
```

---

## 🚀 Three Ways to Run

### Option A — Local Development (Recommended for first run)

#### Step 1: Train the model in Google Colab

1. Open **`colab/MolGuard_Training.ipynb`** at [colab.research.google.com](https://colab.research.google.com)
2. Enable GPU: **Runtime → Change runtime type → T4 GPU**
3. Run cells top to bottom — the last cell downloads `model_artifacts.zip`
4. Extract and place `model_artifacts/` inside `backend/`:
   ```
   backend/model_artifacts/
   ├── full_checkpoint.pt
   └── model_config.json
   ```

> ⚡ **No GPU / Skip training?** The backend runs in **Demo Mode** automatically using
> rule-based heuristics. All UI features work — only GNN predictions use approximate values.

#### Step 2: Start the backend

```bat
REM Double-click or run in PowerShell:
start_backend.bat
```

Or manually:
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ API running at: **http://localhost:8000**  
📖 Swagger docs:  **http://localhost:8000/docs**

#### Step 3: Start the frontend

```bat
REM In a new window, double-click:
start_frontend.bat
```

Or manually:
```powershell
cd frontend
npm install
npm run dev
```

✅ UI running at: **http://localhost:5173**

---

### Option B — Docker (Single command, no Python setup)

```bat
REM Just double-click:
start_docker.bat
```

Or from PowerShell:
```powershell
docker compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

Stop with:
```bat
stop_docker.bat
```

---

### Option C — Expand the Dataset (Optional)

```bat
augment_dataset.bat
```

This fetches SMILES for 10 new drugs from PubChem and cross-joins with known
food constituents, adding ~50 new labelled rows. Upload the augmented CSV to
Colab and retrain for better accuracy.

---

## 🔌 API Endpoints

| Method   | Endpoint          | Description                               |
|----------|-------------------|-------------------------------------------|
| `POST`   | `/predict`        | Single drug + food prediction             |
| `POST`   | `/predict/batch`  | Batch (up to 20 pairs), runs concurrently |
| `GET`    | `/drug/{name}`    | Drug SMILES + known interactions          |
| `GET`    | `/food/{name}`    | Food constituents + SMILES                |
| `GET`    | `/drugs`          | List all known drugs                      |
| `GET`    | `/foods`          | List all known foods                      |
| `GET`    | `/stats`          | Dataset counts + model metrics            |
| `GET`    | `/cache/stats`    | Cache hit/miss counts                     |
| `DELETE` | `/cache`          | Clear prediction cache                    |
| `GET`    | `/health`         | Health + model status                     |

### Example

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"drug_name": "Warfarin", "food_name": "Spinach"}'
```

```json
{
  "drug_name": "Warfarin",
  "food_name": "Spinach",
  "overall_label": "UNSAFE",
  "overall_risk": "High",
  "max_probability": 0.89,
  "duration_ms": 42.3,
  "constituents_checked": [
    {
      "constituent_name": "Vitamin K",
      "label": "UNSAFE",
      "probability": 0.89,
      "severity": "High",
      "interaction_effect": "Vitamin K antagonizes anticoagulant effect of Warfarin"
    }
  ],
  "summary": "UNSAFE: Spinach contains Vitamin K which interacts harmfully with Warfarin..."
}
```

---

## 🧠 Model Architecture

```
Drug SMILES ──────────────────────────────────────────────────┐
                                                               ├── Bond Message Passing (3 layers)
Food Constituent SMILES ──────────────────────────────────────┘         │
                                                                Mean Aggregation
                                                                         │
                                                               Concat embeddings (dim=600)
                                                                         │
                                                               FFN (3 layers, dropout=20%)
                                                                         │
                                                               Sigmoid → P(unsafe) ∈ [0,1]
                                                                         │
                                                              threshold=0.5 → SAFE / UNSAFE
```

**Why D-MPNN generalizes to new drugs:**
The model encodes molecular *structure* (atoms/bonds), not drug names.
A brand-new drug with a SMILES string gets meaningful predictions based on
structural similarity to known drugs in the training set.

---

## 🧪 Running Tests

```bat
run_tests.bat
```

Or manually:
```powershell
cd backend
venv\Scripts\activate
pip install pytest httpx
pytest tests/test_api.py -v
```

---

## 📦 Data Sources

| Source      | URL                                  | Used for                        |
|-------------|--------------------------------------|---------------------------------|
| DrugBank    | https://go.drugbank.com              | Drug SMILES + interactions      |
| PubChem     | https://pubchem.ncbi.nlm.nih.gov     | Live SMILES lookup (new drugs)  |
| FooDB       | https://foodb.ca                     | Food constituent chemistry      |
| USDA FoodData | https://fdc.nal.usda.gov           | Food composition                |
| Chemprop    | https://github.com/chemprop/chemprop | D-MPNN library                  |

---

## ⚙️ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Model     | Chemprop v2 D-MPNN (PyTorch)        |
| Training  | Google Colab (free T4 GPU)          |
| Backend   | FastAPI 0.111 + Uvicorn             |
| Frontend  | React 18 + Vite + React Router v6   |
| Chemistry | RDKit (Python) + RDKit.js (browser) |
| Deploy    | Docker + docker-compose             |
| Tests     | pytest + httpx                      |

---

## ⚠️ Medical Disclaimer

MolGuard is an educational and research tool.
Predictions are based on molecular structure similarity and known pharmacological
interactions. They may not capture all pharmacokinetic or pharmacodynamic effects.
**Always consult a qualified healthcare professional or pharmacist** before making
decisions about drug therapy or diet.
