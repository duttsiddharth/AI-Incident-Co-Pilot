from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import json
import asyncio
import random

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="AI Incident Co-Pilot Enterprise", version="2.0.0")
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
        except Exception as e:
            logger.error(f"MongoDB failed: {e}")
    return db

# In-memory fallback
in_memory_incidents: Dict[str, dict] = {}

# SLA Configuration
SLA_TARGETS = {"P1": 60, "P2": 240, "P3": 1440}

# Simulation state
simulation_running = False
simulation_task = None
active_connections: List[WebSocket] = []

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

# Helper functions
def check_guardrails(text: str) -> tuple:
    if len(text) > 10000:
        return False, "Input too long"
    bad = ["ignore previous", "ignore all", "system prompt:", "you are now"]
    for p in bad:
        if p in text.lower():
            return False, "Invalid input"
    return True, "OK"

def extract_key_signals(ticket: str, priority: str) -> List[str]:
    signals = []
    t = ticket.lower()
    if "100+" in ticket or "100 users" in t:
        signals.append("100+ users → Critical")
    elif "50+" in ticket:
        signals.append("50+ users → High impact")
    if "sip 408" in t:
        signals.append("SIP 408 → Network issue")
    if "one-way audio" in t:
        signals.append("One-way audio → NAT/RTP")
    if "queue" in t:
        signals.append("Queue issue → Routing")
    if "cpu" in t and ("95" in ticket or "high" in t):
        signals.append("High CPU → Resource issue")
    signals.append(f"{priority} → SLA: {SLA_TARGETS.get(priority, 1440)} min")
    return signals[:5]

def get_confidence_band(score: int) -> str:
    if score >= 80: return "HIGH"
    if score >= 60: return "MEDIUM"
    return "LOW"

def calculate_sla_status(inc: dict) -> dict:
    created = inc.get('created_at')
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
    
    if inc.get('status') == 'RESOLVED':
        inc['sla_remaining_minutes'] = None
        resolved = inc.get('resolved_at')
        if isinstance(resolved, str):
            resolved = datetime.fromisoformat(resolved.replace('Z', '+00:00'))
        elapsed = (resolved - created).total_seconds() / 60 if resolved else 0
    else:
        elapsed = (datetime.now(timezone.utc) - created).total_seconds() / 60
        remaining = inc.get('sla_target_minutes', 1440) - elapsed
        inc['sla_remaining_minutes'] = max(0, int(remaining))
    
    inc['sla_breached'] = elapsed > inc.get('sla_target_minutes', 1440)
    return inc

async def broadcast(data: dict):
    for conn in active_connections:
        try:
            await conn.send_json(data)
        except:
            pass

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI Incident Co-Pilot Enterprise", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "db_connected": get_db() is not None, "simulation_running": simulation_running}

@api_router.post("/analyze", response_model=Incident)
async def analyze_ticket(input: TicketInput):
    valid, msg = check_guardrails(input.ticket)
    if not valid:
        raise HTTPException(400, msg)
    
    logger.info(f"Analyzing: {input.ticket[:80]}...")
    
    try:
        from openai import OpenAI
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(500, "OPENAI_API_KEY not set")
        
        client = OpenAI(api_key=api_key)
        
        prompt = """Analyze this IT incident ticket. Respond in JSON:
{
    "summary": "1-2 sentence summary",
    "priority": "P1, P2, or P3",
    "root_cause": "Most likely cause",
    "resolution_steps": "Step-by-step fix",
    "bridge_update": "P1 communication or N/A",
    "confidence_score": 0-100
}
P1=Critical outage (100+ users), P2=Degraded (10-100), P3=Minor (<10)"""

        # Retry logic
        for attempt in range(3):
            try:
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": input.ticket}
                    ],
                    temperature=0.3
                )
                response = resp.choices[0].message.content
                break
            except Exception as e:
                if attempt == 2:
                    raise e
                await asyncio.sleep(1)
        
        # Parse JSON
        try:
            text = response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            data = json.loads(text.strip())
        except:
            data = {"summary": response[:200], "priority": "P3", "root_cause": "See summary", 
                    "resolution_steps": response, "bridge_update": "N/A", "confidence_score": 50}
        
        def norm(v):
            return "\n".join(v) if isinstance(v, list) else str(v) if v else ""
        
        priority = data.get("priority", "P3")
        confidence = int(data.get("confidence_score", 50))
        
        incident = Incident(
            ticket=input.ticket,
            summary=norm(data.get("summary")),
            priority=priority,
            root_cause=norm(data.get("root_cause")),
            resolution_steps=norm(data.get("resolution_steps")),
            bridge_update=norm(data.get("bridge_update", "N/A")),
            confidence_score=confidence,
            confidence_band=get_confidence_band(confidence),
            needs_human_review=confidence < 80,
            key_signals=extract_key_signals(input.ticket, priority),
            sla_target_minutes=SLA_TARGETS.get(priority, 1440)
        )
        
        doc = incident.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        database = get_db()
        if database:
            await database.incidents.insert_one(doc)
        else:
            in_memory_incidents[incident.id] = doc
        
        await broadcast({"type": "incident", "data": doc})
        logger.info(f"Done: {incident.id} - {priority}")
        return incident
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@api_router.get("/incidents")
async def get_incidents(limit: int = 50, status: Optional[str] = None):
    database = get_db()
    if database:
        query = {"status": status} if status else {}
        incidents = await database.incidents.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    else:
        incidents = list(in_memory_incidents.values())[-limit:]
        if status:
            incidents = [i for i in incidents if i.get('status') == status]
    return [calculate_sla_status(i) for i in incidents]

@api_router.get("/incidents/{id}")
async def get_incident(id: str):
    database = get_db()
    inc = await database.incidents.find_one({"id": id}, {"_id": 0}) if database else in_memory_incidents.get(id)
    if not inc:
        raise HTTPException(404, "Not found")
    return calculate_sla_status(inc)

@api_router.patch("/incidents/{id}")
async def update_incident(id: str, update: IncidentUpdate):
    database = get_db()
    data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.status:
        data['status'] = update.status
        if update.status == "RESOLVED":
            data['resolved_at'] = datetime.now(timezone.utc).isoformat()
    if update.summary:
        data['summary'] = update.summary
    if update.root_cause:
        data['root_cause'] = update.root_cause
    if update.resolution_steps:
        data['resolution_steps'] = update.resolution_steps
    
    if database:
        result = await database.incidents.update_one({"id": id}, {"$set": data})
        if result.modified_count == 0:
            raise HTTPException(404, "Not found")
        inc = await database.incidents.find_one({"id": id}, {"_id": 0})
    else:
        if id not in in_memory_incidents:
            raise HTTPException(404, "Not found")
        in_memory_incidents[id].update(data)
        inc = in_memory_incidents[id]
    
    await broadcast({"type": "update", "data": inc})
    return calculate_sla_status(inc)

@api_router.get("/sla-dashboard", response_model=SLADashboard)
async def get_dashboard():
    database = get_db()
    incidents = await database.incidents.find({}, {"_id": 0}).to_list(1000) if database else list(in_memory_incidents.values())
    
    if not incidents:
        return SLADashboard(total_incidents=0, active_incidents=0, resolved_incidents=0, 
                           breached_incidents=0, breach_percentage=0, avg_resolution_minutes=0,
                           priority_breakdown={"P1": 0, "P2": 0, "P3": 0},
                           status_breakdown={"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0})
    
    active = resolved = breached = total_res_time = res_count = 0
    priority_breakdown = {"P1": 0, "P2": 0, "P3": 0}
    status_breakdown = {"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
    
    for inc in incidents:
        inc = calculate_sla_status(inc)
        status = inc.get('status', 'OPEN')
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
        priority_breakdown[inc.get('priority', 'P3')] = priority_breakdown.get(inc.get('priority', 'P3'), 0) + 1
        
        if status == 'RESOLVED':
            resolved += 1
            created = inc.get('created_at')
            resolved_at = inc.get('resolved_at')
            if created and resolved_at:
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                if isinstance(resolved_at, str):
                    resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
                total_res_time += (resolved_at - created).total_seconds() / 60
                res_count += 1
        else:
            active += 1
        
        if inc.get('sla_breached'):
            breached += 1
    
    total = len(incidents)
    return SLADashboard(
        total_incidents=total, active_incidents=active, resolved_incidents=resolved,
        breached_incidents=breached, breach_percentage=round(breached/total*100, 1) if total else 0,
        avg_resolution_minutes=round(total_res_time/res_count, 1) if res_count else 0,
        priority_breakdown=priority_breakdown, status_breakdown=status_breakdown
    )

# Simulation
TEMPLATES = [
    "INCIDENT: SIP Registration Failure\nIMPACT: 30+ users\nSYMPTOMS: SIP 408 timeout",
    "INCIDENT: One-way audio\nIMPACT: 20+ users\nSYMPTOMS: Customer can hear, agent cannot",
    "INCIDENT: Queue Issue\nIMPACT: 100+ calls stuck\nSYMPTOMS: Agents ready but no calls",
    "INCIDENT: High CPU on gateway\nIMPACT: Call drops\nSYMPTOMS: CPU at 95%",
    "INCIDENT: DNS failure\nIMPACT: New registrations failing\nSYMPTOMS: DNS timeout"
]

@api_router.post("/simulate/start")
async def start_sim():
    global simulation_running, simulation_task
    if simulation_running:
        return {"status": "already_running"}
    simulation_running = True
    simulation_task = asyncio.create_task(run_sim())
    return {"status": "started"}

@api_router.post("/simulate/stop")
async def stop_sim():
    global simulation_running, simulation_task
    simulation_running = False
    if simulation_task:
        simulation_task.cancel()
    return {"status": "stopped"}

@api_router.get("/simulate/status")
async def sim_status():
    return {"running": simulation_running}

async def run_sim():
    global simulation_running
    while simulation_running:
        try:
            await asyncio.sleep(random.randint(15, 45))
            if not simulation_running:
                break
            await analyze_ticket(TicketInput(ticket=random.choice(TEMPLATES)))
            logger.info("Simulated incident created")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Sim error: {e}")
            await asyncio.sleep(5)

@app.websocket("/ws/incidents")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    active_connections.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(ws)

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    logger.info("Starting AI Incident Co-Pilot Enterprise v2.0 (Lite)...")

@app.on_event("shutdown")
async def shutdown():
    global simulation_running
    simulation_running = False
