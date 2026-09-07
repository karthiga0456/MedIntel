import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get("/health", tags=["System Observability"])
def get_health(db: Session = Depends(get_db)):
    """Liveness probe: verifies basic server and database responsiveness."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app": settings.app_name,
        "env": settings.env,
        "database": db_status,
    }


@router.get("/ready", tags=["System Observability"])
def get_readiness(db: Session = Depends(get_db)):
    """Readiness probe: checks subsystem availability (DB, AI, OCR, Vector DB, ML Models, Storage)."""
    # 1. Database
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    # 2. AI (Gemini)
    ai_status = "configured" if bool(settings.google_api_key) else "unconfigured (graceful fallback active)"

    # 3. Vector DB / FAISS directory
    faiss_dir = settings.vector_db_path
    faiss_status = "available" if os.path.exists(faiss_dir) else "initializing"

    # 4. Storage writable check
    storage_ok = True
    try:
        test_file = "./data/test_write.tmp"
        with open(test_file, "w") as f:
            f.write("ok")
        if os.path.exists(test_file):
            os.remove(test_file)
    except Exception:
        storage_ok = False

    # 5. ML Models
    lstm_exists = os.path.exists("./data/models/outbreak_lstm.keras")
    xgb_exists = os.path.exists("./data/models/outbreak_xgb.json")
    ml_status = "models_loaded" if (lstm_exists and xgb_exists) else "baseline_epidemiological_active"

    # 6. OCR (pytesseract)
    ocr_status = "available"
    try:
        import pytesseract
    except Exception:
        ocr_status = "unavailable"

    overall_status = "ready" if (db_ok and storage_ok) else "degraded"

    return {
        "status": overall_status,
        "services": {
            "database": "healthy" if db_ok else "unhealthy",
            "ai_gemini": ai_status,
            "vector_store": faiss_status,
            "ocr_engine": ocr_status,
            "ml_inference": ml_status,
            "storage": "writable" if storage_ok else "read_only",
        },
    }
