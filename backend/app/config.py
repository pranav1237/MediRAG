import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "MediRAG API"
    VERSION: str = "v1.0 (MVP)"
    API_V1_STR: str = "/api/v1"
    
    # Security
    JWT_SECRET: str = "supersecretclinicalkeychangeinproduction"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./medirag.db"
    
    # Vector DB
    QDRANT_PATH: str = "./qdrant_db"
    QDRANT_COLLECTION: str = "medical_chunks"
    
    # AI Services
    GEMINI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-004"
    LLM_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
