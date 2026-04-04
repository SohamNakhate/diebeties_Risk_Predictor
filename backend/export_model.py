"""
Export script — mirrors Mini_Project_VI.ipynb exactly.
Trains the Random Forest model on the PIMA dataset and saves it to models/model.joblib.
"""

import os
import openml
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
import joblib

# ── Step 1: Fetch dataset (same as notebook) ──────────────────────────────────
dataset_id = 43483
dataset = openml.datasets.get_dataset(dataset_id)
df, _, _, _ = dataset.get_data(dataset_format='dataframe')

# ── Step 2: Handle invalid zeros (same as notebook) ───────────────────────────
invalid_zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
for col in invalid_zero_cols:
    df[col] = df[col].replace(0, np.nan)
    df[col] = df[col].fillna(df[col].median())

# ── Step 3: Feature Engineering (same as notebook) ────────────────────────────
df['BMI_Glucose_Ratio'] = df['BMI'] / df['Glucose']
df['Age_Pregnancies_Interaction'] = df['Age'] * df['Pregnancies']
df['Insulin_Glucose_Ratio'] = df['Insulin'] / df['Glucose']

# ── Step 4: Split (same as notebook) ──────────────────────────────────────────
X = df.drop('Outcome', axis=1)
y = df['Outcome']

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.3,
    random_state=42,
    stratify=y
)

# ── Step 5: Scale (same as notebook) ──────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── Step 6: Train Tuned Gradient Boosting (highest accuracy) ───────────────────
gb_tuned = GradientBoostingClassifier(
    learning_rate=0.2,
    max_depth=7,
    min_samples_split=10,
    n_estimators=200,
    random_state=42
)
gb_tuned.fit(X_train_scaled, y_train)
print(f"Accuracy: {gb_tuned.score(X_test_scaled, y_test):.4f}")

# ── Step 7: Export ────────────────────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
joblib.dump(gb_tuned, "models/model.joblib")
joblib.dump(scaler,   "models/scaler.joblib")

print("Saved → models/model.joblib (Tuned GB)")
print("Saved → models/scaler.joblib")
print(f"Feature order: {list(X.columns)}")
