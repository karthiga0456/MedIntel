import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.db.session import get_db
from app.core.ai_provider import ai_provider_service

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


@router.get("/health/ai", tags=["System Observability"])
def get_ai_health():
    """Returns AI provider configuration and readiness status without revealing sensitive secrets."""
    return ai_provider_service.get_provider_status()


@router.get("/ready", tags=["System Observability"])
def get_readiness(db: Session = Depends(get_db)):
    """Readiness probe: checks subsystem availability (DB, AI, OCR, Vector DB, Storage)."""
    # 1. Database
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    # 2. AI Provider Status
    ai_info = ai_provider_service.get_provider_status()

    # 3. Vector DB / FAISS directory
    faiss_dir = settings.vector_db_path
    faiss_status = "available" if os.path.exists(faiss_dir) else "initializing"

    # 4. Storage writable check
    storage_ok = True
    try:
        target_dir = "/tmp" if (os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV")) else "./data"
        os.makedirs(target_dir, exist_ok=True)
        test_file = os.path.join(target_dir, "test_write.tmp")
        with open(test_file, "w") as f:
            f.write("ok")
        if os.path.exists(test_file):
            os.remove(test_file)
    except Exception:
        storage_ok = False


    # 5. OCR (pytesseract)
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
            "ai_provider": ai_info.get("active_provider", settings.ai_provider),
            "ai_groq_status": ai_info.get("groq", "unknown"),
            "vector_store": faiss_status,
            "ocr_engine": ocr_status,
            "storage": "writable" if storage_ok else "read_only",
        },
    }

