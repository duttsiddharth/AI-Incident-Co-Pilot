# AI Incident Co-Pilot

An AI-powered IT incident ticket analysis system using RAG (Retrieval Augmented Generation) to provide intelligent triage, root cause analysis, and resolution recommendations.

![AI Incident Co-Pilot](screenshot.png)

## Features

- **AI-Powered Analysis**: Uses GPT-4o-mini to analyze incident tickets
- **RAG Integration**: Retrieves relevant context from runbooks using LlamaIndex + FAISS
- **Priority Classification**: Automatically assigns P1/P2/P3 priority levels
- **Root Cause Analysis**: Suggests probable root causes based on symptoms
- **Resolution Steps**: Provides step-by-step resolution guidance from knowledge base
- **P1 Bridge Communication**: Auto-generates professional bridge updates for critical incidents
- **Confidence Scoring**: 0-100% confidence with "Needs Human Review" indicator

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: React with Tailwind CSS
- **LLM**: OpenAI GPT-4o-mini
- **RAG**: LlamaIndex with FAISS vector store
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **Database**: MongoDB

## Project Structure

```
ai-incident-copilot/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── rag_service.py         # RAG implementation
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment variables template
│   └── runbooks/              # Knowledge base documents
│       ├── sip_failures.md
│       ├── contact_center_issues.md
│       ├── network_infrastructure.md
│       ├── server_infrastructure.md
│       └── voip_quality.md
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── App.css            # Component styles
│   │   └── index.css          # Global styles
│   ├── package.json           # Node.js dependencies
│   └── .env.example           # Frontend environment template
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local or cloud)
- OpenAI API Key

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-incident-copilot.git
cd ai-incident-copilot
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL
```

### 4. Start MongoDB

```bash
# If using local MongoDB
mongod --dbpath /path/to/data

# Or use MongoDB Atlas (cloud) - update MONGO_URL in backend/.env
```

### 5. Run the Application

**Start Backend:**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Start Frontend:**
```bash
cd frontend
yarn start
```

The application will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=incident_copilot
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with RAG status |
| POST | `/api/analyze` | Analyze incident ticket |
| GET | `/api/analyses` | Get recent analyses |
| GET | `/api/runbooks` | List available runbooks |

### Example API Request

```bash
curl -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticket": "INCIDENT: Users unable to make calls\nSYMPTOMS: SIP 408 timeout errors"}'
```

## Adding Custom Runbooks

Place markdown files in `backend/runbooks/` directory. The RAG system will automatically index them on startup.

**Runbook Format:**
```markdown
# Issue Category

## Problem Type

### Symptoms
- Symptom 1
- Symptom 2

### Root Causes
- Cause 1
- Cause 2

### Resolution Steps
1. Step 1
2. Step 2
```

## Deployment Options

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Connect Railway to your repo
3. Add environment variables
4. Deploy backend and frontend as separate services

### Option 2: Render

1. Create Web Service for backend (Python)
2. Create Static Site for frontend
3. Configure environment variables

### Option 3: Docker

```bash
# Build images
docker build -t incident-copilot-backend ./backend
docker build -t incident-copilot-frontend ./frontend

# Run with docker-compose
docker-compose up -d
```

## Demo Video

[Watch the demo](https://your-demo-link.com)

## License

MIT License

## Author

Your Name - [your.email@example.com](mailto:your.email@example.com)

## Acknowledgments

- OpenAI for GPT-4o-mini
- LlamaIndex for RAG framework
- Sentence Transformers for embeddings
