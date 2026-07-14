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

    # Module 1: Knowledge Assistant
    llm_provider: str = "llama3"
    llm_model_path: str = "./models/llama-3-8b-instruct.gguf"
    llm_api_base: str = ""

    # Module 2: Healthcare RAG
    vector_db_path: str = "./data/vector_store"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Module 3: Outbreak Prediction
    outbreak_model_path: str = "./data/models/outbreak_lstm.h5"

    # Module 4: Health Worker Portal
    local_db_url: str = "sqlite:///./data/local_db/health_worker.db"

    # Security
    secret_key: str = "change-me-in-production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
