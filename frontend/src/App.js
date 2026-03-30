import { useState, useEffect, useCallback } from "react";
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
  User,
  ChartPie,
  Clock,
  Play,
  Stop,
  ArrowClockwise,
  CaretRight,
  Check,
  X,
  Timer,
  TrendUp,
  Users,
  Gauge
} from "@phosphor-icons/react";
import { Toaster, toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sample tickets
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
USER REPORTS: "Phone won't connect"
BUSINESS IMPACT: Contact center operations severely impacted`
  },
  {
    title: "Contact Center Queue Issue", 
    ticket: `INCIDENT: Calls not routing to available agents
TIME: Ongoing for past 2 hours
IMPACT: 200+ calls stuck in queue
SYMPTOMS:
- Agent states showing "Ready" in Finesse
- Queue showing 180 calls waiting
- Skill group shows 0 agents available
USER REPORTS: "I'm ready but no calls coming through"
BUSINESS IMPACT: Critical - SLA breached`
  },
  {
    title: "One-Way Audio Issue",
    ticket: `INCIDENT: Intermittent one-way audio on external calls
TIME: Reported by multiple users today
IMPACT: 15+ users experiencing issue
SYMPTOMS:
- Customer can hear agent, agent cannot hear customer
- Issue only on calls going through SBC
USER REPORTS: "Customer keeps saying hello but I can't hear them"`
  }
];

const PRIORITY_COLORS = {
  P1: "#E63946",
  P2: "#F59E0B", 
  P3: "#2563EB"
};

const STATUS_COLORS = {
  OPEN: "#E63946",
  IN_PROGRESS: "#F59E0B",
  RESOLVED: "#10B981"
};

function App() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [ticketText, setTicketText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingText, setLoadingText] = useState("");
  
  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, incRes, simRes] = await Promise.all([
        axios.get(`${API}/sla-dashboard`),
        axios.get(`${API}/incidents?limit=20`),
        axios.get(`${API}/simulate/status`)
      ]);
      setDashboard(dashRes.data);
      setIncidents(incRes.data);
      setSimulationRunning(simRes.data.running);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  }, []);

  // Auto-refresh dashboard
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchDashboard]);

  // Loading animation
  useEffect(() => {
    if (isAnalyzing) {
      const texts = ["ANALYZING...", "QUERYING RAG...", "COMPUTING...", "GENERATING..."];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!ticketText.trim()) {
      toast.error("Please enter a ticket");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await axios.post(`${API}/analyze`, { ticket: ticketText });
      setResult(response.data);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSimulation = async () => {
    try {
      if (simulationRunning) {
        await axios.post(`${API}/simulate/stop`);
        toast.info("Simulation stopped");
      } else {
        await axios.post(`${API}/simulate/start`);
        toast.success("Simulation started - incidents will auto-generate");
      }
      setSimulationRunning(!simulationRunning);
    } catch (error) {
      toast.error("Simulation toggle failed");
    }
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/incidents/${id}`, { status });
      toast.success(`Incident ${status.toLowerCase()}`);
      fetchDashboard();
      if (selectedIncident?.id === id) {
        setSelectedIncident({ ...selectedIncident, status });
      }
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const saveIncidentEdit = async () => {
    try {
      await axios.patch(`${API}/incidents/${selectedIncident.id}`, editData);
      toast.success("Incident updated");
      setEditMode(false);
      fetchDashboard();
    } catch (error) {
      toast.error("Save failed");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getSLAColor = (remaining, breached) => {
    if (breached) return "text-red-500";
    if (remaining < 30) return "text-red-500";
    if (remaining < 60) return "text-amber-500";
    return "text-green-500";
  };

  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined) return "--";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Priority badge component
  const PriorityBadge = ({ priority }) => {
    const classes = {
      P1: "bg-red-100 text-red-700 border-red-200",
      P2: "bg-amber-100 text-amber-700 border-amber-200",
      P3: "bg-blue-100 text-blue-700 border-blue-200"
    };
    const icons = { P1: <Lightning weight="fill" size={12} />, P2: <Warning weight="fill" size={12} />, P3: <Cpu size={12} /> };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border ${classes[priority]}`}>
        {icons[priority]} {priority}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const classes = {
      OPEN: "bg-red-100 text-red-700",
      IN_PROGRESS: "bg-amber-100 text-amber-700",
      RESOLVED: "bg-green-100 text-green-700"
    };
    return <span className={`px-2 py-0.5 text-xs font-bold ${classes[status]}`}>{status}</span>;
  };

  // Confidence band badge
  const ConfidenceBand = ({ band, score }) => {
    const classes = {
      HIGH: "bg-green-100 text-green-700",
      MEDIUM: "bg-amber-100 text-amber-700",
      LOW: "bg-red-100 text-red-700"
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-bold ${classes[band]}`}>
        {score}% ({band})
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b border-black/10 bg-white sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center">
                <Cpu className="text-white" size={24} weight="bold" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-black tracking-tighter">AI INCIDENT CO-PILOT</h1>
                <p className="text-xs font-mono text-gray-400">ENTERPRISE v2.0</p>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("analyze")}
                className={`px-4 py-2 text-sm font-bold transition-all ${activeTab === "analyze" ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                ANALYZE
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                DASHBOARD
              </button>
            </div>

            {/* Simulation Toggle */}
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all ${
                simulationRunning ? "bg-red-500 text-white" : "bg-green-500 text-white"
              }`}
            >
              {simulationRunning ? <Stop weight="fill" size={16} /> : <Play weight="fill" size={16} />}
              {simulationRunning ? "STOP SIM" : "START SIM"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-4">
        
        {/* ANALYZE TAB */}
        {activeTab === "analyze" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left - Input */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-black/10 p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">INCIDENT TICKET</span>
                  <span className="text-xs font-mono text-gray-400">{ticketText.length} chars</span>
                </div>
                <textarea
                  className="w-full h-64 p-3 border border-black/20 font-mono text-sm resize-none focus:border-black focus:ring-1 focus:ring-black outline-none"
                  placeholder="Paste incident ticket here..."
                  value={ticketText}
                  onChange={(e) => setTicketText(e.target.value)}
                  disabled={isAnalyzing}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !ticketText.trim()}
                  className="w-full mt-3 bg-black text-white py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? loadingText : <><ArrowRight weight="bold" /> ANALYZE</>}
                </button>
              </div>
              
              {/* Sample Tickets */}
              <div className="bg-white border border-black/10 p-4">
                <span className="text-xs font-mono text-gray-400 block mb-3">SAMPLE TICKETS</span>
                {SAMPLE_TICKETS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setTicketText(s.ticket); setResult(null); }}
                    className="w-full text-left px-3 py-2 mb-2 border border-black/10 hover:border-black text-sm flex items-center gap-2"
                  >
                    <Clipboard size={14} /> {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Right - Results */}
            <div className="lg:col-span-8 space-y-4">
              {isAnalyzing ? (
                <div className="bg-white border-2 border-black/20 p-12 flex flex-col items-center animate-pulse">
                  <Cpu size={48} className="mb-4" />
                  <p className="font-mono">{loadingText}</p>
                </div>
              ) : result ? (
                <>
                  {/* Priority & Confidence */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-black/10 p-4">
                      <span className="text-xs font-mono text-gray-400 block mb-2">PRIORITY</span>
                      <PriorityBadge priority={result.priority} />
                      <p className="text-xs mt-2 text-gray-500">SLA: {result.sla_target_minutes} min</p>
                    </div>
                    <div className="bg-white border border-black/10 p-4">
                      <span className="text-xs font-mono text-gray-400 block mb-2">CONFIDENCE</span>
                      <ConfidenceBand band={result.confidence_band} score={result.confidence_score} />
                      {result.needs_human_review && (
                        <p className="text-xs mt-2 text-amber-600 font-bold">⚠ NEEDS HUMAN REVIEW</p>
                      )}
                    </div>
                  </div>

                  {/* Key Signals */}
                  {result.key_signals?.length > 0 && (
                    <div className="bg-white border border-black/10 p-4">
                      <span className="text-xs font-mono text-gray-400 block mb-2">KEY SIGNALS DETECTED</span>
                      <div className="flex flex-wrap gap-2">
                        {result.key_signals.map((signal, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-xs font-mono">{signal}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-white border border-black/10 p-4">
                    <span className="text-xs font-mono text-gray-400 block mb-2">SUMMARY</span>
                    <p>{result.summary}</p>
                  </div>

                  {/* Root Cause & Resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-black/10 p-4">
                      <span className="text-xs font-mono text-gray-400 block mb-2">ROOT CAUSE</span>
                      <p className="text-sm">{result.root_cause}</p>
                    </div>
                    <div className="bg-white border border-black/10 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-400">RESOLUTION STEPS</span>
                        <button onClick={() => copyToClipboard(result.resolution_steps)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{result.resolution_steps}</p>
                    </div>
                  </div>

                  {/* Bridge Update */}
                  {result.priority === "P1" && result.bridge_update !== "N/A" && (
                    <div className="bg-black text-white p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-mono text-gray-400">P1 BRIDGE COMMUNICATION</span>
                        <button onClick={() => copyToClipboard(result.bridge_update)} className="text-xs text-blue-400 flex items-center gap-1">
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                      <p className="font-mono text-sm whitespace-pre-wrap">{result.bridge_update}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white border-2 border-dashed border-black/20 p-12 flex flex-col items-center text-gray-400">
                  <User size={48} className="mb-4" />
                  <p className="font-bold">Ready to Analyze</p>
                  <p className="text-sm">Paste a ticket or select a sample</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && dashboard && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-black/10 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <ChartPie size={16} />
                  <span className="text-xs font-mono">TOTAL INCIDENTS</span>
                </div>
                <p className="text-3xl font-black">{dashboard.total_incidents}</p>
              </div>
              <div className="bg-white border border-black/10 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Timer size={16} />
                  <span className="text-xs font-mono">ACTIVE</span>
                </div>
                <p className="text-3xl font-black text-amber-500">{dashboard.active_incidents}</p>
              </div>
              <div className="bg-white border border-black/10 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Warning size={16} />
                  <span className="text-xs font-mono">SLA BREACHED</span>
                </div>
                <p className="text-3xl font-black text-red-500">{dashboard.breach_percentage}%</p>
              </div>
              <div className="bg-white border border-black/10 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-mono">AVG RESOLUTION</span>
                </div>
                <p className="text-3xl font-black">{formatTime(dashboard.avg_resolution_minutes)}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority Pie Chart */}
              <div className="bg-white border border-black/10 p-4">
                <span className="text-xs font-mono text-gray-400 block mb-4">PRIORITY DISTRIBUTION</span>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "P1", value: dashboard.priority_breakdown.P1 },
                        { name: "P2", value: dashboard.priority_breakdown.P2 },
                        { name: "P3", value: dashboard.priority_breakdown.P3 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill={PRIORITY_COLORS.P1} />
                      <Cell fill={PRIORITY_COLORS.P2} />
                      <Cell fill={PRIORITY_COLORS.P3} />
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Bar Chart */}
              <div className="bg-white border border-black/10 p-4">
                <span className="text-xs font-mono text-gray-400 block mb-4">STATUS BREAKDOWN</span>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: "OPEN", value: dashboard.status_breakdown.OPEN, fill: STATUS_COLORS.OPEN },
                    { name: "IN_PROGRESS", value: dashboard.status_breakdown.IN_PROGRESS, fill: STATUS_COLORS.IN_PROGRESS },
                    { name: "RESOLVED", value: dashboard.status_breakdown.RESOLVED, fill: STATUS_COLORS.RESOLVED }
                  ]}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incidents Table */}
            <div className="bg-white border border-black/10">
              <div className="flex justify-between items-center p-4 border-b border-black/10">
                <span className="text-xs font-mono text-gray-400">RECENT INCIDENTS</span>
                <button onClick={fetchDashboard} className="text-xs flex items-center gap-1 text-blue-600">
                  <ArrowClockwise size={12} /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-mono text-gray-500">
                    <tr>
                      <th className="p-3 text-left">SUMMARY</th>
                      <th className="p-3 text-left">PRIORITY</th>
                      <th className="p-3 text-left">STATUS</th>
                      <th className="p-3 text-left">SLA TIMER</th>
                      <th className="p-3 text-left">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="border-t border-black/5 hover:bg-gray-50">
                        <td className="p-3 max-w-xs truncate">
                          <button onClick={() => setSelectedIncident(inc)} className="text-left hover:underline">
                            {inc.summary?.slice(0, 60)}...
                          </button>
                        </td>
                        <td className="p-3"><PriorityBadge priority={inc.priority} /></td>
                        <td className="p-3"><StatusBadge status={inc.status} /></td>
                        <td className={`p-3 font-mono ${getSLAColor(inc.sla_remaining_minutes, inc.sla_breached)}`}>
                          {inc.sla_breached ? "BREACHED" : formatTime(inc.sla_remaining_minutes)}
                        </td>
                        <td className="p-3">
                          {inc.status !== "RESOLVED" && (
                            <div className="flex gap-1">
                              {inc.status === "OPEN" && (
                                <button
                                  onClick={() => updateIncidentStatus(inc.id, "IN_PROGRESS")}
                                  className="px-2 py-1 bg-amber-100 text-amber-700 text-xs"
                                >
                                  Start
                                </button>
                              )}
                              <button
                                onClick={() => updateIncidentStatus(inc.id, "RESOLVED")}
                                className="px-2 py-1 bg-green-100 text-green-700 text-xs"
                              >
                                Resolve
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Incident Detail Modal */}
            {selectedIncident && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <h2 className="font-bold">Incident Details</h2>
                    <button onClick={() => { setSelectedIncident(null); setEditMode(false); }}>
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <PriorityBadge priority={selectedIncident.priority} />
                      <StatusBadge status={selectedIncident.status} />
                      <ConfidenceBand band={selectedIncident.confidence_band} score={selectedIncident.confidence_score} />
                    </div>
                    
                    {editMode ? (
                      <>
                        <div>
                          <label className="text-xs font-mono text-gray-400 block mb-1">SUMMARY</label>
                          <textarea
                            className="w-full p-2 border text-sm"
                            defaultValue={selectedIncident.summary}
                            onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-gray-400 block mb-1">ROOT CAUSE</label>
                          <textarea
                            className="w-full p-2 border text-sm"
                            defaultValue={selectedIncident.root_cause}
                            onChange={(e) => setEditData({ ...editData, root_cause: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-gray-400 block mb-1">RESOLUTION STEPS</label>
                          <textarea
                            className="w-full p-2 border text-sm h-32"
                            defaultValue={selectedIncident.resolution_steps}
                            onChange={(e) => setEditData({ ...editData, resolution_steps: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveIncidentEdit} className="px-4 py-2 bg-black text-white text-sm">Save</button>
                          <button onClick={() => setEditMode(false)} className="px-4 py-2 border text-sm">Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-xs font-mono text-gray-400 block mb-1">SUMMARY</span>
                          <p>{selectedIncident.summary}</p>
                        </div>
                        <div>
                          <span className="text-xs font-mono text-gray-400 block mb-1">ROOT CAUSE</span>
                          <p>{selectedIncident.root_cause}</p>
                        </div>
                        <div>
                          <span className="text-xs font-mono text-gray-400 block mb-1">RESOLUTION STEPS</span>
                          <p className="whitespace-pre-wrap">{selectedIncident.resolution_steps}</p>
                        </div>
                        {selectedIncident.key_signals?.length > 0 && (
                          <div>
                            <span className="text-xs font-mono text-gray-400 block mb-1">KEY SIGNALS</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedIncident.key_signals.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-xs">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-4 border-t">
                          <button onClick={() => setEditMode(true)} className="px-4 py-2 border text-sm">Edit</button>
                          <button onClick={() => copyToClipboard(selectedIncident.resolution_steps)} className="px-4 py-2 border text-sm flex items-center gap-1">
                            <Copy size={14} /> Copy Resolution
                          </button>
                          {selectedIncident.status !== "RESOLVED" && (
                            <button
                              onClick={() => updateIncidentStatus(selectedIncident.id, "RESOLVED")}
                              className="px-4 py-2 bg-green-500 text-white text-sm"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 mt-12 py-4">
        <div className="max-w-[1800px] mx-auto px-4 flex justify-between text-xs font-mono text-gray-400">
          <span>AI INCIDENT CO-PILOT ENTERPRISE v2.0</span>
          <span>GROQ LLAMA-3.3 + RAG + SLA TRACKING</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
