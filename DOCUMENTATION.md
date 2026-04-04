# 📖 How This Project Works

This is a simple guide for our group project. 

---

## 👨‍💻 What is this project?
This app lets you enter health data (like glucose and weight) to see if someone is at risk for diabetes. It uses an AI model (the `model.joblib` file) to make a guess.

---

## 🚀 How to get it running
Follow these 3 easy steps:
1.  **Install tools**: Open your terminal and type `pip install -r backend/requirements.txt`
2.  **Start the app**: Type `python -m uvicorn backend.app:app --reload`
3.  **Open browser**: Go to this link: `http://127.0.0.1:8000`

---

## 🤖 How to update or export the model
If you want to change the AI model or fix it, just do this:
1.  Open the file called `backend/export_model.py`.
2.  Run the file by typing `python backend/export_model.py` in your terminal.
3.  It will automatically create a new `model.joblib` file.
4.  The website will now start using your new model immediately!

---

## 🚦 What the results mean
- **Low Risk**: The AI thinks you are safe.
- **Medium Risk**: The AI thinks you should be careful.
- **High Risk**: The AI thinks you should visit a doctor.

---

## 📁 Important Folders
- **`backend/`**: Where the AI and server live.
- **`frontend/`**: Where the website and design live.
- **`backend/models/`**: Where the actual AI "brain" is saved.
