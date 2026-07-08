import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENV: str = "development"
    
    # ML model check toggles
    FORCE_STUB: bool = False
    
    # Model checkpoints
    YOLO_MODEL_NAME: str = "yolov8n.pt"
    CLIP_MODEL_NAME: str = "openai/clip-vit-base-patch32"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # OCR settings
    OCR_LANGUAGES: list = ["en"]
    
    # Upload Directories
    FRONTEND_UPLOADS_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "backend", "uploads")
    )

    class Config:
        env_file = ".env"

# Load settings
try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback if pydantic_settings isn't installed yet
    class Settings:
        PORT = 8000
        HOST = "0.0.0.0"
        ENV = "development"
        FORCE_STUB = False
        YOLO_MODEL_NAME = "yolov8n.pt"
        CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
        SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
        OCR_LANGUAGES = ["en"]
        FRONTEND_UPLOADS_DIR = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "backend", "uploads")
        )

settings = Settings()
