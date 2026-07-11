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

# ── Database ──────────────────────────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

firebase_db = None

try:
    firebase_creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if firebase_creds_json:
        import json
        creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        print("[OK] Firebase Admin SDK initialized with environment service account credentials.")
    else:
        local_key_path = os.environ.get("FIREBASE_KEY_PATH", "firebase-key.json")
        if os.path.exists(local_key_path):
            cred = credentials.Certificate(local_key_path)
            firebase_admin.initialize_app(cred)
            print(f"[OK] Firebase Admin SDK initialized with local key: {local_key_path}")
        else:
            print("[WARN] FIREBASE_SERVICE_ACCOUNT env var not set and firebase-key.json not found. Initializing with Default Credentials.")
            firebase_admin.initialize_app()
    
    firebase_db = firestore.client()
except Exception as e:
    print(f"[ERROR] Failed to initialize Firebase Admin SDK: {e}")

# ── Dependency ────────────────────────────────────────────────────────────────

def get_db():
    yield firebase_db

# ── App Setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Diabetes Risk Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class PredictionInput(BaseModel):
    pregnancies:   float
    glucose:       float
    bloodPressure: float
    skinThickness: float
    insulin:       float
    bmi:           float
    dpf:           float
    age:           float
    hba1c:         float

class UserAuth(BaseModel):
    username: str
    password: str

class UserSignup(UserAuth):
    pass

# ── ML Models ─────────────────────────────────────────────────────────────────

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH  = os.path.join(MODEL_DIR, "model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

model  = None
scaler = None

# ── Auth Helpers ──────────────────────────────────────────────────────────────

SECRET_KEY                  = os.environ.get("SECRET_KEY", "super-secret-diabetes-key-secure-32-characters")
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def load_models():
    global model, scaler
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print(f"[OK] Model loaded from {MODEL_PATH}")
        else:
            print(f"[WARN] Model not found at {MODEL_PATH}")

        if os.path.exists(SCALER_PATH):
            scaler = joblib.load(SCALER_PATH)
            print(f"[OK] Scaler loaded from {SCALER_PATH}")
        else:
            print(f"[WARN] Scaler not found at {SCALER_PATH}")
    except Exception as e:
        print(f"[ERROR] Loading models: {e}")

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_bmi_category(bmi: float) -> int:
    if bmi < 18.5: return 0
    if bmi < 25.0: return 1
    if bmi < 30.0: return 2
    return 3

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {
        "status":        "Diabetes Risk Predictor API is running",
        "model_loaded":  model is not None,
        "scaler_loaded": scaler is not None,
        "ready":         model is not None and scaler is not None,
    }


@app.post("/api/signup")
async def signup(user: UserSignup, db = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    user_ref = db.collection("users").document(user.username)
    doc = user_ref.get()
    if doc.exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    user_ref.set({
        "username": user.username,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc)
    })
    return {"message": "User created successfully"}


@app.post("/api/login")
async def login(user: UserAuth, db = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    user_ref = db.collection("users").document(user.username)
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_data = doc.to_dict()
    if user_data.get("password_hash") != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": user.username})
    return {"message": "Login successful", "username": user.username, "token": token}


@app.post("/predict")
async def predict_risk(
    data: PredictionInput,
    current_user: str = Depends(verify_token),
    db = Depends(get_db),
):
    if model is None or scaler is None:
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Ensure model.joblib and scaler.joblib exist in backend/models/",
        )

    bmi_cat = get_bmi_category(data.bmi)
    raw_features = [
        data.pregnancies, data.glucose, data.bloodPressure,
        data.skinThickness, data.insulin, data.bmi,
        data.dpf, data.age, data.hba1c, bmi_cat,
    ]

    try:
        features = scaler.transform([raw_features])

        if hasattr(model, "predict_proba"):
            probs         = model.predict_proba(features)[0]
            prob_diabetes = float(probs[1])

            if prob_diabetes > 0.7:
                risk_level = "High"
            elif prob_diabetes > 0.3:
                risk_level = "Medium"
            else:
                risk_level = "Low"

            confidence = (
                prob_diabetes       if risk_level == "High" else
                (1 - prob_diabetes) if risk_level == "Low"  else 0.5
            )
        else:
            prediction    = model.predict(features)[0]
            risk_level    = {0: "Low", 1: "High"}.get(int(prediction), "Medium")
            prob_diabetes = float(prediction)
            confidence    = 1.0

        # ── Save prediction to DB ──────────────────────────────────────────
        if db is not None:
            prediction_data = {
                "username":               current_user,
                "timestamp":              datetime.now(timezone.utc),
                "pregnancies":            data.pregnancies,
                "glucose":                data.glucose,
                "blood_pressure":         data.bloodPressure,
                "skin_thickness":         data.skinThickness,
                "insulin":                data.insulin,
                "bmi":                    data.bmi,
                "dpf":                    data.dpf,
                "age":                    data.age,
                "hba1c":                  data.hba1c,
                "risk_level":             risk_level,
                "prediction_probability": prob_diabetes,
                "confidence_score":       confidence,
            }
            db.collection("predictions").add(prediction_data)

        return {
            "risk_level":             risk_level,
            "prediction_probability": prob_diabetes,
            "confidence_score":       confidence,
            "simulated":              False,
        }

    except Exception as e:
        print(f"[ERROR] Prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/api/history")
async def get_history(
    current_user: str = Depends(verify_token),
    db = Depends(get_db),
):
    """Return all past predictions for the logged-in user."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    docs = db.collection("predictions").where("username", "==", current_user).stream()
    records = []
    for doc in docs:
        r = doc.to_dict()
        records.append(r)

    # Sort by timestamp descending
    def get_timestamp(record):
        ts = record.get("timestamp")
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts)
            except ValueError:
                pass
        return datetime.min.replace(tzinfo=timezone.utc)

    records.sort(key=get_timestamp, reverse=True)

    return [
        {
            "timestamp":              (r.get("timestamp").isoformat() if isinstance(r.get("timestamp"), datetime) else str(r.get("timestamp"))),
            "pregnancies":            r.get("pregnancies"),
            "glucose":                r.get("glucose"),
            "bloodPressure":          r.get("blood_pressure"),
            "skinThickness":          r.get("skin_thickness"),
            "insulin":                r.get("insulin"),
            "bmi":                    r.get("bmi"),
            "dpf":                    r.get("dpf"),
            "age":                    r.get("age"),
            "hba1c":                  r.get("hba1c"),
            "risk_level":             r.get("risk_level"),
            "prediction_probability": r.get("prediction_probability"),
            "confidence_score":       r.get("confidence_score"),
        }
        for r in records
    ]


