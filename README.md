# MedIntel — Intelligent Public Health Ecosystem

AI-Driven Public Health Chatbot for Disease Awareness.
Project Work Phase – I | Dept. of CSE, Sri Krishna College of Technology

This is the **base project skeleton**: folder structure, configs, and stubbed
routers/services for all 4 major modules described in the proposal. Nothing is
wired to real models yet — every endpoint returns a clearly marked `[stub]`
response so the team can build out logic module-by-module without touching
the overall structure.

## Modules

| # | Module | Tech (per proposal) | Route prefix |
|---|--------|----------------------|---------------|
| 1 | AI Medical Knowledge Assistant | LangChain + Llama 3 (multilingual) | `/api/v1/assistant` |
| 2 | Healthcare RAG System | LangChain + FAISS + OCR (OCR/embeddings) | `/api/v1/rag` |
| 3 | Outbreak Prediction Engine | LSTM + XGBoost | `/api/v1/outbreak` |
| 4 | Health Worker Portal | SQLite / local DB (offline-first) | `/api/v1/worker` |

## Project structure

```
medintel/
├── app/
│   ├── main.py              # FastAPI app, mounts all 4 module routers
│   ├── config.py            # pydantic-settings, reads .env
│   ├── core/
│   │   └── logging.py       # shared logger
│   ├── db/
│   │   └── session.py       # SQLAlchemy engine/session (local DB)
│   └── modules/
│       ├── knowledge_assistant/    # Module 1
│       ├── healthcare_rag/         # Module 2
│       ├── outbreak_prediction/    # Module 3
│       └── health_worker_portal/   # Module 4
│           each module has: router.py, schemas.py, service.py (+models.py where needed)
├── data/
│   ├── vector_store/        # FAISS index lives here (offline mode)
│   └── local_db/            # SQLite file lives here (offline mode)
├── tests/
│   └── test_health.py       # smoke tests for app + all module pings
├── requirements.txt
├── .env.example
└── .gitignore
```

## Getting started

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in real values as modules are built

uvicorn app.main:app --reload
```

Visit `http://127.0.0.1:8000/docs` for interactive Swagger UI covering all
4 modules.

Run tests:

```bash
pytest
```

## Current status

- [x] Folder structure + configs
- [x] All 4 modules stubbed with working FastAPI routes, request/response schemas
- [x] Local/offline DB wiring (SQLite via SQLAlchemy) for the Health Worker Portal
- [x] Smoke tests confirming the app boots and every module responds
- [ ] Module 1: wire up real LangChain + Llama 3 pipeline + language detection/translation
- [ ] Module 2: OCR ingestion (pytesseract/pypdf) + FAISS indexing + RAG query chain
- [ ] Module 3: train & load LSTM (case forecasting) and XGBoost (risk classification) models
- [ ] Module 4: sync logic to push offline-logged records to a central server
- [ ] Auth / security layer
- [ ] WhatsApp integration mentioned in proposal (future module)

## Notes

- Each module is self-contained (`router.py` / `schemas.py` / `service.py`) so
  different team members can build out modules 1–4 in parallel without merge
  conflicts.
- `data/vector_store` and `data/local_db` are gitignored except for
  `.gitkeep`, since these hold generated/runtime data.
