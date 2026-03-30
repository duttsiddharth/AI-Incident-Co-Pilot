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
- **Frontend**: React 19, Tailwind CSS, Recharts, jsPDF, Phosphor Icons
- **LLM**: Groq llama-3.3-70b-versatile (user's API key)
- **RAG**: BM25 (rank_bm25) — lightweight, Render-friendly
- **Database**: MongoDB (with in-memory fallback)

### Navigation
4 tabs: **ANALYZE** | **DASHBOARD** | **HISTORY** | **TRENDS**

### Key API Endpoints
- `POST /api/analyze` — Analyze ticket via Groq + RAG
- `GET /api/sla-dashboard` — SLA metrics and KPIs
- `GET /api/incidents` — Incident list with SLA status
- `GET /api/incidents/search` — Filtered/paginated history
- `GET /api/trends` — Volume, MTTR, priority trends, recurring patterns
- `PATCH /api/incidents/{id}` — Update incident
- `POST /api/simulate/start` & `POST /api/simulate/stop` — Simulation
- `GET /api/health` — Health check

## What's Been Implemented

### Completed (Mar 30, 2026)
- [x] Groq LLM integration (llama-3.3-70b-versatile)
- [x] BM25 RAG with 5 UC/CC runbooks (42 chunks)
- [x] Analyze endpoint with confidence scoring & key signals
- [x] SLA Tracking Dashboard with Recharts (pie + bar charts)
- [x] Real-time incident simulation engine
- [x] Incident CRUD (create, read, update)
- [x] WebSocket broadcast for real-time updates
- [x] MongoDB storage with in-memory fallback
- [x] Input guardrails (injection protection, length limits)
- [x] Analysis History page with filters + pagination
- [x] Trends/Analytics page (volume, MTTR, priority trends, recurring patterns)
- [x] PDF export (jsPDF) on analyze results, dashboard, history, detail modal
- [x] Clean requirements.txt for Render (no heavy ML deps)
- [x] Updated render.yaml for Groq
- [x] docker-compose.yml for local dev
- [x] End-to-end code reference doc
- [x] Updated project submission doc

## Deliverables
- `/app/AI_Incident_CoPilot_Full_Code.md` — Complete code listing for all files
- `/app/AI_Incident_CoPilot_Enterprise_Submission.md` — Project submission document

## Prioritized Backlog

### P1 - Next Phase
- Dark mode support
- User authentication
- Webhook notifications for P1 incidents

### P2 - Future
- Integration with ticketing systems (ServiceNow, Jira)
- More domain-specific runbooks
- Multi-tenant support
