"""
MedIntel — Intelligent Public Health Ecosystem
FastAPI application entrypoint.

Wires up the 4 core modules:
  1. AI Medical Knowledge Assistant  -> /api/v1/assistant
  2. Healthcare RAG System           -> /api/v1/rag
  3. Outbreak Prediction Engine      -> /api/v1/outbreak
  4. Health Worker Portal            -> /api/v1/worker
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.modules.knowledge_assistant.router import router as assistant_router
from app.modules.healthcare_rag.router import router as rag_router
from app.modules.outbreak_prediction.router import router as outbreak_router
from app.modules.health_worker_portal.router import router as worker_router

app = FastAPI(
    title=settings.app_name,
    description="AI-Driven Public Health Chatbot for Disease Awareness",
    version="0.1.0",
)

# CORS - open for now during dev; tighten before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router, prefix="/api/v1/assistant", tags=["AI Medical Knowledge Assistant"])
app.include_router(rag_router, prefix="/api/v1/rag", tags=["Healthcare RAG System"])
app.include_router(outbreak_router, prefix="/api/v1/outbreak", tags=["Outbreak Prediction Engine"])
app.include_router(worker_router, prefix="/api/v1/worker", tags=["Health Worker Portal"])

app.mount("/static", StaticFiles(directory="frontend"), name="static")

from fastapi import HTTPException

@app.get("/{full_path:path}", tags=["Frontend"])
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    return FileResponse("frontend/index.html")


@app.get("/health", tags=["Health Check"])
def health():
    return {"status": "healthy"}
