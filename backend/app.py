from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(title="Diabetes Risk Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Input Schema ──────────────────────────────────────────────────────────────
class PredictionInput(BaseModel):
    pregnancies: float
    glucose: float
    bloodPressure: float
    skinThickness: float
    insulin: float
    bmi: float
    dpf: float
    age: float

# ── Load Model + Scaler ───────────────────────────────────────────────────────
MODEL_DIR   = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH  = os.path.join(MODEL_DIR, "model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

model  = None
scaler = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded  → {MODEL_PATH}")
    else:
        print(f"⚠️  model.joblib not found at {MODEL_PATH}")

    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print(f"✅ Scaler loaded → {SCALER_PATH}")
    else:
        print(f"⚠️  scaler.joblib not found at {SCALER_PATH}")

except Exception as e:
    print(f"❌ Error loading model/scaler: {e}")


def engineer_features(d: PredictionInput) -> np.ndarray:
    """
    Mirrors the feature engineering in Mini_Project_VI.ipynb exactly.
    Returns an array of 11 features in the same order the model was trained on:
    [Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DPF, Age,
     BMI_Glucose_Ratio, Age_Pregnancies_Interaction, Insulin_Glucose_Ratio]
    """
    bmi_glucose_ratio            = d.bmi / d.glucose if d.glucose != 0 else 0
    age_pregnancies_interaction  = d.age * d.pregnancies
    insulin_glucose_ratio        = d.insulin / d.glucose if d.glucose != 0 else 0

    return np.array([[
        d.pregnancies,
        d.glucose,
        d.bloodPressure,
        d.skinThickness,
        d.insulin,
        d.bmi,
        d.dpf,
        d.age,
        bmi_glucose_ratio,
        age_pregnancies_interaction,
        insulin_glucose_ratio,
    ]])


def probability_to_risk(prob: float) -> str:
    """Mirrors the risk-scoring logic from the notebook."""
    if prob <= 0.30:
        return "Low"
    elif prob <= 0.60:
        return "Medium"
    else:
        return "High"


# ── Predict Endpoint ──────────────────────────────────────────────────────────
@app.post("/predict")
async def predict_risk(data: PredictionInput):

    # ── Require model + scaler — no fallback, no wrong results ───────────────
    if model is None or scaler is None:
        raise HTTPException(
            status_code=503,
            detail="Model not ready. Please run export_model.py first to generate model.joblib and scaler.joblib."
        )

    # ── Real prediction using trained Random Forest ───────────────────────────
    try:
        features_raw    = engineer_features(data)          # shape (1, 11)
        features_scaled = scaler.transform(features_raw)   # same scaler as training

        # predict_proba returns [[prob_class0, prob_class1]]
        # class 1 = diabetes positive → probability of being diabetic
        proba       = model.predict_proba(features_scaled)[0][1]
        risk_level  = probability_to_risk(proba)

        return {
            "risk_level": risk_level,
            "simulated": False,
            "probability": round(float(proba), 4)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "status": "running",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
    }


# ── Serve Frontend ────────────────────────────────────────────────────────────
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
