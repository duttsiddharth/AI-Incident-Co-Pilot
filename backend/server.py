from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import asyncio

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(ROOT_DIR / 'logs' / 'app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AI Incident Co-Pilot", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize RAG service
from rag_service import RAGService
rag_service = RAGService()

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

class AnalysisLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_input: str
    gpt_response: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Incident Co-Pilot API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "rag_loaded": rag_service.is_loaded}

@api_router.post("/analyze", response_model=AnalysisResult)
async def analyze_ticket(input: TicketInput):
    """Analyze an IT incident ticket using AI and RAG"""
    logger.info(f"Received ticket for analysis: {input.ticket[:100]}...")
    
    log_entry = AnalysisLog(ticket_input=input.ticket)
    
    try:
        # Get relevant context from RAG
        rag_context = await asyncio.to_thread(
            rag_service.get_relevant_context, 
            input.ticket
        )
        logger.info(f"RAG context retrieved: {len(rag_context)} chars")
        
        # Call LLM for analysis
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        system_prompt = """You are an expert IT incident analyst for Unified Communications (UC) and Contact Center (CC) infrastructure.

Analyze the incident ticket and provide a structured response in STRICT JSON format.

Your response MUST be valid JSON with these exact fields:
{
    "summary": "Brief 1-2 sentence summary of the incident",
    "priority": "P1, P2, or P3 based on severity (P1=Critical/Service Down, P2=High/Degraded, P3=Medium/Minor)",
    "root_cause": "Most likely root cause based on symptoms described",
    "resolution_steps": "Step-by-step resolution actions based on runbook knowledge",
    "bridge_update": "Professional bridge communication update for stakeholders (only for P1 incidents, otherwise 'N/A')",
    "confidence_score": 0-100 integer indicating your confidence in the analysis,
    "needs_human_review": true/false based on complexity and confidence
}

Rules:
- P1: Complete service outage, 100+ users affected, revenue impact
- P2: Partial outage, degraded service, 10-100 users affected
- P3: Minor issue, workaround available, <10 users affected
- Set needs_human_review to true if confidence_score < 80 or if the issue is ambiguous
- Bridge updates should be concise, professional, and include: Issue Summary, Impact, Current Status, Next Steps, ETA if known"""

        user_prompt = f"""Analyze this IT incident ticket:

TICKET:
{input.ticket}

RELEVANT RUNBOOK CONTEXT:
{rag_context}

Provide your analysis in the exact JSON format specified. Ensure resolution_steps are based on the runbook context when applicable."""

        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        log_entry.gpt_response = response
        logger.info(f"LLM response received: {response[:200]}...")
        
        # Parse JSON response
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            analysis_data = json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            # Fallback parsing
            analysis_data = {
                "summary": "Unable to parse structured response",
                "priority": "P3",
                "root_cause": "Analysis parsing error - please review manually",
                "resolution_steps": response,
                "bridge_update": "N/A",
                "confidence_score": 30,
                "needs_human_review": True
            }
        
        # Validate and normalize data
        confidence = int(analysis_data.get("confidence_score", 50))
        needs_review = analysis_data.get("needs_human_review", confidence < 80)
        
        # Handle cases where LLM returns lists instead of strings
        def normalize_field(field_value, default=""):
            if isinstance(field_value, list):
                return "\n".join(str(item) for item in field_value)
            return str(field_value) if field_value else default
        
        # Create result
        result = AnalysisResult(
            ticket=input.ticket,
            summary=normalize_field(analysis_data.get("summary"), "Analysis pending"),
            priority=analysis_data.get("priority", "P3"),
            root_cause=normalize_field(analysis_data.get("root_cause"), "Unable to determine"),
            resolution_steps=normalize_field(analysis_data.get("resolution_steps"), "Manual review required"),
            bridge_update=normalize_field(analysis_data.get("bridge_update"), "N/A"),
            confidence_score=confidence,
            needs_human_review=needs_review
        )
        
        # Store analysis in database
        doc = result.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.analyses.insert_one(doc)
        
        # Store log
        log_doc = log_entry.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.analysis_logs.insert_one(log_doc)
        
        logger.info(f"Analysis complete: Priority={result.priority}, Confidence={result.confidence_score}")
        return result
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        log_entry.error = str(e)
        log_doc = log_entry.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.analysis_logs.insert_one(log_doc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/analyses", response_model=List[AnalysisResult])
async def get_analyses(limit: int = 20):
    """Get recent analyses"""
    analyses = await db.analyses.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for analysis in analyses:
        if isinstance(analysis.get('timestamp'), str):
            analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
    
    return analyses

@api_router.get("/runbooks")
async def list_runbooks():
    """List available runbooks"""
    runbooks_dir = ROOT_DIR / 'runbooks'
    runbooks = []
    if runbooks_dir.exists():
        for f in runbooks_dir.glob('*.md'):
            runbooks.append({
                "name": f.stem.replace('_', ' ').title(),
                "filename": f.name
            })
    return {"runbooks": runbooks}

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting AI Incident Co-Pilot...")
    # Load RAG index in background
    asyncio.create_task(asyncio.to_thread(rag_service.load_documents))

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
