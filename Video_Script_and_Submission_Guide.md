# AI Incident Co-Pilot — Video Script & Submission Guide

---

## PART 1: VIDEO SCRIPT (3-5 minutes)

---

### INTRO (0:00 - 0:30)

> "Hi, I'm Siddharth Dutt, and this is the **AI Incident Co-Pilot** — an enterprise-grade AI tool built for IT support teams managing Unified Communications and Contact Center infrastructure.
>
> In IT operations, when a P1 outage hits — 100 phones go down, SIP errors are flooding logs, and the bridge call is waiting — every minute counts. Engineers waste critical time reading through tickets, diagnosing root causes, and searching runbooks manually.
>
> My solution uses AI to do all of that in seconds. Let me show you."

---

### DEMO: ANALYZE TAB (0:30 - 1:45)

> "Here's the live app deployed on Render."

**[Show the ANALYZE tab on screen]**

> "I'll click a sample ticket — this one simulates a SIP Registration Failure affecting 50+ contact center agents."

**[Click 'SIP Registration Failure' sample ticket → Click ANALYZE]**

> "The AI processes this through two layers:
> 1. **BM25 RAG** — retrieves relevant context from our domain-specific runbooks covering SIP, VoIP, routing, and server issues.
> 2. **Groq's LLama-3.3 70B model** — generates a structured analysis.
>
> In about 2 seconds, we get:
> - **Priority: P2** — it detected 50+ users impacted, which is degraded service
> - **Confidence: 85% HIGH** — the AI is confident in this diagnosis
> - **Key Signals** detected automatically — SIP 408 timeout, high CPU, user impact count
> - **Root Cause** — it identified the CUCM Publisher CPU overload causing registration failures
> - **Resolution Steps** — step-by-step fix: check CPU, restart services, verify SIP trunk
> - And since this could be a P1, it even drafted a **Bridge Communication** update
>
> I can also **Export this as a PDF** with one click — ready for the incident report."

---

### DEMO: DASHBOARD TAB (1:45 - 2:30)

**[Click DASHBOARD tab]**

> "The SLA Dashboard gives real-time operational visibility:
> - **KPI Cards** — Total incidents, active count, SLA breach percentage, average resolution time
> - **Priority Distribution** chart — how many P1s vs P2s vs P3s
> - **Status Breakdown** — open vs in-progress vs resolved
> - **Live Incidents Table** — I can Start, Resolve, or Export any incident right here
>
> Let me also show the **Simulation Engine** — I'll click START SIM."

**[Click START SIM button]**

> "This auto-generates realistic incidents every 15-45 seconds using the Groq API — great for demos and load testing. The dashboard updates in real-time."

**[Click STOP SIM after a few seconds]**

---

### DEMO: HISTORY TAB (2:30 - 3:15)

**[Click HISTORY tab]**

> "The History page gives a complete audit trail of every analyzed incident.
> - I can **filter by priority** — let me select P1 only
> - **Filter by status** — say, only OPEN incidents
> - **Search text** across summaries
> - **Date range** picker for time-based queries
> - Results are **paginated** — 15 per page
> - Every row has a **PDF export** button
>
> This is critical for post-incident reviews and compliance reporting."

---

### DEMO: TRENDS TAB (3:15 - 3:50)

**[Click TRENDS tab]**

> "Finally, the Trends page provides analytics that help teams spot systemic problems:
> - **Incident Volume Over Time** — are incidents increasing?
> - **MTTR (Mean Time To Resolution)** — are we getting faster or slower?
> - **Priority Distribution Over Time** — are P1s trending up?
> - **Recurring Patterns** — the system automatically extracts keywords like SIP, timeout, CPU, DNS — showing which issues keep coming back.
>
> This helps management make data-driven decisions about infrastructure investments."

---

### CLOSING (3:50 - 4:30)

> "To summarize what makes this solution valuable:
>
> 1. **Time Saved** — What takes an engineer 15-30 minutes of manual analysis, the AI does in 2-3 seconds
> 2. **Consistency** — Every ticket gets the same thorough analysis with confidence scoring
> 3. **Domain Knowledge** — BM25 RAG retrieves from 5 UC/CC runbooks — the AI doesn't just guess, it references real operational procedures
> 4. **Lightweight & Deployable** — Runs on Render's free tier with just 512MB RAM. No heavy ML models — uses Groq cloud API and BM25 keyword search
> 5. **Enterprise Features** — SLA tracking, PDF exports, historical analytics, real-time simulation
>
> The tech stack is React, FastAPI, MongoDB, Groq LLM, and BM25 RAG — all deployed on Render.
>
> Thank you for watching!"

---
---

## PART 2: FORM SUBMISSION ANSWERS

---

### Project Title
```
AI Incident Co-Pilot Enterprise — AI-Powered IT Incident Analysis with RAG, SLA Tracking & Analytics
```

### What real-world problem are you solving?
```
In IT operations supporting Unified Communications (UC) and Contact Center (CC) infrastructure, when critical incidents occur (phones down, call routing failures, audio issues), support engineers waste 15-30 minutes per ticket manually reading logs, searching runbooks, classifying severity, and drafting root cause analysis. During P1 outages affecting hundreds of users, this delay directly impacts business SLA compliance and customer experience. There is no fast, consistent way to triage incidents, identify root causes from domain knowledge, and generate resolution steps automatically.
```

### Who is this problem for? (Profession / domain / user type)
```
IT Operations Engineers, Network Operations Center (NOC) analysts, Contact Center support teams, UC/CC infrastructure administrators, and IT Service Desk managers in enterprises running Cisco, Avaya, or similar UC/CC platforms. Also useful for Managed Service Providers (MSPs) handling multi-tenant IT support.
```

### How does your solution use AI?
```
The solution uses AI in two layers:

1. RAG (Retrieval-Augmented Generation): BM25 keyword-based retrieval searches through 5 domain-specific runbooks (SIP failures, Contact Center issues, VoIP quality, network infrastructure, server infrastructure) to find relevant operational knowledge for each incident.

2. LLM Analysis: The retrieved runbook context + incident ticket is sent to Groq's LLama-3.3-70B model, which generates a structured JSON response containing: priority classification (P1/P2/P3), root cause analysis, step-by-step resolution, confidence score (0-100%), and P1 bridge communication drafts.

The AI also extracts key signals (SIP error codes, user impact counts, CPU levels) and flags low-confidence results for human review.
```

### What AI Tools / Platforms have you used
```
- Groq Cloud API (LLama-3.3-70B-Versatile model) — for LLM-powered incident analysis
- BM25 (rank_bm25 Python library) — lightweight keyword-based RAG retrieval
- FastAPI (Python backend) — API server
- React 19 + Recharts — frontend with interactive charts
- MongoDB — incident storage
- jsPDF — client-side PDF report generation
- Render — cloud deployment (free tier compatible)
```

### How does your solution help the user?
```
1. TIME SAVED: Reduces incident triage from 15-30 minutes to 2-3 seconds per ticket — that's a 99% reduction in analysis time.

2. COST REDUCED: Eliminates need for senior engineers to manually classify every ticket. Junior staff can handle incidents confidently with AI-generated resolution steps.

3. EFFORT REDUCED: Auto-generates root cause analysis, resolution steps, and P1 bridge communications — tasks that previously required reading multiple runbooks and writing reports manually.

4. REVENUE PROTECTED: Faster incident resolution means less downtime. For contact centers handling thousands of calls/day, every minute of downtime costs revenue. SLA tracking ensures breach visibility.

5. CONSISTENCY: Every ticket gets the same thorough analysis with confidence scoring — no more variability between shifts or analysts.
```

### Please share GOOGLE DRIVE link
```
[Upload your demo video, screenshots, and code files to Google Drive and paste the shareable link here]
```

### Explain your solution in detail
```
AI Incident Co-Pilot is an enterprise web application that analyzes IT incident tickets for UC/CC infrastructure support using AI.

WHAT I BUILT:
- A React frontend with 4 tabs: Analyze (AI ticket analysis), Dashboard (real-time SLA tracking with charts), History (searchable incident archive with filters and pagination), and Trends (analytics showing volume, MTTR, priority distribution, and recurring patterns).
- A FastAPI backend with Groq LLM integration and BM25 RAG that retrieves context from 5 domain-specific runbooks.
- MongoDB storage with in-memory fallback, WebSocket real-time updates, and a simulation engine that auto-generates realistic incidents.
- PDF export capability on every incident for compliance reporting.

WHY IT'S USEFUL:
- IT teams supporting UC/CC infrastructure deal with complex, time-sensitive incidents. This tool provides instant, knowledge-backed analysis that would normally take a senior engineer 15-30 minutes.
- The lightweight architecture (BM25 instead of vector embeddings) means it runs on Render's free tier with just 512MB RAM — making it accessible to small teams without GPU infrastructure.
- SLA tracking and trends analytics help management identify systemic issues and make data-driven infrastructure decisions.

TECH STACK: React 19, Tailwind CSS, Recharts, jsPDF, FastAPI, Groq (LLama-3.3-70B), BM25 RAG, MongoDB, Render.
```

### What was the biggest challenge you faced during this hackathon?
```
The biggest challenge was making the AI-powered application deployable on Render's free tier with only 512MB RAM. My initial implementation used LlamaIndex with sentence-transformers and FAISS for vector-based RAG — but these ML libraries (PyTorch alone is 2GB+) caused immediate Out-of-Memory crashes on Render.

I had to completely rearchitect the RAG system — replacing the entire vector embedding pipeline with BM25 keyword-based retrieval (rank_bm25 library, just 5MB). This meant sacrificing semantic similarity search but gaining a working deployment. I also moved from OpenAI to Groq for faster inference, which required rewriting the LLM integration and ensuring the JSON response format remained consistent so the frontend charts and confidence scoring didn't break.

The second challenge was ensuring the LLM consistently returned valid, parseable JSON. LLMs sometimes return markdown-wrapped JSON or add explanatory text. I built a robust parser with fallback handling and retry logic to ensure the frontend never crashes on malformed AI responses.
```

### Confirmation checkbox
```
✓ I hereby confirm that I have uploaded video file explaining the project under google drive link
```

---

## PART 3: VIDEO RECORDING TIPS

1. **Screen record** using OBS Studio (free) or Loom — record at 1080p
2. **Open the live Render URL** in Chrome (fullscreen)
3. **Use a clear, steady voice** — you can record voiceover separately if needed
4. **Keep mouse movements deliberate** — pause briefly on each result so viewers can read
5. **Target 4 minutes** — the script above is ~4:15 at normal speaking pace
6. **Upload to Google Drive** as MP4, set sharing to "Anyone with the link can view"
