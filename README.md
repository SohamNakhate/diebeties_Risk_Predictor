# 🧬 Diabetes Risk AI Predictor

A precise, high-performance web tool that uses **Machine Learning** to predict diabetes risk. This project is built for clinicians and individuals to quickly assess health markers and receive actionable medical feedback.

---

## 🎨 Risk Level Legend
Our model categorizes risk into three distinct levels:

| Risk Level | Color | Probability | What it means |
| :--- | :--- | :--- | :--- |
| 🟢 **Low Risk** | **Green** | **0% - 30%** | Health markers are within a safe range. Continue healthy habits. |
| 🟡 **Medium Risk** | **Yellow** | **31% - 60%** | Some indicators are elevated. Lifestyle changes are recommended. |
| 🔴 **High Risk** | **Red** | **61% - 100%** | Multiple high-risk markers found. Suggest consulting a doctor soon. |

---

## 🚀 How to Run (Quick Guide)

1.  **Install dependencies**:
    ```bash
    pip install -r backend/requirements.txt
    ```
2.  **Start the unified server**:
    ```bash
    python -m uvicorn backend.app:app --reload
    ```
3.  **Open the App**:
    Go to **`http://127.0.0.1:8000`** in your browser.

---

## ⚙️ Technical Features
- **Tuned Gradient Boosting Model**: 87.88% Accuracy on clinical data.
- **Advanced 11-Feature Analysis**: Calculates hidden health markers like "BMI-Glucose Ratio" behind the scenes.
- **Premium Dark UI**: Glassmorphism design with a dark-primary theme by default.
- **Interactive Results**: Dynamic lifestyle recommendations tailored to each risk level.

---

## 📂 Folders
- **`backend/`**: Contains the Python API and the Machine Learning model.
- **`frontend/`**: Contains the web design (HTML, CSS, JS).
- **`export_model.py`**: Use this script to regenerate or update the "AI brain" (`model.joblib`).

---

*Note: This is a demonstration tool for our group project.*
