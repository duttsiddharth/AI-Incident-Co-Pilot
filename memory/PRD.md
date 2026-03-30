# AI Incident Co-Pilot - Product Requirements Document

## Original Problem Statement
Build an AI Incident Co-Pilot - a production-ready AI web application that assists in analyzing IT incident tickets for UC (Unified Communications) and CC (Contact Center) infrastructure support.

## User Choices
- LLM: **Groq** (llama-3.3-70b-versatile) — migrated from OpenAI GPT-4o-mini
- Frontend: React UI with Recharts, Tailwind CSS
- Domain Focus: UC and CC application and infrastructure support
- Deployment Target: Render Free Tier (512MB RAM limit)

## Architecture

### Tech Stack
- **Backend**: Python FastAPI
- **Frontend**: React with Tailwind CSS, Recharts
- **LLM**: Groq llama-3.3-70b-versatile (user's API key)
- **RAG**: BM25 (rank_bm25) — lightweight, Render-friendly
- **Database**: MongoDB (with in-memory fallback)

### Key Components
1. **RAG Service** (`/app/backend/rag_service.py`)
   - Loads runbooks from `/app/backend/runbooks/` using BM25
   - 42 chunks from 5 domain runbooks
   - No heavy ML dependencies (no torch, sentence-transformers, FAISS)

2. **Analysis API** (`/app/backend/server.py`)
   - POST /api/analyze - Analyzes incident tickets via Groq + RAG
   - GET /api/sla-dashboard - SLA metrics and KPIs
   - GET /api/incidents - Incident list with SLA status
   - PATCH /api/incidents/{id} - Update incident
   - POST /api/simulate/start & stop - Real-time incident simulation
   - GET /api/health - Health check

3. **Frontend Dashboard** (`/app/frontend/src/App.js`)
   - Analyze tab: paste ticket, get AI analysis with confidence scoring
   - Dashboard tab: KPI cards, pie/bar charts, incidents table with actions
   - Real-time simulation toggle
   - Incident detail modal with edit capability

## What's Been Implemented

### Completed (Mar 30, 2026)
- [x] Groq LLM integration (llama-3.3-70b-versatile)
- [x] BM25 RAG with 5 UC/CC runbooks
- [x] Analyze endpoint with confidence scoring & key signals
- [x] SLA Tracking Dashboard with Recharts (pie + bar charts)
- [x] Real-time incident simulation engine
- [x] Incident CRUD (create, read, update)
- [x] WebSocket broadcast for real-time updates
- [x] MongoDB storage with in-memory fallback
- [x] Input guardrails (injection protection, length limits)
- [x] Enterprise UI (KPI cards, modals, edit mode, copy-to-clipboard)

### Runbooks Available
1. `sip_failures.md` - SIP 408, 503, 486 errors
2. `contact_center_issues.md` - Agent login, routing, CTI
3. `network_infrastructure.md` - Connectivity, QoS, DNS
4. `server_infrastructure.md` - CPU, memory, disk
5. `voip_quality.md` - Echo, jitter, codec issues

## Prioritized Backlog

### P1 - Next Phase
- Add analysis history page with filtering by priority
- Date range search for incidents
- Export analysis to PDF

### P2 - Future
- Dark mode support
- Webhook notifications for P1 incidents
- Integration with ticketing systems (ServiceNow, Jira)
- User authentication
- More domain-specific runbooks
