# MedIntel — Intelligent Public Health Ecosystem

# MedIntel — Intelligent Public Health Ecosystem

**MedIntel** is an AI-driven public health chatbot and dashboard for disease awareness, outbreak prediction, and offline health record management. 

This repository contains both the **FastAPI Backend** and the **React Dashboard** (Frontend).

## 🚀 Architecture

1. **Frontend**: React + Vite (located in `react-dashboard/`)
2. **Backend**: Python + FastAPI (located in the root `/app` folder)

*Note: The FastAPI backend is configured to statically serve the built React application at the `/` route.*

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18+ recommended)
- **Python** (v3.9+ recommended)

---

## 💻 How to Run the Project (Development Mode)

To run the full stack locally for development, you need to open **two terminal windows**: one for the backend and one for the frontend.

### Terminal 1: Start the FastAPI Backend

1. Open a terminal in the root directory (`medintel/`).
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```
The backend API is now running at `http://127.0.0.1:8000`. You can view the API documentation at `http://127.0.0.1:8000/docs`.

### Terminal 2: Start the React Frontend

1. Open a second terminal and navigate to the `react-dashboard/` folder:
   ```bash
   cd react-dashboard
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
The frontend is now running at `http://localhost:5173`. Open this URL in your browser to interact with the MedIntel dashboard!

---

## 🚢 How to Build for Production

If you want to build the app so that FastAPI serves the frontend (acting as a single application), follow these steps:

1. Build the React app:
   ```bash
   cd react-dashboard
   npm run build
   ```
   *This compiles the React code and outputs it into the `medintel/frontend/` folder.*

2. Start the FastAPI server (from the root directory):
   ```bash
   uvicorn app.main:app --reload
   ```

3. Open your browser and navigate to `http://127.0.0.1:8000`. 
FastAPI will now serve the compiled React dashboard directly!

---

## 📂 Modules Overview

- **AI Assistant (`/dashboard/assistant`)**: Chat interface with Emergency Intent Detection, Voice-to-Text simulation, and Language Selection.
- **Knowledge Base (`/dashboard/rag`)**: RAG integration querying FAISS/local DB, featuring OCR document upload simulation.
- **Outbreak Engine (`/dashboard/outbreak`)**: Interactive heatmaps and risk prediction models based on LSTM/XGBoost.
- **Worker Portal (`/dashboard/worker`)**: Offline-first form entry for health workers in remote areas.
- **Insurance Agent (`/dashboard/insurance`)**: Parses medical bills and policy PDFs to calculate coverage and deductibles.
