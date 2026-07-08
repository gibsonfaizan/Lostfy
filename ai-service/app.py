import os
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

from config import settings
from services.description_service import description_service
from services.object_detection import object_detection_service
from services.image_similarity import image_similarity_service
from services.ocr_service import ocr_service
from services.blur_service import blur_service

app = FastAPI(
    title="LostFy AI Service",
    description="FastAPI endpoints for item auto-tagging, similarity vector indexing, and PII blurring.",
    version="1.0.0"
)

# Request & Response Schemas
class ProcessRequest(BaseModel):
    item_id: int
    image_paths: List[str] # relative paths (e.g. ["/uploads/abc.jpg"])

class ProcessResponse(BaseModel):
    item_id: int
    tags: List[str]
    ocr_text: str
    blurred_paths: List[str]

class MatchRequest(BaseModel):
    image_path: str
    top_k: Optional[int] = 5

class MatchItem(BaseModel):
    item_id: int
    score: float

class MatchResponse(BaseModel):
    matches: List[MatchItem]

class CompareTextRequest(BaseModel):
    text1: str
    text2: str

class CompareTextResponse(BaseModel):
    similarity: float

# Health Check
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "gpu_available": False, # Torch detection fallback
        "services": {
            "description": "mock_stub" if description_service.use_stub else "sentence_transformers",
            "yolo": "mock_stub" if object_detection_service.use_stub else "ultralytics",
            "clip": "mock_stub" if image_similarity_service.use_stub else "transformers",
            "ocr": "mock_stub" if ocr_service.use_stub else "easyocr",
            "blur": "mock_stub" if blur_service.use_stub else "opencv"
        }
    }

# Process Item Endpoint
@app.post("/api/process", response_model=ProcessResponse)
def process_item(request: ProcessRequest):
    """
    Unified object detection (YOLO), text OCR, vector registration, and file PII blurring.
    """
    accumulated_tags = []
    accumulated_ocr = []
    blurred_files = []

    for rel_path in request.image_paths:
        # Resolve path to global uploads directory
        clean_rel = rel_path.replace("/uploads/", "").replace("\\uploads\\", "")
        abs_path = os.path.join(settings.FRONTEND_UPLOADS_DIR, clean_rel)
        
        if not os.path.exists(abs_path):
            # Try resolver inside ai-service folder too for resilience
            abs_path = os.path.join(os.path.dirname(__file__), "..", "backend", "uploads", clean_rel)
            if not os.path.exists(abs_path):
                continue
        
        # 1. Object Detection (YOLO)
        tags = object_detection_service.detect_objects(abs_path)
        accumulated_tags.extend(tags)
        
        # 2. OCR Text Extraction
        text = ocr_service.extract_text(abs_path)
        if text:
            accumulated_ocr.append(text)
            
        # 3. Vector Registration in CLIP/FAISS
        image_similarity_service.register_item(request.item_id, abs_path)
        
        # 4. Blur Sensitive Data (overwrite file in place)
        blur_service.blur_sensitive_areas(abs_path)
        blurred_files.append(rel_path)

    # Clean up and deduplicate results
    unique_tags = list(set([t for t in accumulated_tags if t]))
    final_ocr = " | ".join(accumulated_ocr) if accumulated_ocr else ""

    return ProcessResponse(
        item_id=request.item_id,
        tags=unique_tags,
        ocr_text=final_ocr,
        blurred_paths=blurred_files
    )

# Match Image Endpoint
@app.post("/api/match", response_model=MatchResponse)
def match_image(request: MatchRequest):
    """
    Retrieves high-similarity candidate matches using CLIP features flat index.
    """
    clean_rel = request.image_path.replace("/uploads/", "").replace("\\uploads\\", "")
    abs_path = os.path.join(settings.FRONTEND_UPLOADS_DIR, clean_rel)
    
    if not os.path.exists(abs_path):
        abs_path = os.path.join(os.path.dirname(__file__), "..", "backend", "uploads", clean_rel)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Query image path not found")
            
    matches = image_similarity_service.get_matches(abs_path, top_k=request.top_k)
    return MatchResponse(matches=matches)

# Compare Text Descriptions
@app.post("/api/compare-text", response_model=CompareTextResponse)
def compare_text(request: CompareTextRequest):
    """
    Compares two descriptions (e.g. Lost item vs Found item details).
    """
    sim = description_service.get_similarity(request.text1, request.text2)
    return CompareTextResponse(similarity=sim)

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENV == "development"
    )
