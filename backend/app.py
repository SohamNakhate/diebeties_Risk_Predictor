from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="Diabetes Risk Predictor API")

# Allow CORS so the frontend can interact with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    pregnancies: float
    glucose: float
    bloodPressure: float
    skinThickness: float
    insulin: float
    bmi: float
    dpf: float
    age: float

# Define the expected location of the ML model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")

model = None
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Model successfully loaded from {MODEL_PATH}")
    else:
        print(f"Warning: Model not found at {MODEL_PATH}. Awaiting placement.")
except Exception as e:
    print(f"Error loading model: {e}")

@app.post("/predict")
async def predict_risk(data: PredictionInput):
    # Fallback to simulation if model is not yet placed
    if model is None:
        risk = "Low"
        if data.glucose > 140 or data.bmi > 30:
            risk = "High"
        elif data.glucose > 100 or data.bmi > 25:
            risk = "Medium"
        return {"risk_level": risk, "simulated": True, "message": "ML model missing. Using heuristic simulation."}

    # Model is loaded, prepare features in the expected order
    features = [
        [
            data.pregnancies,
            data.glucose,
            data.bloodPressure,
            data.skinThickness,
            data.insulin,
            data.bmi,
            data.dpf,
            data.age
        ]
    ]

    try:
        # Standard predict behavior
        prediction = model.predict(features)
        
        # Determine the risk level from the model output.
        # This mapping can be tweaked to match exactly what your model outputs.
        pred_val = prediction[0]
        
        # Example mapping logic
        if isinstance(pred_val, str):
            # E.g., model outputs "High", "Medium", "Low"
            risk_level = pred_val 
        elif isinstance(pred_val, (int, float)):
            # Assuming 0: Low, 1: Medium, 2: High
            class_map = {0: "Low", 1: "Medium", 2: "High"}
            risk_level = class_map.get(int(pred_val), "Medium")
        else:
            risk_level = str(pred_val)

        return {"risk_level": risk_level, "simulated": False}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/api/health")
def health_check():
    return {"status": "Diabetes Risk Predictor API is running."}

# Mount frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
