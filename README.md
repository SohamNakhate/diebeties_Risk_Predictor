# Diabetes Risk Predictor

An advanced, AI-powered web application designed to predict the risk of diabetes based on clinical parameters. The system utilizes machine learning models to provide high-accuracy risk assessments and personalized lifestyle recommendations.

## 🚀 Features

- **AI Risk Assessment**: Uses a trained machine learning model (XGBoost) to evaluate diabetes risk.
- **Premium UI**: Modern, glassmorphism-inspired design with support for both Light and Dark modes.
- **Dynamic Recommendations**: Provides tailored lifestyle advice based on predicted risk levels.
- **FastAPI Backend**: High-performance asynchronous API for seamless inference.
- **Responsive Layout**: Optimized for both desktop and mobile viewing.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (Advanced animations & Mesh backgrounds).
- **Backend**: FastAPI (Python), Static file mounting for frontend deployment.
- **Machine Learning**: Scikit-learn, XGBoost, Joblib for model persistence.
- **Data**: Analysis based on the Pima Indians Diabetes Dataset.

## ⚙️ Setup & Installation

1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Run the Project**:
   From the project root directory, run:
   ```bash
   python -m uvicorn app:app --reload
   ```

This will start the backend server at `http://localhost:8000` and automatically serve the frontend.

## 🧠 Model Parameters
The analysis is now based on **10 clinical features** for higher accuracy:
- Pregnancies
- Glucose Level (mg/dL)
- Blood Pressure (mmHg)
- Skin Thickness (mm)
- Insulin Level (IU/mL)
- BMI
- Diabetes Pedigree Function
- Age
- **HbA1c Level (%)** (Recently added)
- **BMI Category** (Automated feature)

---
Created for health diagnostics.
