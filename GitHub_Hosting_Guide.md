# GitHub Hosting Guide for AI Incident Co-Pilot

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click "New" to create a new repository
3. Name it: `ai-incident-copilot`
4. Set to Public
5. Don't initialize with README (we'll push our own)
6. Click "Create repository"

## Step 2: Prepare Project Files

Download or copy these files from the project:

```
ai-incident-copilot/
├── README.md
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── server.py
│   ├── rag_service.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── runbooks/
│       ├── sip_failures.md
│       ├── contact_center_issues.md
│       ├── network_infrastructure.md
│       ├── server_infrastructure.md
│       └── voip_quality.md
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   └── index.css
    ├── package.json
    ├── .env.example
    └── Dockerfile
```

## Step 3: Push to GitHub

```bash
# Clone your empty repo
git clone https://github.com/yourusername/ai-incident-copilot.git
cd ai-incident-copilot

# Copy all project files into this folder
# Then:
git add .
git commit -m "Initial commit: AI Incident Co-Pilot"
git push origin main
```

## Step 4: Deploy (Choose One Option)

### Option A: Railway (Easiest - Recommended)

1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `ai-incident-copilot` repository
6. Railway will detect both services

**Add Environment Variables:**
- Click on the backend service
- Go to "Variables" tab
- Add:
  ```
  OPENAI_API_KEY=your_openai_api_key
  MONGO_URL=mongodb://mongo:27017
  DB_NAME=incident_copilot
  CORS_ORIGINS=*
  ```

**Add MongoDB:**
- Click "New" → "Database" → "MongoDB"
- Railway provides a free MongoDB instance
- Copy the connection URL and update MONGO_URL

### Option B: Render (Free Tier)

**Deploy Backend:**
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - Name: `incident-copilot-backend`
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (OPENAI_API_KEY, MONGO_URL)

**Deploy Frontend:**
1. Click "New" → "Static Site"
2. Connect your GitHub repo
3. Configure:
   - Name: `incident-copilot-frontend`
   - Root Directory: `frontend`
   - Build Command: `yarn install && yarn build`
   - Publish Directory: `build`
4. Add environment variable:
   - `REACT_APP_BACKEND_URL=https://incident-copilot-backend.onrender.com`

### Option C: Vercel + Railway

**Frontend on Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set root directory to `frontend`
4. Add env var: `REACT_APP_BACKEND_URL`
5. Deploy (automatic)

**Backend on Railway:**
- Follow Railway steps above for backend only

### Option D: Local Docker

```bash
# In project root
docker-compose up -d

# Access at http://localhost:3000
```

## MongoDB Options

### Free Cloud MongoDB (MongoDB Atlas)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 tier - free forever)
3. Get connection string
4. Use in MONGO_URL environment variable

### Local MongoDB
```bash
# Install MongoDB locally or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Environment Variables Reference

### Backend (.env)
```
OPENAI_API_KEY=sk-your-openai-key-here
MONGO_URL=mongodb://localhost:27017
DB_NAME=incident_copilot
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Verifying Deployment

1. Open frontend URL in browser
2. Click a sample ticket
3. Click "Analyze Incident"
4. Verify results appear with priority, summary, etc.

## Troubleshooting

**Backend not starting:**
- Check logs for missing dependencies
- Verify OPENAI_API_KEY is set
- Check MongoDB connection

**Frontend not connecting:**
- Verify REACT_APP_BACKEND_URL points to backend
- Check CORS_ORIGINS includes frontend URL

**Analysis failing:**
- Check OpenAI API key is valid
- Verify runbooks folder exists with .md files
