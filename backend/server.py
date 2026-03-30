from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import asyncio
import random

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="AI Incident Co-Pilot Enterprise", version="2.0.0")

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
                logger.warning("MONGO_URL not set, using in-memory storage")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
    return db

# In-memory storage fallback
in_memory_incidents: Dict[str, dict] = {}

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

# SLA Configuration
SLA_TARGETS = {
    "P1": 60,    # 60 minutes
    "P2": 240,   # 4 hours
    "P3": 1440   # 24 hours
}

# WebSocket connections
active_connections: List[WebSocket] = []

# Simulation state
simulation_running = False
simulation_task = None

# Pydantic Models
class TicketInput(BaseModel):
    ticket: str

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_steps: Optional[str] = None

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket: str
    summary: str
    priority: str
    status: str = "OPEN"
    root_cause: str
    resolution_steps: str
    bridge_update: str
    confidence_score: int
    confidence_band: str = "MEDIUM"
    needs_human_review: bool
    key_signals: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    sla_target_minutes: int = 1440
    sla_breached: bool = False
    sla_remaining_minutes: Optional[int] = None

class SLADashboard(BaseModel):
    total_incidents: int
    active_incidents: int
    resolved_incidents: int
    breached_incidents: int
    breach_percentage: float
    avg_resolution_minutes: float
    priority_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]

# Guardrails
def check_guardrails(text: str) -> tuple[bool, str]:
    """Check for prompt injection and validate input"""
    # Length check
    if len(text) > 10000:
        return False, "Input too long (max 10000 characters)"
    
    # Prompt injection patterns
    injection_patterns = [
        "ignore previous instructions",
        "ignore all instructions",
        "disregard your instructions",
        "new instructions:",
        "system prompt:",
        "you are now",
        "pretend you are",
        "act as if"
    ]
    
    text_lower = text.lower()
    for pattern in injection_patterns:
        if pattern in text_lower:
            return False, f"Potential prompt injection detected"
    
    return True, "OK"

def extract_key_signals(ticket: str, priority: str) -> List[str]:
    """Extract key signals that influenced the analysis"""
    signals = []
    ticket_lower = ticket.lower()
    
    # User count signals
    if "100+" in ticket or "100 users" in ticket_lower:
        signals.append("100+ users affected → Critical impact")
    elif "50+" in ticket or "50 users" in ticket_lower:
        signals.append("50+ users affected → High impact")
    elif "multiple users" in ticket_lower:
        signals.append("Multiple users affected")
    
    # Technical signals
    if "sip 408" in ticket_lower:
        signals.append("SIP 408 timeout → Network/connectivity issue")
    if "sip 503" in ticket_lower:
        signals.append("SIP 503 → Service unavailable")
    if "one-way audio" in ticket_lower:
        signals.append("One-way audio → NAT/RTP issue")
    if "registration" in ticket_lower:
        signals.append("Registration failure → Auth/network issue")
    if "queue" in ticket_lower:
        signals.append("Queue issue → Routing/agent state problem")
    if "cpu" in ticket_lower and ("high" in ticket_lower or "95" in ticket or "90" in ticket):
        signals.append("High CPU → Resource exhaustion")
    if "firewall" in ticket_lower:
        signals.append("Firewall mentioned → Possible rule issue")
    
    # Priority reasoning
    if priority == "P1":
        signals.append(f"Priority P1 → SLA target: {SLA_TARGETS['P1']} minutes")
    elif priority == "P2":
        signals.append(f"Priority P2 → SLA target: {SLA_TARGETS['P2']} minutes")
    else:
        signals.append(f"Priority P3 → SLA target: {SLA_TARGETS['P3']} minutes")
    
    return signals[:5]  # Max 5 signals

def get_confidence_band(score: int) -> str:
    """Categorize confidence score into bands"""
    if score >= 80:
        return "HIGH"
    elif score >= 60:
        return "MEDIUM"
    else:
        return "LOW"

def calculate_sla_status(incident: dict) -> dict:
    """Calculate current SLA status for an incident"""
    created_at = incident.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    if incident.get('status') == 'RESOLVED':
        resolved_at = incident.get('resolved_at')
        if isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
        if resolved_at:
            elapsed = (resolved_at - created_at).total_seconds() / 60
        else:
            elapsed = 0
        incident['sla_remaining_minutes'] = None
    else:
        now = datetime.now(timezone.utc)
        elapsed = (now - created_at).total_seconds() / 60
        remaining = incident.get('sla_target_minutes', 1440) - elapsed
        incident['sla_remaining_minutes'] = max(0, int(remaining))
    
    incident['sla_breached'] = elapsed > incident.get('sla_target_minutes', 1440)
    return incident

# WebSocket Manager
async def broadcast_incident(incident: dict):
    """Broadcast incident to all connected WebSocket clients"""
    for connection in active_connections:
        try:
            await connection.send_json({"type": "incident", "data": incident})
        except:
            pass

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Incident Co-Pilot Enterprise API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    rag = get_rag_service()
    return {
        "status": "healthy",
        "rag_loaded": rag.is_loaded if rag else False,
        "db_connected": get_db() is not None,
        "simulation_running": simulation_running
    }

@api_router.post("/analyze", response_model=Incident)
async def analyze_ticket(input: TicketInput):
    """Analyze an IT incident ticket using AI and RAG"""
    
    # Guardrails check
    valid, message = check_guardrails(input.ticket)
    if not valid:
        raise HTTPException(status_code=400, detail=message)
    
    logger.info(f"Analyzing ticket: {input.ticket[:100]}...")
    
    try:
        # Get RAG context
        rag_context = "No runbook context available."
        rag = get_rag_service()
        if rag and rag.is_loaded:
            try:
                rag_context = rag.get_relevant_context(input.ticket)
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")
        
        # Call OpenAI with retry logic
        from openai import OpenAI
        
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        client = OpenAI(api_key=api_key)
        
        system_prompt = """You are an expert IT incident analyst. Analyze the incident and respond in JSON:
{
    "summary": "Brief 1-2 sentence summary",
    "priority": "P1, P2, or P3",
    "root_cause": "Most likely root cause",
    "resolution_steps": "Step-by-step resolution",
    "bridge_update": "Professional P1 update or N/A",
    "confidence_score": 0-100
}
P1=Critical (100+ users, revenue impact), P2=Degraded (10-100 users), P3=Minor (<10 users)"""

        user_prompt = f"Ticket:\n{input.ticket}\n\nContext:\n{rag_context}"

        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3
                )
                response = completion.choices[0].message.content
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                await asyncio.sleep(1)
        
        # Parse JSON
        try:
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            analysis = json.loads(json_str.strip())
        except:
            analysis = {
                "summary": response[:200],
                "priority": "P3",
                "root_cause": "See summary",
                "resolution_steps": response,
                "bridge_update": "N/A",
                "confidence_score": 50
            }
        
        # Normalize fields
        def norm(val):
            if isinstance(val, list):
                return "\n".join(str(v) for v in val)
            return str(val) if val else ""
        
        priority = analysis.get("priority", "P3")
        confidence = int(analysis.get("confidence_score", 50))
        
        # Create incident
        incident = Incident(
            ticket=input.ticket,
            summary=norm(analysis.get("summary", "")),
            priority=priority,
            status="OPEN",
            root_cause=norm(analysis.get("root_cause", "")),
            resolution_steps=norm(analysis.get("resolution_steps", "")),
            bridge_update=norm(analysis.get("bridge_update", "N/A")),
            confidence_score=confidence,
            confidence_band=get_confidence_band(confidence),
            needs_human_review=confidence < 80,
            key_signals=extract_key_signals(input.ticket, priority),
            sla_target_minutes=SLA_TARGETS.get(priority, 1440),
            sla_breached=False
        )
        
        # Save to storage
        doc = incident.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        database = get_db()
        if database:
            await database.incidents.insert_one(doc)
        else:
            in_memory_incidents[incident.id] = doc
        
        # Broadcast to WebSocket clients
        await broadcast_incident(doc)
        
        logger.info(f"Analysis complete: {incident.id} - {priority}")
        return incident
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(limit: int = 50, status: Optional[str] = None):
    """Get incidents with optional status filter"""
    database = get_db()
    
    if database:
        query = {}
        if status:
            query['status'] = status
        incidents = await database.incidents.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    else:
        incidents = list(in_memory_incidents.values())[-limit:]
        if status:
            incidents = [i for i in incidents if i.get('status') == status]
    
    # Calculate SLA status for each
    return [calculate_sla_status(i) for i in incidents]

@api_router.get("/incidents/{incident_id}")
async def get_incident(incident_id: str):
    """Get single incident by ID"""
    database = get_db()
    
    if database:
        incident = await database.incidents.find_one({"id": incident_id}, {"_id": 0})
    else:
        incident = in_memory_incidents.get(incident_id)
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return calculate_sla_status(incident)

@api_router.patch("/incidents/{incident_id}")
async def update_incident(incident_id: str, update: IncidentUpdate):
    """Update incident status or details"""
    database = get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.status:
        update_data['status'] = update.status
        if update.status == "RESOLVED":
            update_data['resolved_at'] = datetime.now(timezone.utc).isoformat()
    
    if update.summary:
        update_data['summary'] = update.summary
    if update.root_cause:
        update_data['root_cause'] = update.root_cause
    if update.resolution_steps:
        update_data['resolution_steps'] = update.resolution_steps
    
    if database:
        result = await database.incidents.update_one(
            {"id": incident_id},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        incident = await database.incidents.find_one({"id": incident_id}, {"_id": 0})
    else:
        if incident_id not in in_memory_incidents:
            raise HTTPException(status_code=404, detail="Incident not found")
        in_memory_incidents[incident_id].update(update_data)
        incident = in_memory_incidents[incident_id]
    
    # Broadcast update
    await broadcast_incident(incident)
    
    return calculate_sla_status(incident)

@api_router.get("/sla-dashboard", response_model=SLADashboard)
async def get_sla_dashboard():
    """Get SLA dashboard metrics"""
    database = get_db()
    
    if database:
        incidents = await database.incidents.find({}, {"_id": 0}).to_list(1000)
    else:
        incidents = list(in_memory_incidents.values())
    
    # Calculate metrics
    total = len(incidents)
    if total == 0:
        return SLADashboard(
            total_incidents=0,
            active_incidents=0,
            resolved_incidents=0,
            breached_incidents=0,
            breach_percentage=0.0,
            avg_resolution_minutes=0.0,
            priority_breakdown={"P1": 0, "P2": 0, "P3": 0},
            status_breakdown={"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
        )
    
    # Process each incident
    active = 0
    resolved = 0
    breached = 0
    total_resolution_time = 0
    resolved_count = 0
    priority_breakdown = {"P1": 0, "P2": 0, "P3": 0}
    status_breakdown = {"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
    
    for inc in incidents:
        inc = calculate_sla_status(inc)
        
        # Count by status
        status = inc.get('status', 'OPEN')
        if status in status_breakdown:
            status_breakdown[status] += 1
        
        if status == 'RESOLVED':
            resolved += 1
            # Calculate resolution time
            created = inc.get('created_at')
            resolved_at = inc.get('resolved_at')
            if created and resolved_at:
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                if isinstance(resolved_at, str):
                    resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
                resolution_time = (resolved_at - created).total_seconds() / 60
                total_resolution_time += resolution_time
                resolved_count += 1
        else:
            active += 1
        
        # Count breaches
        if inc.get('sla_breached'):
            breached += 1
        
        # Count by priority
        priority = inc.get('priority', 'P3')
        if priority in priority_breakdown:
            priority_breakdown[priority] += 1
    
    avg_resolution = total_resolution_time / resolved_count if resolved_count > 0 else 0
    breach_pct = (breached / total * 100) if total > 0 else 0
    
    return SLADashboard(
        total_incidents=total,
        active_incidents=active,
        resolved_incidents=resolved,
        breached_incidents=breached,
        breach_percentage=round(breach_pct, 1),
        avg_resolution_minutes=round(avg_resolution, 1),
        priority_breakdown=priority_breakdown,
        status_breakdown=status_breakdown
    )

# Simulation Templates
SIMULATION_TEMPLATES = [
    {
        "ticket": """INCIDENT: SIP Registration Failure
TIME: Just now
IMPACT: 30+ users unable to register phones
SYMPTOMS: SIP 408 timeout errors, phones showing "Registering"
USER REPORTS: "My phone won't connect"
BUSINESS IMPACT: Call center agents unable to take calls"""
    },
    {
        "ticket": """INCIDENT: One-way audio on calls
TIME: Started 15 minutes ago
IMPACT: 20+ users experiencing issue
SYMPTOMS: Customers can hear agents but agents cannot hear customers
USER REPORTS: "I can see the call connected but no audio"
ENVIRONMENT: CUCM to SBC trunk"""
    },
    {
        "ticket": """INCIDENT: Contact Center Queue Issue
TIME: Ongoing
IMPACT: 100+ calls stuck in queue
SYMPTOMS: Agents showing Ready but not receiving calls, skill group shows 0 available
USER REPORTS: "No calls coming through"
BUSINESS IMPACT: Critical SLA breach imminent"""
    },
    {
        "ticket": """INCIDENT: High CPU on voice gateway
TIME: Last 30 minutes
IMPACT: Intermittent call drops
SYMPTOMS: CPU at 95%, memory usage high, some calls failing
BUSINESS IMPACT: Customer complaints increasing"""
    },
    {
        "ticket": """INCIDENT: DNS resolution failure
TIME: Just detected
IMPACT: New phone registrations failing
SYMPTOMS: DNS lookups timing out, SRV records not resolving
USER REPORTS: "New phones won't connect"
BUSINESS IMPACT: Cannot onboard new agents"""
    }
]

@api_router.post("/simulate/start")
async def start_simulation():
    """Start incident simulation"""
    global simulation_running, simulation_task
    
    if simulation_running:
        return {"status": "already_running"}
    
    simulation_running = True
    simulation_task = asyncio.create_task(run_simulation())
    
    return {"status": "started"}

@api_router.post("/simulate/stop")
async def stop_simulation():
    """Stop incident simulation"""
    global simulation_running, simulation_task
    
    simulation_running = False
    if simulation_task:
        simulation_task.cancel()
        simulation_task = None
    
    return {"status": "stopped"}

@api_router.get("/simulate/status")
async def simulation_status():
    """Get simulation status"""
    return {"running": simulation_running}

async def run_simulation():
    """Background task to generate simulated incidents"""
    global simulation_running
    
    while simulation_running:
        try:
            # Random delay between incidents
            delay = random.randint(10, 30)
            await asyncio.sleep(delay)
            
            if not simulation_running:
                break
            
            # Pick random template
            template = random.choice(SIMULATION_TEMPLATES)
            
            # Analyze the simulated ticket
            try:
                ticket_input = TicketInput(ticket=template["ticket"])
                await analyze_ticket(ticket_input)
                logger.info("Simulated incident created")
            except Exception as e:
                logger.error(f"Simulation analysis failed: {e}")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Simulation error: {e}")
            await asyncio.sleep(5)

# WebSocket endpoint
@app.websocket("/ws/incidents")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    logger.info("WebSocket client connected")
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info("WebSocket client disconnected")

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
    logger.info("Starting AI Incident Co-Pilot Enterprise v2.0...")
    try:
        get_db()
    except:
        pass

@app.on_event("shutdown")
async def shutdown():
    global simulation_running
    simulation_running = False
