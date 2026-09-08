"""
Centralized application configuration.
Loaded from environment variables / .env file via pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    app_name: str = "MedIntel"
    env: str = "development"
    debug: bool = True

    # ── AI Provider Configuration ───────────────────────────────────────────
    ai_provider: str = "groq"

    # Groq Cloud API
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # Legacy / optional Google Gemini (kept for backward compatibility)
    google_api_key: str = ""

    # Legacy LLM settings (kept for backward compatibility)
    llm_provider: str = "groq"
    llm_model_path: str = "./models/llama-3-8b-instruct.gguf"
    llm_api_base: str = ""

    # ── Healthcare RAG System ───────────────────────────────────────────────
    vector_db_path: str = "./data/vector_store"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Database ────────────────────────────────────────────────────────────
    local_db_url: str = "sqlite:///./data/local_db/health_worker.db"

    # ── Security ────────────────────────────────────────────────────────────
    secret_key: str = "change-me-in-production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
