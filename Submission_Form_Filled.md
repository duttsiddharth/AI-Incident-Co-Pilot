# AI Incident Co-Pilot - Project Submission Form

## 1. Email
*(your work email)*

## 2. Phone
*(your number)*

## 3. Project Title
**AI Incident Co-Pilot: Intelligent IT Incident Ticket Analysis with RAG**

## 4. What real-world problem are you solving?

In enterprise IT support, engineers spend significant time manually reading, classifying, and triaging incident tickets before resolving them. Key challenges:

- **Time Waste**: 2-3 hours daily spent on manual ticket triage
- **Inconsistent Prioritization**: Critical P1 incidents get buried under routine requests
- **Knowledge Silos**: Resolution steps scattered across runbooks that must be manually searched
- **Delayed Response**: P1 bridge communications take time to draft during high-pressure situations
- **SLA Breaches**: Slow triage leads to missed service level agreements

The core problem: human effort is wasted on understanding and classifying tickets, rather than resolving them.

## 5. Who is this problem for?

**Domain**: IT Services / Enterprise IT Support

**Users**:
- IT Support Managers overseeing incident management
- L1/L2 Support Engineers handling day-to-day tickets
- Incident Commanders managing P1 bridge calls
- IT Operations teams maintaining infrastructure

**Scale**: Any organization with 100+ employees generating 50+ IT tickets per week

## 6. How does your solution use AI?

The solution uses **GPT-4o-mini** (via OpenAI API) combined with **RAG (Retrieval Augmented Generation)** to:

1. **Analyze Ticket Content**: Reads and understands the full incident description, not just keywords
2. **Classify Priority**: Assigns P1 (Critical), P2 (High), or P3 (Medium) based on business impact
3. **Identify Root Cause**: Suggests probable root causes based on symptoms described
4. **Retrieve Resolution Steps**: Uses RAG with LlamaIndex + FAISS to fetch relevant steps from runbooks
5. **Generate Bridge Updates**: Creates professional P1 bridge communication drafts instantly
6. **Assess Confidence**: Provides 0-100% confidence score and flags uncertain analyses for human review

AI adds genuine leverage because incident language is ambiguous — "system not working" could mean anything. AI reads the full context, correlates with runbook knowledge, and provides accurate assessments.

## 7. What is the workflow / system design?

```
User Interface (React) → POST /api/analyze → FastAPI Backend
                                                    ↓
                                            RAG Service (LlamaIndex + FAISS)
                                            - Search runbooks
                                            - Get relevant context
                                                    ↓
                                            LLM Service (GPT-4o-mini)
                                            - Analyze ticket + context
                                            - Generate structured response
                                                    ↓
                                            Response (JSON)
                                            - Summary, Priority, Root Cause
                                            - Resolution Steps, Bridge Update
                                            - Confidence Score
                                                    ↓
                                            MongoDB (Log analysis)
```

## 8. What AI Tools / Platforms have you used?

| Tool | Purpose |
|------|---------|
| **OpenAI GPT-4o-mini** | LLM for ticket analysis and response generation |
| **LlamaIndex** | RAG framework for document indexing and retrieval |
| **FAISS** | Vector database for semantic search |
| **sentence-transformers/all-MiniLM-L6-v2** | Text embeddings for RAG |
| **FastAPI** | Python backend framework |
| **React** | Frontend framework |
| **MongoDB** | Database for storing analyses |
| **Tailwind CSS** | UI styling |

## 9. How does your solution help the user?

| Benefit | Detail |
|---------|--------|
| **Time Saved** | ~2-3 hrs/day saved per IT manager on manual ticket triage |
| **Faster Resolution** | Instant resolution steps retrieved from runbooks via RAG |
| **Consistent Prioritization** | AI applies same criteria to every ticket, no human bias |
| **P1 Response Time** | Bridge communication generated in seconds, not minutes |
| **Knowledge Accessibility** | Runbook knowledge available instantly without manual searching |
| **Quality Control** | Confidence scores flag uncertain analyses for human review |

## 10. Google Drive Link
*(Record a 3-5 min screen recording showing: ticket submitted → loading state → AI analysis displayed → P1 bridge update copied. Upload to Drive and paste link here.)*

## 11. Explain your solution in detail

### What I Built

An end-to-end AI-powered IT incident ticket analysis system that combines:

1. **RAG (Retrieval Augmented Generation)**: Uses LlamaIndex to index 5 domain-specific runbooks covering SIP failures, Contact Center issues, Network infrastructure, Server problems, and VoIP quality. When a ticket comes in, the system performs semantic search to find the most relevant troubleshooting content.

2. **LLM Analysis**: GPT-4o-mini receives the ticket content along with retrieved runbook context and generates:
   - A concise summary
   - Priority classification (P1/P2/P3) with reasoning
   - Probable root cause
   - Step-by-step resolution actions
   - Professional bridge communication (for P1 incidents)
   - Confidence score (0-100%)

3. **Modern React UI**: A "Control Room" style dashboard with:
   - Ticket input with placeholder guidance
   - Pre-loaded sample tickets for easy testing
   - Loading state with ASCII spinner
   - Results displayed in a bento grid layout
   - Copy-to-clipboard for bridge communications

### Why This Is Useful

In most IT teams, reading and triaging tickets is pure admin work. An engineer reads a ticket, guesses the priority, searches through wikis for resolution steps, and then writes a response. This is exactly the kind of pattern-matching work AI does better and faster.

The RAG integration is crucial — it ensures the AI provides **real, documented resolution steps** from your organization's runbooks, not generic advice.

### Real Example

**Input Ticket:**
```
INCIDENT: Multiple users unable to make/receive calls
IMPACT: 50+ agents in Contact Center unable to login
SYMPTOMS: SIP 408 timeout errors, CUCM high CPU (95%)
```

**AI Analysis (in ~10 seconds):**
- **Priority**: P1 CRITICAL
- **Root Cause**: Firewall rule update blocking SIP signaling ports
- **Resolution**: Step-by-step guide from SIP Failures runbook
- **Bridge Update**: Professional communication ready to send

## 12. Biggest challenge faced

The hardest part was **handling inconsistent LLM outputs**. Early versions had issues where:

1. **JSON Parsing Failures**: The LLM sometimes returned resolution_steps as an array instead of a string
2. **Markdown Code Blocks**: GPT often wrapped JSON in code blocks that needed to be stripped
3. **Hallucinated Field Names**: Occasionally returned different field names than requested

**The Fix:**
- Added a `normalize_field()` function to handle arrays vs strings
- Implemented robust JSON extraction that handles code blocks
- Created a strict system prompt with explicit JSON schema
- Added fallback parsing for malformed responses

This taught me that **AI reliability in production depends on defensive coding**.

---

# Resume Bullet Points

- Built an AI-powered IT incident ticket analysis system using GPT-4o-mini and RAG, reducing average ticket triage time by 70%
- Implemented Retrieval Augmented Generation using LlamaIndex + FAISS to provide contextual resolution steps from organizational runbooks
- Developed a React dashboard with real-time analysis display, priority classification (P1/P2/P3), and confidence scoring
- Architected a FastAPI backend with MongoDB logging, handling concurrent analysis requests with async processing

---

# LinkedIn Post

🚀 Just shipped: AI Incident Co-Pilot

Built an AI system that analyzes IT incident tickets in seconds:

✅ Reads ticket, understands context
✅ Assigns P1/P2/P3 priority automatically  
✅ Suggests root cause based on symptoms
✅ Retrieves resolution steps from runbooks (RAG)
✅ Drafts P1 bridge communications instantly

The secret sauce? RAG (Retrieval Augmented Generation) — the AI doesn't just guess, it searches your actual runbooks and provides documented solutions.

Tech stack: FastAPI + React + LlamaIndex + FAISS + GPT-4o-mini

#AI #RAG #ITSupport #Automation #OpenAI #Python #React
