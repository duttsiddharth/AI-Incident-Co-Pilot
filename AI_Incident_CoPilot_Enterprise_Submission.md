# AI Incident Co-Pilot Enterprise v2.0 — Project Submission

---

## 1. PROJECT OVERVIEW

**Project Name:** AI Incident Co-Pilot Enterprise  
**Version:** 2.0.0  
**Domain:** IT Infrastructure Support — Unified Communications (UC) & Contact Center (CC)  
**Deployment:** Render Free Tier compatible (512MB RAM)

### What It Does
An AI-powered web application that analyzes IT incident tickets, auto-classifies priority (P1/P2/P3), identifies root causes using domain-specific runbook knowledge, and provides step-by-step resolution guidance — all in real-time with SLA tracking, historical analytics, and PDF reporting.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS, Recharts, jsPDF, Phosphor Icons |
| **Backend** | Python FastAPI, Pydantic v2 |
| **AI/LLM** | Groq (llama-3.3-70b-versatile) |
| **RAG** | BM25 (rank_bm25) — lightweight keyword retrieval |
| **Database** | MongoDB (with in-memory fallback) |
| **Deployment** | Render (render.yaml), Docker Compose |

---

## 3. FEATURES IMPLEMENTED

### 3.1 AI Ticket Analysis (ANALYZE Tab)
- Paste any IT incident ticket text
- AI analyzes using Groq LLM + BM25 RAG from 5 domain runbooks
- Returns: Priority (P1/P2/P3), Summary, Root Cause, Resolution Steps, Bridge Update
- Confidence scoring (0-100%) with HIGH/MEDIUM/LOW bands
- "Needs Human Review" flag for low-confidence results
- Key signal extraction (SIP errors, user count, CPU levels)
- 3 built-in sample tickets for demo

### 3.2 SLA Dashboard (DASHBOARD Tab)
- Real-time KPI cards: Total Incidents, Active, SLA Breach %, Avg Resolution Time
- Priority Distribution pie chart (P1/P2/P3)
- Status Breakdown bar chart (OPEN/IN_PROGRESS/RESOLVED)
- Live incidents table with Start/Resolve actions
- Incident detail modal with Edit capability
- Auto-refreshes every 5 seconds

### 3.3 Analysis History (HISTORY Tab)
- Full searchable, paginated history of all analyzed incidents
- Filters: Priority dropdown, Status dropdown, Text search, Date range (from/to)
- Table columns: Date, Summary, Priority, Status, Confidence, SLA Timer, Actions
- PDF export button per row
- Pagination (15 items per page)

### 3.4 Trends & Analytics (TRENDS Tab)
- Incident Volume Over Time (area chart)
- MTTR — Mean Time To Resolution (bar chart)
- Priority Distribution Over Time (stacked area chart with P1/P2/P3)
- Recurring Issue Patterns (keyword frequency: SIP, audio, queue, CPU, DNS, etc.)

### 3.5 PDF Export
- Available on: Analyze results, Dashboard rows, History rows, Detail modal
- Client-side generation using jsPDF (no server dependency)
- Clean formatted report with all incident data

### 3.6 Real-Time Incident Simulation
- START SIM / STOP SIM toggle button
- Auto-generates random incidents every 15-45 seconds using Groq
- Uses 5 realistic UC/CC incident templates
- WebSocket broadcast for real-time UI updates

### 3.7 Input Guardrails
- Prompt injection detection
- Input length validation (10,000 char max)
- Empty ticket rejection

---

## 4. API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with DB and simulation status |
| POST | `/api/analyze` | Analyze ticket via Groq + RAG |
| GET | `/api/incidents` | List recent incidents with SLA data |
| GET | `/api/incidents/search` | Filtered + paginated history search |
| GET | `/api/incidents/{id}` | Single incident detail |
| PATCH | `/api/incidents/{id}` | Update incident status/fields |
| GET | `/api/sla-dashboard` | Dashboard KPI metrics |
| GET | `/api/trends` | Volume, MTTR, priority trends, recurring patterns |
| POST | `/api/simulate/start` | Start auto-simulation |
| POST | `/api/simulate/stop` | Stop simulation |
| GET | `/api/simulate/status` | Current simulation state |

---

## 5. RAG KNOWLEDGE BASE

5 domain-specific runbooks (42 text chunks via BM25):

| Runbook | Coverage |
|---------|----------|
| `sip_failures.md` | SIP 408/503/486 errors, registration failures |
| `contact_center_issues.md` | Agent login, call routing, CTI, recording |
| `network_infrastructure.md` | Connectivity, QoS, DNS, DHCP, firewall |
| `server_infrastructure.md` | CPU, memory, disk, services, database |
| `voip_quality.md` | Echo, jitter, codec, one-way audio |

---

## 6. DATABASE SCHEMA

**Collection: `incidents`**

```json
{
  "id": "uuid-string",
  "ticket": "Original ticket text",
  "summary": "AI-generated summary",
  "priority": "P1|P2|P3",
  "status": "OPEN|IN_PROGRESS|RESOLVED",
  "root_cause": "AI-identified root cause",
  "resolution_steps": "Step-by-step resolution",
  "bridge_update": "P1 bridge communication or N/A",
  "confidence_score": 80,
  "confidence_band": "HIGH|MEDIUM|LOW",
  "needs_human_review": false,
  "key_signals": ["SIP 408 -> Network issue", "P1 -> SLA: 60 min"],
  "created_at": "2026-03-30T15:04:47.661359+00:00",
  "updated_at": "2026-03-30T15:04:47.661363+00:00",
  "resolved_at": null,
  "sla_target_minutes": 60,
  "sla_breached": false,
  "sla_remaining_minutes": 45
}
```

---

## 7. DEPLOYMENT

### Render (Recommended — Free Tier)

**Backend:**
- Runtime: Python 3.11
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Env vars: `GROQ_API_KEY`, `MONGO_URL`, `DB_NAME`

**Frontend:**
- Runtime: Static Site
- Root: `frontend/`
- Build: `yarn install && yarn build`
- Publish: `build`
- Env vars: `REACT_APP_BACKEND_URL`

### Docker Compose (Local)
```bash
GROQ_API_KEY=your_key docker-compose up --build
```

---

## 8. ENVIRONMENT VARIABLES

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `GROQ_API_KEY` | Backend | Yes | Groq API key (free at console.groq.com) |
| `MONGO_URL` | Backend | Yes | MongoDB connection string |
| `DB_NAME` | Backend | No | Database name (default: incident_copilot) |
| `CORS_ORIGINS` | Backend | No | CORS allowed origins (default: *) |
| `REACT_APP_BACKEND_URL` | Frontend | Yes | Backend URL (e.g., https://your-backend.onrender.com) |

---

## 9. TESTING RESULTS

| Area | Pass Rate | Details |
|------|-----------|---------|
| Backend API | 100% | 19/19 tests (analyze, search, trends, CRUD, simulation) |
| Frontend UI | 100% | All 4 tabs, filters, charts, PDF export, modals |
| Groq Integration | Working | llama-3.3-70b-versatile with retry logic |
| BM25 RAG | Working | 42 chunks from 5 runbooks |
| SLA Tracking | Working | Real-time breach detection |
| PDF Export | Working | Client-side jsPDF generation |

---

## 10. KEY DESIGN DECISIONS

1. **Groq over OpenAI** — User's choice. Groq provides fast inference with llama-3.3-70b-versatile.
2. **BM25 over Vector Search** — rank_bm25 uses ~5MB RAM vs. 400MB+ for sentence-transformers + FAISS. Critical for Render's 512MB limit.
3. **In-Memory Fallback** — App works without MongoDB (stores incidents in dict). Ensures local dev and demo work instantly.
4. **Client-Side PDF** — jsPDF generates PDFs in the browser. No server-side PDF library needed (keeps backend lightweight).
5. **Motor (Async MongoDB)** — Non-blocking DB calls for FastAPI's async routes.

---

## 11. FILES TO UPDATE ON GITHUB

These are the key files that changed from the original:

| File | What Changed |
|------|-------------|
| `backend/server.py` | Groq integration, BM25 RAG, /search & /trends endpoints, SLA dashboard |
| `backend/rag_service.py` | Complete rewrite: LlamaIndex -> BM25 |
| `backend/requirements.txt` | Removed torch/transformers, added groq/rank-bm25 |
| `frontend/src/App.js` | 4 tabs, PDF export, history filters, trends charts |
| `frontend/package.json` | Added jspdf dependency |
| `render.yaml` | Changed OPENAI_API_KEY -> GROQ_API_KEY |

---

## 12. GITHUB REPOSITORY

**URL:** https://github.com/duttsiddharth/AI-Incident-Co-Pilot

Push updated files using the "Save to Github" button in Emergent, or manually:
```bash
git add -A
git commit -m "Enterprise v2.0: Groq + BM25 RAG + History + Trends + PDF Export"
git push origin main
```
