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
