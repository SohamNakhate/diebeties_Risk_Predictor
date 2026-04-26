# Diabetes Risk Predictor

An advanced, AI-powered web application designed to predict the risk of diabetes based on clinical parameters. The system utilizes machine learning models to provide high-accuracy risk assessments and personalized lifestyle recommendations.

## 🚀 Features

- **AI Risk Assessment**: Uses a trained machine learning model (XGBoost) to evaluate diabetes risk.
- **Clinical Analytics Dashboard**: A dedicated dashboard featuring clinical-grade visualisations (Radar, Scatter, Gauges, Bar charts) built with Chart.js to explain risk factors comprehensively.
- **Premium UI**: Modern, glassmorphism-inspired "bento grid" design with support for both Light and Dark modes.
- **Dynamic Recommendations**: Provides tailored lifestyle advice based on predicted risk levels.
- **FastAPI Backend**: High-performance asynchronous API for seamless inference.
- **Responsive Layout**: Optimized for both desktop and mobile viewing with zero layout shift.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (Advanced animations & Mesh backgrounds), Chart.js (Data Visualizations).
- **Backend**: FastAPI (Python), Static file mounting for frontend deployment.
- **Machine Learning**: Scikit-learn, XGBoost, Joblib for model persistence.
- **Data**: Analysis based on the Pima Indians Diabetes Dataset.

## ⚙️ Setup & Installation

1. **Create Virtual Environment**:
   First, create a `.venv` directory for your project:
   ```powershell
   python -m venv .venv
   ```

2. **Install Dependencies**:
   You can install the dependencies directly using the environment's pip:
   ```powershell
   .\.venv\Scripts\pip install -r backend/requirements.txt
   ```

3. **Run the Project**:
   From the project root directory, start the server:
   ```powershell
   .\.venv\Scripts\python -m uvicorn app:app --reload
   ```

This will start the backend server at `http://localhost:8000` and automatically serve the frontend.

## 🧠 Model & Clinical Parameters
The analysis leverages both ML probabilities and strict clinical thresholds (ADA/WHO guidelines) across **10 clinical features**:
- Pregnancies
- Fasting Glucose Level (mg/dL)
- Blood Pressure (mmHg)
- Skin Thickness (mm)
- Insulin Level (IU/mL)
- BMI
- Diabetes Pedigree Function
- Age
- **HbA1c Level (%)** 
- **BMI Category** 

## 🤖 Model Export & Usage

The core Machine Learning models are generated via a Jupyter Notebook and exported for backend use.

1. **Training & Exporting:**
   - Open `VI_Project_model_2.ipynb` in your preferred Jupyter environment.
   - Run all cells to train the XGBoost classifier and fit the standard scaler.
   - The notebook automatically serializes the trained artifacts (`model.joblib` and `scaler.joblib`) into the `backend/models/` directory using `joblib`.
2. **Backend Integration:**
   - The FastAPI application (`backend/app.py`) loads these `.joblib` files into memory on startup.
   - When a prediction is requested via the API, the backend standardizes the incoming JSON payload using the `scaler`, and feeds it to the `model` to return the diabetes probability percentage.

*(Note: The exported `.joblib` models are actively tracked in this repository to ensure the backend is fully functional immediately after cloning.)*

---
*Created for advanced health diagnostics and visual analytics.*
