import os
from pathlib import Path
from pydantic import BaseModel
from typing import List

if os.environ.get("VERCEL"):
    BASE_DIR = Path("/tmp")
    DATA_DIR = BASE_DIR / "data"
    REPORTS_DIR = BASE_DIR / "reports"
else:
    BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR = BASE_DIR / "data"
    REPORTS_DIR = BASE_DIR / "reports"

UPLOAD_DIR = DATA_DIR / "uploads"
SAMPLE_DIR = DATA_DIR / "samples"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "AI Data Analyst Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-ai-analyst")
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]
    
    # Storage
    UPLOAD_DIR: Path = UPLOAD_DIR
    SAMPLE_DIR: Path = SAMPLE_DIR
    REPORTS_DIR: Path = REPORTS_DIR
    MAX_UPLOAD_SIZE_MB: int = 100
    
    # Gemini API / LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash")
    
    # Execution Sandbox limits
    SANDBOX_TIMEOUT_SECONDS: int = 30
    MAX_ROWS_PREVIEW: int = 100
    MAX_ROWS_LLM_SUMMARY: int = 15

settings = Settings()
