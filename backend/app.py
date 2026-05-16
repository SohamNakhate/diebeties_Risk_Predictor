from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import joblib
import os
from pathlib import Path
import json
import hashlib
import jwt
from datetime import datetime, timedelta, timezone

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
    hba1c: float

class UserAuth(BaseModel):
    username: str
    password: str

class UserSignup(UserAuth):
    pass

# Define the expected location of the ML model and scaler
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

# Global model and scaler objects
model = None
scaler = None

# User Management
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
USERS_FILE = os.path.join(DATA_DIR, "users.json")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        try:
            return json.load(f)
        except:
            return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

# JWT Configuration
SECRET_KEY = "super-secret-diabetes-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.on_event("startup")
async def load_models():
    global model, scaler
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print(f"[OK] Model successfully loaded from {MODEL_PATH}")
        else:
            print(f"[WARN] Model file not found at {MODEL_PATH}")
            
        if os.path.exists(SCALER_PATH):
            scaler = joblib.load(SCALER_PATH)
            print(f"[OK] Scaler successfully loaded from {SCALER_PATH}")
        else:
            print(f"[WARN] Scaler file not found at {SCALER_PATH}")
    except Exception as e:
        print(f"[ERROR] Error loading model resources: {e}")

def get_bmi_category(bmi: float) -> int:
    """Standard clinical BMI categorization used in the training notebook."""
    if bmi < 18.5: return 0  # Underweight
    if bmi < 25.0: return 1  # Normal
    if bmi < 30.0: return 2  # Overweight
    return 3 # Obese

@app.get("/api/health")
def health_check():
    """Check if API is running and models are loaded"""
    return {
        "status": "Diabetes Risk Predictor API is running",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "ready": model is not None and scaler is not None
    }

@app.post("/predict")
async def predict_risk(data: PredictionInput, current_user: str = Depends(verify_token)):
    """Generate diabetes risk prediction based on health metrics"""
    # Check if models are loaded
    if model is None or scaler is None:
        raise HTTPException(
            status_code=503, 
            detail="ML models not loaded. Please ensure model.joblib and scaler.joblib exist in backend/models/ folder"
        )

    # Prepare features in the exact order the model expects (10 features)
    # Order: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DPF, Age, HbA1c, BMI_Category
    bmi_cat = get_bmi_category(data.bmi)
    
    raw_features = [
        data.pregnancies,
        data.glucose,
        data.bloodPressure,
        data.skinThickness,
        data.insulin,
        data.bmi,
        data.dpf,
        data.age,
        data.hba1c,
        bmi_cat
    ]

    try:
        # 1. Apply scaling
        features = scaler.transform([raw_features])

        # 2. Get prediction probability
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(features)[0]
            # Probability of class 1 (Diabetes positive)
            prob_diabetes = float(probs[1])
            
            # Map probability to risk level
            if prob_diabetes > 0.7:
                risk_level = "High"
            elif prob_diabetes > 0.3:
                risk_level = "Medium"
            else:
                risk_level = "Low"
            
            # Calculate confidence
            confidence = prob_diabetes if risk_level == "High" else (1 - prob_diabetes if risk_level == "Low" else 0.5)
        else:
            # Fallback to direct prediction if model doesn't have predict_proba
            prediction = model.predict(features)[0]
            class_map = {0: "Low", 1: "High"}
            risk_level = class_map.get(int(prediction), "Medium")
            prob_diabetes = float(prediction)
            confidence = 1.0

        return {
            "risk_level": risk_level,
            "prediction_probability": prob_diabetes,
            "confidence_score": confidence,
            "simulated": False
        }
        
    except Exception as e:
        print(f"[ERROR] Prediction error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Prediction failed: {str(e)}"
        )

@app.post("/api/signup")
async def signup(user: UserSignup):
    users = get_users()
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    users[user.username] = {
        "password": hash_password(user.password)
    }
    save_users(users)
    return {"message": "User created successfully"}

@app.post("/api/login")
async def login(user: UserAuth):
    users = get_users()
    if user.username not in users:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if users[user.username]["password"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"message": "Login successful", "username": user.username, "token": access_token}

# Redirect root to login page
@app.get("/")
async def root():
    return RedirectResponse(url="/login.html")

# Mount frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=False), name="frontend")

