from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging (console only)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="AI Incident Co-Pilot", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# MongoDB connection (lazy load)
db = None

def get_db():
    global db
    if db is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get('MONGO_URL')
            if mongo_url:
                client = AsyncIOMotorClient(mongo_url)
                db = client[os.environ.get('DB_NAME', 'incident_copilot')]
                logger.info("MongoDB connected")
            else:
                logger.warning("MONGO_URL not set, database disabled")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
    return db

# RAG service (lazy load)
rag_service = None

def get_rag_service():
    global rag_service
    if rag_service is None:
        try:
            from rag_service import RAGService
            rag_service = RAGService()
            rag_service.load_documents()
        except Exception as e:
            logger.error(f"RAG service failed to load: {e}")
    return rag_service

# Pydantic Models
class TicketInput(BaseModel):
    ticket: str

class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket: str
    summary: str
    priority: str
    root_cause: str
    resolution_steps: str
    bridge_update: str
    confidence_score: int
    needs_human_review: bool
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Incident Co-Pilot API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    rag = get_rag_service()
    return {
        "status": "healthy", 
        "rag_loaded": rag.is_loaded if rag else False,
        "db_connected": get_db() is not None
    }

@api_router.post("/analyze", response_model=AnalysisResult)
async def analyze_ticket(input: TicketInput):
    """Analyze an IT incident ticket using AI and RAG"""
    logger.info(f"Received ticket for analysis: {input.ticket[:100]}...")
    
    try:
        # Get RAG context (optional)
        rag_context = "No runbook context available."
        rag = get_rag_service()
        if rag and rag.is_loaded:
            try:
                rag_context = rag.get_relevant_context(input.ticket)
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")
        
        # Call OpenAI
        from openai import OpenAI
        
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        client = OpenAI(api_key=api_key)
        
        system_prompt = """You are an expert IT incident analyst.
Analyze the incident ticket and respond in JSON format with these fields:
{
    "summary": "Brief 1-2 sentence summary",
    "priority": "P1, P2, or P3",
    "root_cause": "Most likely root cause",
    "resolution_steps": "Step-by-step resolution",
    "bridge_update": "Professional update for P1 incidents, or N/A",
    "confidence_score": 0-100,
    "needs_human_review": true/false
}
P1=Critical outage, P2=Degraded service, P3=Minor issue"""

        user_prompt = f"Analyze this ticket:\n\n{input.ticket}\n\nContext:\n{rag_context}"

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        
        response = completion.choices[0].message.content
        logger.info(f"LLM response received")
        
        # Parse JSON
        try:
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            analysis_data = json.loads(json_str.strip())
        except:
            analysis_data = {
                "summary": response[:200],
                "priority": "P3",
                "root_cause": "See summary",
                "resolution_steps": response,
                "bridge_update": "N/A",
                "confidence_score": 50,
                "needs_human_review": True
            }
        
        # Normalize fields
        def norm(val):
            if isinstance(val, list):
                return "\n".join(str(v) for v in val)
            return str(val) if val else ""
        
        result = AnalysisResult(
            ticket=input.ticket,
            summary=norm(analysis_data.get("summary", "")),
            priority=analysis_data.get("priority", "P3"),
            root_cause=norm(analysis_data.get("root_cause", "")),
            resolution_steps=norm(analysis_data.get("resolution_steps", "")),
            bridge_update=norm(analysis_data.get("bridge_update", "N/A")),
            confidence_score=int(analysis_data.get("confidence_score", 50)),
            needs_human_review=analysis_data.get("needs_human_review", True)
        )
        
        # Save to DB (optional)
        database = get_db()
        if database:
            try:
                doc = result.model_dump()
                doc['timestamp'] = doc['timestamp'].isoformat()
                await database.analyses.insert_one(doc)
            except Exception as e:
                logger.warning(f"DB save failed: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/analyses")
async def get_analyses(limit: int = 20):
    """Get recent analyses"""
    database = get_db()
    if not database:
        return []
    try:
        analyses = await database.analyses.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return analyses
    except:
        return []

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("Starting AI Incident Co-Pilot...")
    # Pre-warm services (optional, don't block startup)
    try:
        get_db()
    except:
        pass
