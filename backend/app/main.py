"""
MedIntel — Full-Scale Intelligent Public Health Ecosystem
FastAPI application entrypoint.
"""
import pathlib
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.core.logging import get_logger
from app.db.session import init_db

from app.modules.knowledge_assistant.router import router as assistant_router
from app.modules.healthcare_rag.router import router as rag_router
from app.modules.auth.router import router as auth_router
from app.modules.dashboard_analytics.router import router as analytics_router
from app.modules.insurance_parser.router import router as insurance_router
from app.modules.patients.router import router as patients_router
from app.modules.sync.router import router as sync_router
from app.modules.medicines.router import router as medicines_router
from app.modules.emergency.router import router as emergency_router
from app.modules.notifications.router import router as notifications_router
from app.modules.system.router import router as system_router
from app.modules.hospitals.router import router as hospitals_router


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / shutdown lifecycle handler.
    Ensures all required storage directories and database tables exist.
    """
    logger.info("MedIntel starting up — environment: %s", settings.env)

    # Ensure required data directories exist safely (Vercel is read-only except for /tmp)
    data_dir = "/tmp/data" if os.environ.get("VERCEL") else "./data"
    for path_str in [f"{data_dir}/local_db", f"{data_dir}/vector_store", f"{data_dir}/models"]:
        try:
            pathlib.Path(path_str).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create directory {path_str}: {e}")

    try:
        pathlib.Path("./frontend").mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    # Initialize all database tables
    try:
        init_db()
        logger.info("Database initialised ready.")
    except Exception as e:
        logger.error(f"Database initialization warning: {e}")

    yield

    logger.info("MedIntel shutting down.")


app = FastAPI(
    title=settings.app_name,
    description="AI-Driven Public Health Ecosystem for Disease Awareness, Outbreak Prediction, and Field Healthcare",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware - allows localhost and all deployed HTTPS domains (e.g. Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Centralized error handler to sanitize errors
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
            }
        },
    )


# ── Register all API routers ───────────────────────────────────────────────────
app.include_router(assistant_router,     prefix="/api/v1/assistant",     tags=["AI Medical Knowledge Assistant"])
app.include_router(rag_router,           prefix="/api/v1/rag",           tags=["Healthcare RAG System"])
app.include_router(auth_router,          prefix="/api/v1/auth",          tags=["Authentication & RBAC"])
app.include_router(patients_router,      prefix="/api/v1/patients",      tags=["Patient Management"])
app.include_router(sync_router,          prefix="/api/v1/sync",          tags=["Offline Synchronization Engine"])
app.include_router(medicines_router,     prefix="/api/v1/medicines",     tags=["Medicines & Prescriptions"])
app.include_router(hospitals_router,     prefix="/api/v1/hospitals",     tags=["Nearby Hospitals"])
app.include_router(insurance_router,     prefix="/api/v1/insurance",     tags=["Insurance Claim Intelligence"])
app.include_router(emergency_router,     prefix="/api/v1/emergency",     tags=["Emergency Triage System"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notification Center"])
app.include_router(analytics_router,     prefix="/api/v1/analytics",     tags=["Reports & Analytics"])
app.include_router(system_router,        prefix="/api",                  tags=["System Health & Observability"])


# Backward-compatible liveness probe
@app.get("/health", tags=["Health Check"])
@app.get("/api/health", tags=["Health Check"])
def health():
    return {"status": "healthy", "app": settings.app_name, "env": settings.env}


# Static frontend mounting (compiled React SPA)
frontend_dir = pathlib.Path("frontend")
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory="frontend", check_dir=False), name="static")


# SPA catch-all (serves index.html for client-side routing)
@app.get("/{full_path:path}", tags=["Frontend"])
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_file = pathlib.Path("frontend/index.html")
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        status_code=200,
        content={"message": "MedIntel Backend API running. Build frontend with 'npm run build' to serve UI statically."},
    )

