# AI Incident Co-Pilot - Complete Project Code

## Project Overview

**Purpose:** AI-powered IT incident ticket analysis system using RAG (Retrieval Augmented Generation)

**Tech Stack:**
- Backend: FastAPI (Python)
- Frontend: React + Tailwind CSS
- Database: MongoDB
- AI: OpenAI GPT-4o-mini
- RAG: LlamaIndex + FAISS + HuggingFace embeddings

**Features:**
- Analyze IT incident tickets with AI
- Auto-classify priority (P1/P2/P3)
- Generate root cause analysis
- Retrieve resolution steps from runbooks (RAG)
- Generate P1 bridge communications
- Confidence score with human review flag

---

## File Structure

```
ai-incident-copilot/
├── backend/
│   ├── server.py
│   ├── rag_service.py
│   ├── requirements.txt
│   └── runbooks/ (5 markdown files)
├── frontend/
│   ├── src/App.js
│   ├── src/App.css
│   ├── src/index.css
│   └── package.json
└── README.md
```

---

## BACKEND CODE

### backend/server.py

```python
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

# Configure logging (console only for cloud deployment)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'incident_copilot')]

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
        
        # Call LLM for analysis using standard OpenAI SDK
        from openai import OpenAI
        
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client = OpenAI(api_key=api_key)
        
        system_prompt = """You are an expert IT incident analyst.

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

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        
        response = completion.choices[0].message.content
        
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
```

---

### backend/rag_service.py

```python
"""RAG Service using LlamaIndex and FAISS for incident resolution knowledge base"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class RAGService:
    """Retrieval Augmented Generation service for incident runbooks"""
    
    def __init__(self):
        self.index = None
        self.is_loaded = False
        self.runbooks_dir = Path(__file__).parent / 'runbooks'
        
    def load_documents(self):
        """Load runbook documents and create FAISS index"""
        try:
            logger.info("Loading runbook documents for RAG...")
            
            # Import LlamaIndex components
            from llama_index.core import (
                SimpleDirectoryReader,
                VectorStoreIndex,
                Settings
            )
            from llama_index.embeddings.huggingface import HuggingFaceEmbedding
            
            # Configure embedding model (local, no API needed)
            embed_model = HuggingFaceEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            Settings.embed_model = embed_model
            Settings.llm = None  # We'll use external LLM
            
            # Check if runbooks directory exists
            if not self.runbooks_dir.exists():
                logger.warning(f"Runbooks directory not found: {self.runbooks_dir}")
                self.is_loaded = False
                return
            
            # Load documents
            documents = SimpleDirectoryReader(
                input_dir=str(self.runbooks_dir),
                required_exts=[".md"],
                recursive=True
            ).load_data()
            
            if not documents:
                logger.warning("No runbook documents found")
                self.is_loaded = False
                return
            
            logger.info(f"Loaded {len(documents)} runbook documents")
            
            # Create vector index
            self.index = VectorStoreIndex.from_documents(
                documents,
                show_progress=True
            )
            
            self.is_loaded = True
            logger.info("RAG index created successfully")
            
        except Exception as e:
            logger.error(f"Error loading RAG documents: {str(e)}")
            self.is_loaded = False
    
    def get_relevant_context(self, query: str, top_k: int = 3) -> str:
        """Retrieve relevant context from runbooks for a given query"""
        if not self.is_loaded or self.index is None:
            logger.warning("RAG index not loaded, returning generic context")
            return "No runbook context available. Provide general IT troubleshooting advice."
        
        try:
            # Create retriever
            retriever = self.index.as_retriever(
                similarity_top_k=top_k
            )
            
            # Retrieve relevant nodes
            nodes = retriever.retrieve(query)
            
            if not nodes:
                return "No relevant runbook entries found. Provide general IT troubleshooting advice."
            
            # Combine context from retrieved nodes
            context_parts = []
            for i, node in enumerate(nodes, 1):
                source = node.metadata.get('file_name', 'Unknown')
                context_parts.append(
                    f"[Source {i}: {source}]\n{node.text}\n"
                )
            
            return "\n---\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return "Error retrieving runbook context. Provide general IT troubleshooting advice."
```

---

### backend/requirements.txt

```
fastapi==0.110.1
uvicorn==0.25.0
python-dotenv>=1.0.1
pymongo==4.5.0
motor==3.3.1
pydantic>=2.6.4
requests>=2.31.0

# LLM Integration (standard OpenAI SDK)
openai>=1.0.0

# RAG Components
llama-index>=0.10.0
llama-index-embeddings-huggingface>=0.2.0
faiss-cpu>=1.7.4
sentence-transformers>=2.2.0
```

---

## FRONTEND CODE

### frontend/src/App.js

```javascript
import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { 
  Warning, 
  CheckCircle, 
  Copy, 
  Lightning, 
  Cpu,
  Clipboard,
  ArrowRight,
  User
} from "@phosphor-icons/react";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sample tickets for demo
const SAMPLE_TICKETS = [
  {
    title: "SIP Registration Failure",
    ticket: `INCIDENT: Multiple users unable to make/receive calls
TIME: Started 10:30 AM EST
IMPACT: 50+ agents in Contact Center unable to login
SYMPTOMS:
- Phones showing "Registering" status
- SIP 408 timeout errors in logs
- CUCM Publisher showing high CPU (95%)
- Recent network change: Firewall rule update at 10:15 AM
USER REPORTS: "Phone won't connect, stuck on registering screen"
BUSINESS IMPACT: Contact center operations severely impacted, customer calls going to voicemail`
  },
  {
    title: "Contact Center Agent Queue Issue",
    ticket: `INCIDENT: Calls not routing to available agents
TIME: Ongoing for past 2 hours
IMPACT: 200+ calls stuck in queue despite agents being Ready
SYMPTOMS:
- Agent states showing "Ready" in Finesse
- Queue showing 180 calls waiting
- Skill group shows 0 agents available
- No routing to any agent in 2 skill groups
USER REPORTS: "I'm ready but no calls coming through"
BUSINESS IMPACT: Critical - SLA breached, customers abandoning calls`
  },
  {
    title: "One-Way Audio Issue",
    ticket: `INCIDENT: Intermittent one-way audio on external calls
TIME: Reported by multiple users today
IMPACT: 15+ users experiencing issue
SYMPTOMS:
- Customer can hear agent, agent cannot hear customer
- Issue only on calls going through SBC
- No issues on internal calls
- RTP traffic visible in one direction only
USER REPORTS: "Customer keeps saying hello but I can't hear them"
ENVIRONMENT: Cisco CUCM -> Audiocodes SBC -> SIP Trunk to carrier`
  }
];

function App() {
  const [ticketText, setTicketText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingText, setLoadingText] = useState("");

  // Loading text animation
  useEffect(() => {
    if (isAnalyzing) {
      const texts = [
        "ANALYZING INCIDENT VECTOR...",
        "QUERYING KNOWLEDGE BASE...",
        "CORRELATING SYMPTOMS...",
        "GENERATING RESOLUTION PATH...",
        "COMPUTING CONFIDENCE SCORE..."
      ];
      let index = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[index % texts.length]);
        index++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!ticketText.trim()) {
      toast.error("Please enter a ticket description");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await axios.post(`${API}/analyze`, {
        ticket: ticketText
      });
      setResult(response.data);
      toast.success("Analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyBridgeUpdate = () => {
    if (result?.bridge_update && result.bridge_update !== "N/A") {
      navigator.clipboard.writeText(result.bridge_update);
      toast.success("Bridge update copied to clipboard");
    }
  };

  const loadSampleTicket = (sample) => {
    setTicketText(sample.ticket);
    setResult(null);
    toast.info(`Loaded: ${sample.title}`);
  };

  const getPriorityBadge = (priority) => {
    const classes = {
      P1: "badge-p1",
      P2: "badge-p2",
      P3: "badge-p3"
    };
    const icons = {
      P1: <Lightning weight="fill" size={14} />,
      P2: <Warning weight="fill" size={14} />,
      P3: <Cpu weight="fill" size={14} />
    };
    return (
      <span className={classes[priority] || "badge-p3"} data-testid="priority-badge">
        {icons[priority]}
        {priority} {priority === "P1" ? "CRITICAL" : priority === "P2" ? "HIGH" : "MEDIUM"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b border-black/10 bg-white">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center">
                <Cpu className="text-white" size={24} weight="bold" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-black tracking-tighter text-[#111827]" data-testid="app-title">
                  AI INCIDENT CO-PILOT
                </h1>
                <p className="text-xs font-mono text-[#9CA3AF] tracking-wider">
                  INTELLIGENT TICKET ANALYSIS
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#9CA3AF]">
              <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
              SYSTEM OPERATIONAL
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Pane - Input */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6">
            {/* Ticket Input Card */}
            <div className="card-default p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="label-overline">INCIDENT TICKET</span>
                <span className="text-xs font-mono text-[#9CA3AF]">
                  {ticketText.length} chars
                </span>
              </div>
              
              <textarea
                data-testid="ticket-input"
                className="textarea-field mb-4"
                placeholder={`Paste your incident ticket here...

Example format:
INCIDENT: Brief description
TIME: When it started
IMPACT: Who/what is affected
SYMPTOMS: What you're observing
USER REPORTS: What users are saying
BUSINESS IMPACT: Service level effect`}
                value={ticketText}
                onChange={(e) => setTicketText(e.target.value)}
                disabled={isAnalyzing}
              />

              <button
                data-testid="analyze-button"
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !ticketText.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <span className="loading-spinner"></span>
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <ArrowRight weight="bold" size={18} />
                    ANALYZE INCIDENT
                  </>
                )}
              </button>
            </div>

            {/* Sample Tickets */}
            <div className="card-default p-6">
              <span className="label-overline mb-4 block">SAMPLE TICKETS</span>
              <div className="flex flex-col gap-2">
                {SAMPLE_TICKETS.map((sample, index) => (
                  <button
                    key={index}
                    data-testid={`sample-ticket-${index}`}
                    className="btn-secondary text-left text-sm py-2 px-3 flex items-center gap-2"
                    onClick={() => loadSampleTicket(sample)}
                  >
                    <Clipboard size={16} />
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Pane - Results */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
            {isAnalyzing ? (
              /* Loading State */
              <div className="card-default loading-card p-8 border-2" data-testid="loading-state">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                    <Cpu className="text-white animate-pulse" size={32} weight="bold" />
                  </div>
                  <p className="font-mono text-sm text-[#111827] mb-2">
                    <span className="loading-spinner mr-2"></span>
                    {loadingText}
                  </p>
                  <p className="text-xs text-[#9CA3AF] font-mono">
                    Querying RAG knowledge base...
                  </p>
                </div>
              </div>
            ) : result ? (
              /* Results Grid */
              <>
                {/* Priority & Confidence Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority Card */}
                  <div className="card-default card-hover p-6" data-testid="priority-card">
                    <span className="label-overline mb-3 block">PRIORITY LEVEL</span>
                    <div className="flex items-center justify-between">
                      {getPriorityBadge(result.priority)}
                    </div>
                  </div>

                  {/* Confidence Card */}
                  <div className="card-default card-hover p-6" data-testid="confidence-card">
                    <span className="label-overline mb-3 block">CONFIDENCE SCORE</span>
                    <div className="flex items-center gap-4">
                      <span className="font-heading text-3xl font-black" data-testid="confidence-score">
                        {result.confidence_score}%
                      </span>
                      <div className="flex-1">
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill"
                            style={{ width: `${result.confidence_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {result.needs_human_review && (
                      <div className="mt-3">
                        <span className="badge-warning" data-testid="human-review-badge">
                          <Warning weight="fill" size={14} />
                          NEEDS HUMAN REVIEW
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="card-default card-hover p-6" data-testid="summary-card">
                  <span className="label-overline mb-3 block">INCIDENT SUMMARY</span>
                  <p className="text-[#111827] leading-relaxed" data-testid="summary-text">
                    {result.summary}
                  </p>
                </div>

                {/* Root Cause & Resolution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Root Cause */}
                  <div className="card-default card-hover p-6" data-testid="root-cause-card">
                    <span className="label-overline mb-3 block">PROBABLE ROOT CAUSE</span>
                    <p className="text-[#111827] text-sm leading-relaxed" data-testid="root-cause-text">
                      {result.root_cause}
                    </p>
                  </div>

                  {/* Resolution Steps */}
                  <div className="card-default card-hover p-6" data-testid="resolution-card">
                    <span className="label-overline mb-3 block">RESOLUTION STEPS</span>
                    <div className="text-[#111827] text-sm leading-relaxed whitespace-pre-wrap" data-testid="resolution-text">
                      {result.resolution_steps}
                    </div>
                  </div>
                </div>

                {/* Bridge Update (P1 only) */}
                {result.priority === "P1" && result.bridge_update !== "N/A" && (
                  <div className="card-default p-6" data-testid="bridge-update-card">
                    <div className="flex items-center justify-between mb-4">
                      <span className="label-overline">P1 BRIDGE COMMUNICATION</span>
                      <button
                        data-testid="bridge-update-copy"
                        className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                        onClick={handleCopyBridgeUpdate}
                      >
                        <Copy size={14} />
                        COPY
                      </button>
                    </div>
                    <div className="terminal-block whitespace-pre-wrap" data-testid="bridge-update-text">
                      {result.bridge_update}
                    </div>
                  </div>
                )}

                {/* Success Indicator */}
                <div className="flex items-center justify-center gap-2 py-4 text-[#10B981]">
                  <CheckCircle weight="fill" size={20} />
                  <span className="font-mono text-sm">ANALYSIS COMPLETE</span>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="card-default p-12 border-dashed border-2" data-testid="empty-state">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-[#F1F3F5] flex items-center justify-center mb-6">
                    <User className="text-[#9CA3AF]" size={40} weight="light" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-[#111827] mb-2">
                    Ready to Analyze
                  </h3>
                  <p className="text-sm text-[#4B5563] max-w-md mb-4">
                    Paste an incident ticket on the left or select a sample ticket to see the AI-powered analysis in action.
                  </p>
                  <p className="text-xs font-mono text-[#9CA3AF]">
                  RAG-POWERED | AI ANALYSIS | RUNBOOK-INTEGRATED
                </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 mt-12">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
            <span>AI INCIDENT CO-PILOT v1.0</span>
            <span>POWERED BY GPT-4O-MINI + RAG</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
```

---

### frontend/src/App.css

```css
/* App-specific overrides and animations */

/* Ensure no rounded corners anywhere */
* {
    border-radius: 0 !important;
}

/* ASCII spinner keyframes */
@keyframes ascii-spin {
    0% { content: '|'; }
    25% { content: '/'; }
    50% { content: '-'; }
    75% { content: '\\'; }
}

/* Smooth scroll */
html {
    scroll-behavior: smooth;
}

/* Focus visible for accessibility */
:focus-visible {
    outline: 2px solid #0B0C10;
    outline-offset: 2px;
}

/* Selection color */
::selection {
    background-color: #0B0C10;
    color: #F9FAFB;
}

/* Card shadow on hover */
.card-hover:hover {
    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
    border-color: #0B0C10 !important;
    transform: translateY(-2px);
}

/* Terminal block styling */
.terminal-block {
    background: linear-gradient(180deg, #0B0C10 0%, #1a1b1f 100%);
    font-variant-ligatures: none;
}

/* Animate confidence bar on load */
@keyframes grow-width {
    from { width: 0; }
}

.confidence-fill {
    animation: grow-width 1s ease-out;
}

/* Loading card border animation */
@keyframes border-pulse {
    0%, 100% { 
        border-color: rgba(0,0,0,0.2);
    }
    50% { 
        border-color: rgba(0,0,0,0.8);
    }
}

.loading-card {
    animation: border-pulse 1.5s ease-in-out infinite;
}

/* Textarea placeholder styling */
.textarea-field::placeholder {
    color: #9CA3AF;
    font-size: 0.8rem;
}

/* Button active states */
.btn-primary:active,
.btn-secondary:active {
    transform: translateY(1px);
}

/* Disabled state improvements */
.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Badge pulse for critical */
.badge-p1 {
    animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

/* Header shadow on scroll - handled via JS if needed */
header {
    transition: box-shadow 0.2s ease;
}

/* Grid gap adjustments for mobile */
@media (max-width: 1024px) {
    .grid {
        gap: 1rem;
    }
}

/* Ensure monospace text doesn't wrap awkwardly */
.font-mono {
    word-break: break-word;
    overflow-wrap: break-word;
}

/* Status indicator pulse */
@keyframes status-pulse {
    0%, 100% { 
        opacity: 1;
        transform: scale(1);
    }
    50% { 
        opacity: 0.5;
        transform: scale(1.2);
    }
}

/* Make the green status dot pulse */
.animate-pulse {
    animation: status-pulse 2s ease-in-out infinite;
}
```

---

### frontend/src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
    --background-main: #F8F9FA;
    --background-surface: #FFFFFF;
    --background-surface-alt: #F1F3F5;
    --background-inverted: #0B0C10;
    
    --text-primary: #111827;
    --text-secondary: #4B5563;
    --text-tertiary: #9CA3AF;
    --text-inverted: #F9FAFB;
    
    --border-default: rgba(0,0,0,0.1);
    --border-strong: rgba(0,0,0,0.8);
    
    --accent-primary: #0B0C10;
    --accent-primary-hover: #1F2937;
    --p1-critical: #E63946;
    --p2-high: #F59E0B;
    --p3-medium: #2563EB;
    --success: #10B981;
    --warning: #F59E0B;
    --error: #E63946;
}

body {
    margin: 0;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: var(--background-main);
    color: var(--text-primary);
}

.font-heading {
    font-family: 'Chivo', sans-serif;
}

.font-mono {
    font-family: 'JetBrains Mono', monospace;
}

code {
    font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace;
}

@layer base {
    :root {
        --background: 0 0% 98%;
        --foreground: 220 15% 10%;
        --card: 0 0% 100%;
        --card-foreground: 220 15% 10%;
        --popover: 0 0% 100%;
        --popover-foreground: 220 15% 10%;
        --primary: 220 15% 6%;
        --primary-foreground: 0 0% 98%;
        --secondary: 220 10% 96%;
        --secondary-foreground: 220 15% 10%;
        --muted: 220 10% 96%;
        --muted-foreground: 220 8% 45%;
        --accent: 220 10% 96%;
        --accent-foreground: 220 15% 10%;
        --destructive: 0 70% 50%;
        --destructive-foreground: 0 0% 98%;
        --border: 220 10% 90%;
        --input: 220 10% 90%;
        --ring: 220 15% 10%;
        --chart-1: 12 76% 61%;
        --chart-2: 173 58% 39%;
        --chart-3: 197 37% 24%;
        --chart-4: 43 74% 66%;
        --chart-5: 27 87% 67%;
        --radius: 0;
    }
}

@layer base {
    * {
        @apply border-border;
    }
    body {
        @apply bg-background text-foreground;
    }
}

/* Custom component styles */
.card-default {
    @apply bg-white border border-black/10 shadow-none;
    border-radius: 0;
}

.card-hover {
    @apply transition-all duration-200;
}

.card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
    border-color: black;
}

.terminal-block {
    background-color: var(--background-inverted);
    color: var(--text-inverted);
    border: 1px solid black;
    padding: 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    border-radius: 0;
}

.btn-primary {
    @apply bg-black text-white font-bold tracking-wide px-6 py-3 border border-transparent transition-all;
    border-radius: 0;
}

.btn-primary:hover {
    @apply bg-gray-800;
}

.btn-primary:active {
    transform: translateY(1px);
}

.btn-primary:disabled {
    @apply bg-gray-400 cursor-not-allowed;
}

.btn-secondary {
    @apply bg-transparent text-black border border-black/20 font-bold tracking-wide px-6 py-3 transition-all;
    border-radius: 0;
}

.btn-secondary:hover {
    @apply border-black;
}

.input-field {
    @apply w-full border border-black/20 bg-white px-4 py-2 text-sm outline-none transition-all;
    border-radius: 0;
}

.input-field:focus {
    @apply border-black ring-1 ring-black;
}

.textarea-field {
    @apply w-full border border-black/20 bg-white p-4 text-sm outline-none transition-all resize-y;
    font-family: 'JetBrains Mono', monospace;
    border-radius: 0;
    min-height: 300px;
}

.textarea-field:focus {
    @apply border-black ring-1 ring-black;
}

/* Priority badges */
.badge-p1 {
    @apply bg-red-50 text-red-600 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2;
    font-family: 'JetBrains Mono', monospace;
    border-radius: 0;
}

.badge-p2 {
    @apply bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2;
    font-family: 'JetBrains Mono', monospace;
    border-radius: 0;
}

.badge-p3 {
    @apply bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2;
    font-family: 'JetBrains Mono', monospace;
    border-radius: 0;
}

.badge-warning {
    @apply px-3 py-1 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2;
    font-family: 'JetBrains Mono', monospace;
    background-color: #FFF9DB;
    color: #B08800;
    border: 1px solid #FFE066;
    border-radius: 0;
}

/* Confidence bar */
.confidence-bar {
    @apply h-2 w-full bg-gray-100 overflow-hidden;
}

.confidence-fill {
    @apply h-full bg-black transition-all duration-1000 ease-out;
}

/* ASCII Loading Animation */
@keyframes spin-ascii {
    0% { content: '|'; }
    25% { content: '/'; }
    50% { content: '-'; }
    75% { content: '\\'; }
    100% { content: '|'; }
}

.loading-spinner::after {
    content: '|';
    animation: spin-ascii 0.5s infinite steps(4);
    font-family: 'JetBrains Mono', monospace;
}

/* Pulse animation for loading card */
@keyframes pulse-border {
    0%, 100% { border-color: rgba(0,0,0,0.2); }
    50% { border-color: rgba(0,0,0,0.8); }
}

.loading-card {
    animation: pulse-border 1.5s ease-in-out infinite;
}

/* Label overline style */
.label-overline {
    @apply text-xs font-bold uppercase tracking-widest;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-tertiary);
}

/* Scroll area customization */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--background-surface-alt);
}

::-webkit-scrollbar-thumb {
    background: var(--text-tertiary);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}

/* Remove rounded corners from all shadcn components */
[class*="rounded"] {
    border-radius: 0 !important;
}

@layer base {
    [data-debug-wrapper="true"] {
        display: contents !important;
    }
}
```

---

### frontend/package.json

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^5.0.1",
    "@phosphor-icons/react": "^2.1.10",
    "@radix-ui/react-accordion": "^1.2.8",
    "@radix-ui/react-alert-dialog": "^1.1.11",
    "@radix-ui/react-aspect-ratio": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.7",
    "@radix-ui/react-checkbox": "^1.2.3",
    "@radix-ui/react-collapsible": "^1.1.8",
    "@radix-ui/react-context-menu": "^2.2.12",
    "@radix-ui/react-dialog": "^1.1.11",
    "@radix-ui/react-dropdown-menu": "^2.1.12",
    "@radix-ui/react-hover-card": "^1.1.11",
    "@radix-ui/react-label": "^2.1.4",
    "@radix-ui/react-menubar": "^1.1.12",
    "@radix-ui/react-navigation-menu": "^1.2.10",
    "@radix-ui/react-popover": "^1.1.11",
    "@radix-ui/react-progress": "^1.1.4",
    "@radix-ui/react-radio-group": "^1.3.4",
    "@radix-ui/react-scroll-area": "^1.2.6",
    "@radix-ui/react-select": "^2.2.2",
    "@radix-ui/react-separator": "^1.1.4",
    "@radix-ui/react-slider": "^1.3.2",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.2.2",
    "@radix-ui/react-tabs": "^1.1.9",
    "@radix-ui/react-toast": "^1.2.11",
    "@radix-ui/react-toggle": "^1.1.6",
    "@radix-ui/react-toggle-group": "^1.1.7",
    "@radix-ui/react-tooltip": "^1.2.4",
    "axios": "^1.8.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cra-template": "1.2.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.507.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-day-picker": "8.10.1",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.56.2",
    "react-resizable-panels": "^3.0.1",
    "react-router-dom": "^7.5.1",
    "react-scripts": "5.0.1",
    "recharts": "^3.6.0",
    "sonner": "^2.0.3",
    "tailwind-merge": "^3.2.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "^3.24.4"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "@craco/craco": "^7.1.0",
    "@emergentbase/visual-edits": "https://assets.emergent.sh/npm/emergentbase-visual-edits-1.0.8.tgz",
    "@eslint/js": "9.23.0",
    "autoprefixer": "^10.4.20",
    "eslint": "9.23.0",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.4",
    "eslint-plugin-react-hooks": "5.2.0",
    "globals": "15.15.0",
    "postcss": "^8.4.49",
    "serve": "^14.2.6",
    "tailwindcss": "^3.4.17"
  },
  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
}
```

---

## SAMPLE RUNBOOK (backend/runbooks/sip_failures.md)

```markdown
# SIP Failure Troubleshooting Guide

## Overview
This runbook covers common SIP (Session Initiation Protocol) failures in Unified Communications environments.

## Common Error Codes

### SIP 408 - Request Timeout
**Symptoms**: Call setup fails with timeout, one-way audio, no ring-back tone
**Root Causes**:
- Network connectivity issues between endpoints
- Firewall blocking SIP signaling (ports 5060/5061)
- DNS resolution failures
- Overloaded SIP proxy

**Resolution Steps**:
1. Verify network connectivity between SIP endpoints using ping and traceroute
2. Check firewall rules for SIP ports (UDP/TCP 5060, TLS 5061)
3. Validate DNS records for SIP domain (SRV records)
4. Check SIP proxy CPU and memory utilization
5. Review SIP trunk registration status
6. Capture SIP traces for detailed analysis

### SIP 503 - Service Unavailable
**Symptoms**: Calls fail immediately, no dial tone
**Root Causes**:
- SIP server overloaded
- Backend services unavailable
- License exhaustion
- Database connection failures

**Resolution Steps**:
1. Check SIP server health and resource utilization
2. Verify all dependent services are running
3. Review license usage against capacity
4. Check database connectivity and performance
5. Restart affected services if necessary
6. Scale up resources if load is consistent

### SIP 486 - Busy Here
**Symptoms**: Call rejected, busy tone
**Root Causes**:
- User on another call (DND enabled)
- Maximum simultaneous calls reached
- Call forwarding loop

**Resolution Steps**:
1. Check user's current call status
2. Verify DND settings
3. Review call forwarding rules for loops
4. Check concurrent call limits

## One-Way Audio Issues
**Symptoms**: Audio flows in only one direction
**Root Causes**:
- NAT traversal issues
- RTP port blocking
- Codec mismatch
- Incorrect media routing

**Resolution Steps**:
1. Verify NAT configuration and STUN/TURN servers
2. Check RTP port ranges (typically 16384-32767)
3. Confirm codec negotiation in SIP INVITE/200 OK
4. Review media routing paths
5. Enable ICE if supported

## Registration Failures
**Symptoms**: Phones show unregistered, cannot make/receive calls
**Root Causes**:
- Authentication failures
- Certificate issues (for TLS)
- Network connectivity
- SIP registrar overload

**Resolution Steps**:
1. Verify credentials are correct
2. Check certificate validity and trust chain
3. Test network path to registrar
4. Review registrar logs for specific errors
5. Check registration expiry intervals
```

---

## ENVIRONMENT VARIABLES

### Backend (.env)
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=incident_copilot
OPENAI_API_KEY=sk-your-openai-api-key
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
```

---

## DEPLOYMENT

Currently deploying on Render (free tier):
- Backend: Web Service (Python)
- Frontend: Static Site (React)
- Database: MongoDB Atlas (free M0 tier)

---

## CURRENT ISSUES

1. Backend deployment failing on Render
2. Need to configure environment variables correctly
3. RAG service needs runbooks directory to exist

---

## HOW TO HELP

Please review the code and suggest:
1. Any bugs or issues you see
2. Deployment improvements
3. Code optimizations
4. Security improvements
5. Feature enhancements
