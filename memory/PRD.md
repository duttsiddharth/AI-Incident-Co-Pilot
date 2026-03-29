# AI Incident Co-Pilot - Product Requirements Document

## Original Problem Statement
Build an AI Incident Co-Pilot - a production-ready AI web application that assists in analyzing IT incident tickets for UC (Unified Communications) and CC (Contact Center) infrastructure support.

## User Choices
- LLM: OpenAI GPT-4o-mini via Emergent LLM Key
- Frontend: React UI (enhanced from simple HTML/JS)
- Domain Focus: UC and CC application and infrastructure support

## Architecture

### Tech Stack
- **Backend**: Python FastAPI
- **Frontend**: React with Tailwind CSS
- **LLM**: OpenAI GPT-4o-mini via Emergent Integrations
- **RAG**: LlamaIndex with FAISS vector store
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **Database**: MongoDB

### Key Components
1. **RAG Service** (`/app/backend/rag_service.py`)
   - Loads runbooks from `/app/backend/runbooks/`
   - Creates FAISS vector index for semantic search
   - Retrieves relevant context for incident analysis

2. **Analysis API** (`/app/backend/server.py`)
   - POST /api/analyze - Analyzes incident tickets
   - GET /api/health - Health check with RAG status
   - GET /api/analyses - Recent analysis history

3. **Frontend Dashboard** (`/app/frontend/src/App.js`)
   - Swiss/Brutalist design aesthetic
   - Control room layout
   - Sample tickets for demo

## Core Requirements (Static)

### Must Have (P0)
- [x] Analyze IT Incident Tickets
- [x] Generate Summary
- [x] Generate Priority (P1/P2/P3)
- [x] Generate Root Cause
- [x] Retrieve Resolution Steps (RAG from runbooks)
- [x] Generate P1 Bridge Communication Updates
- [x] Confidence Score (0-100)
- [x] "Needs Human Review" indicator
- [x] Loading state indicator
- [x] Error handling

### Should Have (P1)
- [x] Sample tickets for easy testing
- [x] Copy to clipboard for bridge updates
- [x] Logging (inputs, responses, errors)
- [x] MongoDB storage for analysis history

### Could Have (P2)
- [ ] Analysis history view page
- [ ] Export analysis to PDF
- [ ] Dark mode toggle
- [ ] Real-time notifications

## What's Been Implemented (Jan 29, 2026)

### Backend
- FastAPI server with /api prefix
- RAG service with LlamaIndex + FAISS
- 5 UC/CC domain runbooks:
  - SIP Failures
  - Contact Center Issues
  - Network Infrastructure
  - Server Infrastructure
  - VoIP Quality
- Analysis endpoint with LLM integration
- MongoDB logging of all analyses
- Health check endpoint

### Frontend
- React dashboard with Control Room layout
- Chivo + IBM Plex Sans + JetBrains Mono typography
- Priority badges (P1/P2/P3) with colors
- Confidence score visualization
- Needs Human Review badge
- Terminal-style bridge communication block
- Copy to clipboard functionality
- Sample tickets (SIP, Contact Center, One-Way Audio)
- Loading state with ASCII spinner

## Runbooks Available
1. `sip_failures.md` - SIP 408, 503, 486 errors, registration failures
2. `contact_center_issues.md` - Agent login, routing, CTI, recording
3. `network_infrastructure.md` - Connectivity, QoS, DNS, DHCP, firewall
4. `server_infrastructure.md` - CPU, memory, disk, services, database
5. `voip_quality.md` - Echo, jitter, codec, media path issues

## Prioritized Backlog

### P0 - Complete
All core features implemented and tested.

### P1 - Next Phase
- Add analysis history page
- Implement filtering by priority
- Add date range search

### P2 - Future
- Export to PDF functionality
- Dark mode support
- Webhook notifications for P1 incidents
- Integration with ticketing systems (ServiceNow, Jira)

## Next Action Items
1. Add analysis history page to view past analyses
2. Add pagination for history
3. Consider adding user authentication
4. Add more domain-specific runbooks based on feedback
