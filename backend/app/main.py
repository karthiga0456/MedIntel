"""
MedIntel — Intelligent Public Health Ecosystem
FastAPI application entrypoint.

Wires up the 4 core modules:
  1. AI Medical Knowledge Assistant  -> /api/v1/assistant
  2. Healthcare RAG System           -> /api/v1/rag
  3. Outbreak Prediction Engine      -> /api/v1/outbreak
  4. Health Worker Portal            -> /api/v1/worker
"""
import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.core.logging import get_logger
from app.db.session import init_db
from app.modules.knowledge_assistant.router import router as assistant_router
from app.modules.healthcare_rag.router import router as rag_router
from app.modules.outbreak_prediction.router import router as outbreak_router
from app.modules.health_worker_portal.router import router as worker_router
from app.modules.auth.router import router as auth_router
from app.modules.dashboard_analytics.router import router as analytics_router
from app.modules.insurance_parser.router import router as insurance_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / shutdown lifecycle handler.
    Runs once when the server starts; ensures all required directories and
    database tables exist before the first request is served.
    """
    # ── Startup ─────────────────────────────────────────────────────────────
    logger.info("MedIntel starting up — environment: %s", settings.env)

    # Ensure data directories exist (SQLite and FAISS need them on disk)
    pathlib.Path("./data/local_db").mkdir(parents=True, exist_ok=True)
    pathlib.Path("./data/vector_store").mkdir(parents=True, exist_ok=True)
    pathlib.Path("./data/models").mkdir(parents=True, exist_ok=True)

    # Create SQLite tables for the Health Worker Portal
    init_db()
    logger.info("Database initialised (SQLite tables ready).")

    yield  # ── Server is running ────────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("MedIntel shutting down.")


app = FastAPI(
    title=settings.app_name,
    description="AI-Driven Public Health Chatbot for Disease Awareness",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — open for now during dev; tighten before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(assistant_router, prefix="/api/v1/assistant", tags=["AI Medical Knowledge Assistant"])
app.include_router(rag_router,       prefix="/api/v1/rag",       tags=["Healthcare RAG System"])
app.include_router(outbreak_router,  prefix="/api/v1/outbreak",  tags=["Outbreak Prediction Engine"])
app.include_router(worker_router,    prefix="/api/v1/worker",    tags=["Health Worker Portal"])
app.include_router(auth_router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Dashboard Analytics"])
app.include_router(insurance_router, prefix="/api/v1/insurance", tags=["Insurance Parsing"])

# ── Health check (must be registered BEFORE the static / catch-all routes) ───
@app.get("/health", tags=["Health Check"])
def health():
    """Simple liveness probe — used by tests and monitoring."""
    return {"status": "healthy", "app": settings.app_name, "env": settings.env}


# ── Static frontend files (built React app) ───────────────────────────────────
app.mount("/static", StaticFiles(directory="frontend"), name="static")


# ── SPA catch-all (serves index.html for client-side routing) ─────────────────
@app.get("/{full_path:path}", tags=["Frontend"])
def serve_spa(full_path: str):
    """
    Catch-all that returns the React SPA shell for any non-API path.
    API routes that reach here are treated as 404 (should never happen,
    because /api routes are matched by the routers above first).
    """
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    return FileResponse("frontend/index.html")
