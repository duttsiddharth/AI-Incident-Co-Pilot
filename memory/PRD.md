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
- **Frontend**: React with Tailwind CSS, Recharts, jsPDF
- **LLM**: Groq llama-3.3-70b-versatile (user's API key)
- **RAG**: BM25 (rank_bm25) — lightweight, Render-friendly
- **Database**: MongoDB (with in-memory fallback)

### Navigation
4 tabs: **ANALYZE** | **DASHBOARD** | **HISTORY** | **TRENDS**

### Key API Endpoints
- `POST /api/analyze` — Analyze ticket via Groq + RAG
- `GET /api/sla-dashboard` — SLA metrics and KPIs
- `GET /api/incidents` — Incident list with SLA status
- `GET /api/incidents/search` — Filtered/paginated history (priority, status, search, date range)
- `GET /api/trends` — Volume, MTTR, priority trends, recurring patterns
- `PATCH /api/incidents/{id}` — Update incident
- `POST /api/simulate/start` & `POST /api/simulate/stop` — Simulation
- `GET /api/health` — Health check

## What's Been Implemented

### Mar 30, 2026 — Groq Migration + Core
- [x] Groq LLM integration (llama-3.3-70b-versatile)
- [x] BM25 RAG with 5 UC/CC runbooks (42 chunks)
- [x] Analyze endpoint with confidence scoring & key signals
- [x] SLA Tracking Dashboard with Recharts (pie + bar charts)
- [x] Real-time incident simulation engine
- [x] Incident CRUD (create, read, update)
- [x] WebSocket broadcast for real-time updates
- [x] MongoDB storage with in-memory fallback
- [x] Input guardrails (injection protection, length limits)

### Mar 30, 2026 — History, Trends, PDF Export
- [x] Analysis History page with filters (priority, status, text search, date range)
- [x] Paginated history table (15 items/page)
- [x] PDF export (client-side jsPDF) — on analyze results, dashboard rows, and detail modal
- [x] Trends/Analytics page: incident volume over time, MTTR trends, priority distribution, recurring patterns
- [x] 4-tab navigation: ANALYZE | DASHBOARD | HISTORY | TRENDS

## Prioritized Backlog

### P1 - Next Phase
- Dark mode support
- User authentication
- Webhook notifications for P1 incidents

### P2 - Future
- Integration with ticketing systems (ServiceNow, Jira)
- More domain-specific runbooks
- Multi-tenant support
