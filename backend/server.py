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

# Initialize Groq client
from groq import Groq
groq_client = None
groq_api_key = os.environ.get('GROQ_API_KEY')
if groq_api_key:
    try:
        groq_client = Groq(api_key=groq_api_key)
        logger.info("Groq client initialized")
    except Exception as e:
        logger.error(f"Groq init failed: {e}")

# Initialize lightweight BM25 RAG
from rag_service import RAGService
rag_service = RAGService()

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
    if not input.ticket.strip():
        raise HTTPException(400, "Ticket text is required")
    valid, msg = check_guardrails(input.ticket)
    if not valid:
        raise HTTPException(400, msg)
    
    logger.info(f"Analyzing: {input.ticket[:80]}...")
    
    try:
        # Retrieve runbook context via BM25 RAG
        rag_context = rag_service.retrieve(input.ticket)
        
        system_prompt = f"""You are an expert IT incident resolver for UC/CC infrastructure.
Use the RUNBOOK context below to analyze the incident. Respond ONLY with valid JSON, no markdown.

RUNBOOK CONTEXT:
{rag_context}

Return this exact JSON structure:
{{"summary": "1-2 sentence summary", "priority": "P1 or P2 or P3", "root_cause": "Most likely root cause", "resolution_steps": "Step-by-step resolution", "bridge_update": "P1 bridge communication or N/A", "confidence_score": 75}}

Priority rules: P1=Critical outage (100+ users/total down), P2=Degraded service (10-100 users), P3=Minor issue (<10 users)"""

        if not groq_client:
            raise HTTPException(500, "GROQ_API_KEY not configured")

        # Retry logic for Groq
        response = None
        for attempt in range(3):
            try:
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": input.ticket}
                    ],
                    temperature=0.2,
                )
                response = completion.choices[0].message.content
                break
            except Exception as e:
                if attempt == 2:
                    raise e
                await asyncio.sleep(1)
        
        # Parse JSON response
        try:
            text = response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            data = json.loads(text.strip())
        except Exception:
            data = {"summary": response[:200], "priority": "P3", "root_cause": "See summary", 
                    "resolution_steps": response, "bridge_update": "N/A", "confidence_score": 50}
        
        def norm(v):
            return "\n".join(v) if isinstance(v, list) else str(v) if v else ""
        
        priority = data.get("priority", "P3")
        if priority not in ("P1", "P2", "P3"):
            priority = "P3"
        confidence = min(100, max(0, int(data.get("confidence_score", 50))))
        
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
        if database is not None:
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
    if database is not None:
        query = {"status": status} if status else {}
        incidents = await database.incidents.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    else:
        incidents = list(in_memory_incidents.values())[-limit:]
        if status:
            incidents = [i for i in incidents if i.get('status') == status]
    return [calculate_sla_status(i) for i in incidents]

@api_router.get("/incidents/search")
async def search_incidents(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    database = get_db()
    skip = (page - 1) * limit

    if database is not None:
        query = {}
        if priority:
            query["priority"] = priority
        if status:
            query["status"] = status
        if search:
            query["summary"] = {"$regex": search, "$options": "i"}
        if date_from or date_to:
            date_q = {}
            if date_from:
                date_q["$gte"] = date_from
            if date_to:
                date_q["$lte"] = date_to + "T23:59:59"
            query["created_at"] = date_q

        total = await database.incidents.count_documents(query)
        items = await database.incidents.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    else:
        all_items = list(in_memory_incidents.values())
        if priority:
            all_items = [i for i in all_items if i.get("priority") == priority]
        if status:
            all_items = [i for i in all_items if i.get("status") == status]
        if search:
            all_items = [i for i in all_items if search.lower() in (i.get("summary", "") + i.get("ticket", "")).lower()]
        if date_from:
            all_items = [i for i in all_items if i.get("created_at", "") >= date_from]
        if date_to:
            all_items = [i for i in all_items if i.get("created_at", "") <= date_to + "T23:59:59"]
        all_items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        total = len(all_items)
        items = all_items[skip:skip + limit]

    return {
        "items": [calculate_sla_status(i) for i in items],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit)
    }

@api_router.get("/incidents/{id}")
async def get_incident(id: str):
    database = get_db()
    inc = await database.incidents.find_one({"id": id}, {"_id": 0}) if database is not None else in_memory_incidents.get(id)
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
    
    if database is not None:
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
    incidents = await database.incidents.find({}, {"_id": 0}).to_list(1000) if database is not None else list(in_memory_incidents.values())
    
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

@api_router.get("/trends")
async def get_trends():
    database = get_db()
    incidents = await database.incidents.find({}, {"_id": 0}).to_list(5000) if database is not None else list(in_memory_incidents.values())

    volume_by_date = {}
    mttr_by_date = {}
    priority_by_date = {}
    summary_counts = {}

    for inc in incidents:
        created = inc.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.isoformat()[:10]

        volume_by_date[day] = volume_by_date.get(day, 0) + 1

        p = inc.get("priority", "P3")
        if day not in priority_by_date:
            priority_by_date[day] = {"P1": 0, "P2": 0, "P3": 0}
        priority_by_date[day][p] = priority_by_date[day].get(p, 0) + 1

        if inc.get("status") == "RESOLVED" and inc.get("resolved_at"):
            c = inc.get("created_at", "")
            r = inc.get("resolved_at", "")
            try:
                if isinstance(c, str):
                    c = datetime.fromisoformat(c.replace("Z", "+00:00"))
                if isinstance(r, str):
                    r = datetime.fromisoformat(r.replace("Z", "+00:00"))
                mins = (r - c).total_seconds() / 60
                if day not in mttr_by_date:
                    mttr_by_date[day] = []
                mttr_by_date[day].append(mins)
            except Exception:
                pass

        words = inc.get("summary", "").lower()
        for keyword in ["sip", "audio", "queue", "cpu", "dns", "registration", "routing", "firewall", "timeout", "memory"]:
            if keyword in words:
                summary_counts[keyword] = summary_counts.get(keyword, 0) + 1

    sorted_dates = sorted(volume_by_date.keys())

    volume_trend = [{"date": d, "count": volume_by_date[d]} for d in sorted_dates]
    mttr_trend = [{"date": d, "mttr": round(sum(mttr_by_date[d]) / len(mttr_by_date[d]), 1)} for d in sorted_dates if d in mttr_by_date]
    priority_trend = [{"date": d, **priority_by_date.get(d, {"P1": 0, "P2": 0, "P3": 0})} for d in sorted_dates]
    recurring = sorted([{"pattern": k, "count": v} for k, v in summary_counts.items()], key=lambda x: x["count"], reverse=True)[:10]

    return {
        "volume_trend": volume_trend,
        "mttr_trend": mttr_trend,
        "priority_trend": priority_trend,
        "recurring_patterns": recurring,
        "total_incidents": len(incidents)
    }


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
