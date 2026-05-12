import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ── Shared palette ─────────────────────────────────────────────────────────
const C = {
  splunkGreen: "#65A637",
  splunkOrange: "#F58220",
  splunkRed: "#D41F1F",
  splunkGray: "#8B8D98",
  splunkBg: "#1A1A24",
  splunkPanel: "#212132",
  splunkBorder: "#333348",
  dtPurple: "#1496FF",
  dtDeep: "#0D1825",
  dtPanel: "#131D2B",
  dtBorder: "#1E3042",
  dtGreen: "#00A86D",
  dtAmber: "#F28C00",
  dtRed: "#CC0F1B",
  dtText: "#B4D5F8",
};

// ── Demo data generators ────────────────────────────────────────────────────
function genTimeSeries(points = 20, base = 100, noise = 30) {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    t: new Date(now - (points - i) * 60000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    v: Math.max(0, Math.round(base + (Math.random() - 0.5) * noise * 2)),
  }));
}

const splunkSearches = [
  { search: "index=main sourcetype=syslog ERROR | timechart count by host", events: 1842, dur: "0.42s" },
  { search: "index=itops alert_severity=CRITICAL | stats count by service", events: 217, dur: "0.18s" },
  { search: "index=apm response_time>2000 | top url limit=10", events: 589, dur: "0.61s" },
  { search: "index=security failed_login | timechart span=5m count", events: 93, dur: "0.29s" },
];

const splunkAlerts = [
  { name: "CPU Spike – prod-web-03", severity: "CRITICAL", time: "2m ago", count: 4 },
  { name: "Log ingestion lag > 5s", severity: "WARNING", time: "8m ago", count: 1 },
  { name: "Auth failure burst", severity: "HIGH", time: "14m ago", count: 7 },
  { name: "Memory threshold 85%", severity: "WARNING", time: "31m ago", count: 2 },
];

const dtProblems = [
  { id: "P-10042", title: "Response time degradation – payment-svc", impact: "HIGH", status: "OPEN", age: "5m" },
  { id: "P-10039", title: "Failure rate spike – inventory-api", impact: "CRITICAL", status: "OPEN", age: "22m" },
  { id: "P-10031", title: "GC pressure – order-processor", impact: "MEDIUM", status: "RESOLVED", age: "1h" },
  { id: "P-10028", title: "Network error burst – cdn-edge-01", impact: "LOW", status: "RESOLVED", age: "2h" },
];

const dtServices = [
  { name: "payment-svc", health: 72, rt: 480, calls: 1240, errors: "3.1%" },
  { name: "inventory-api", health: 55, rt: 890, calls: 680, errors: "8.4%" },
  { name: "user-auth", health: 98, rt: 42, calls: 4100, errors: "0.1%" },
  { name: "order-processor", health: 91, rt: 210, calls: 920, errors: "0.7%" },
  { name: "notification-svc", health: 88, rt: 135, calls: 310, errors: "1.2%" },
];

// ── Severity / health badges ────────────────────────────────────────────────
function SevBadge({ level }) {
  const map = {
    CRITICAL: { bg: "#2D0A0A", color: C.dtRed, label: "CRITICAL" },
    HIGH:     { bg: "#2D1A00", color: C.dtAmber, label: "HIGH" },
    WARNING:  { bg: "#2D1A00", color: C.dtAmber, label: "WARNING" },
    MEDIUM:   { bg: "#1A2B1A", color: C.dtGreen, label: "MEDIUM" },
    LOW:      { bg: "#0D1825", color: C.dtPurple, label: "LOW" },
  };
  const s = map[level] || map.LOW;
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 600,
      padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em",
      border: `1px solid ${s.color}33`,
    }}>{s.label}</span>
  );
}

function HealthBar({ pct }) {
  const color = pct >= 90 ? C.dtGreen : pct >= 70 ? C.dtAmber : C.dtRed;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#1E3042", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, color, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

// ── Metric tile ─────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "#1a1a2a", border: `1px solid #333348`,
      borderRadius: 8, padding: "14px 18px", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: "#8B8D98", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: accent || "#E8E8F0" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#8B8D98", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SPLUNK DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function SplunkDashboard() {
  const [epsData] = useState(() => genTimeSeries(20, 3800, 800));
  const [errData] = useState(() => genTimeSeries(20, 60, 40));
  const [activeSearch, setActiveSearch] = useState(null);

  return (
    <div style={{ background: C.splunkBg, borderRadius: 10, overflow: "hidden", fontFamily: "'Splunk Platform Sans', 'Roboto', monospace" }}>
      {/* Header bar */}
      <div style={{
        background: C.splunkPanel, borderBottom: `1px solid ${C.splunkBorder}`,
        padding: "10px 18px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <SplunkLogo />
        <span style={{ fontSize: 13, color: "#C8C8D8", fontWeight: 600 }}>Splunk Enterprise · ITSI</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.splunkGray }}>Demo · Live Search Head</span>
        <span style={{
          background: "#1A3A1A", color: C.splunkGreen, fontSize: 11, padding: "3px 10px",
          borderRadius: 20, border: `1px solid ${C.splunkGreen}55`,
        }}>● Connected</span>
      </div>

      {/* Nav tabs */}
      <SplunkNav />

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Tile label="Events / sec" value="3,847" sub="↑ 12% vs 1h avg" accent={C.splunkGreen} />
          <Tile label="Active searches" value="24" sub="4 real-time" />
          <Tile label="Ingestion today" value="1.2 TB" sub="of 2 TB licence" />
          <Tile label="Open alerts" value="3" sub="1 critical" accent={C.splunkRed} />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel title="Events per second (last 20 min)" bg={C.splunkPanel} border={C.splunkBorder}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={epsData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="t" tick={{ fill: C.splunkGray, fontSize: 10 }} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.splunkGray, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: C.splunkPanel, border: `1px solid ${C.splunkBorder}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke={C.splunkGreen} fill={`${C.splunkGreen}22`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Error events (last 20 min)" bg={C.splunkPanel} border={C.splunkBorder}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={errData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="t" tick={{ fill: C.splunkGray, fontSize: 10 }} tickLine={false} interval={4} />
                <YAxis tick={{ fill: C.splunkGray, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: C.splunkPanel, border: `1px solid ${C.splunkBorder}`, fontSize: 12 }} />
                <Bar dataKey="v" fill={C.splunkRed} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Recent searches */}
        <Panel title="Recent searches" bg={C.splunkPanel} border={C.splunkBorder}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.splunkBorder}` }}>
                {["Search query", "Events", "Duration", "Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: C.splunkGray, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {splunkSearches.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.splunkBorder}22` }}
                  onMouseEnter={e => e.currentTarget.style.background = "#ffffff08"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "8px 10px", color: "#C8C8D8", fontFamily: "monospace", fontSize: 11 }}>{s.search}</td>
                  <td style={{ padding: "8px 10px", color: C.splunkGreen }}>{s.events.toLocaleString()}</td>
                  <td style={{ padding: "8px 10px", color: C.splunkGray }}>{s.dur}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <button
                      onClick={() => setActiveSearch(s)}
                      style={{
                        background: "transparent", border: `1px solid ${C.splunkGreen}55`, color: C.splunkGreen,
                        fontSize: 10, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                      }}>Run</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Alerts */}
        <Panel title="Notable events / alerts" bg={C.splunkPanel} border={C.splunkBorder}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {splunkAlerts.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#ffffff05", borderRadius: 6, padding: "10px 14px",
                border: `1px solid ${C.splunkBorder}`,
              }}>
                <SevDot sev={a.severity} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E0E0F0" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.splunkGray }}>{a.time} · {a.count} occurrence{a.count > 1 ? "s" : ""}</div>
                </div>
                <SevBadge level={a.severity} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Modal overlay for "Run" */}
        {activeSearch && (
          <div style={{
            position: "fixed", inset: 0, background: "#000000CC", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={() => setActiveSearch(null)}>
            <div style={{
              background: C.splunkPanel, border: `1px solid ${C.splunkBorder}`,
              borderRadius: 10, padding: 24, width: 480, maxWidth: "90vw",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 13, color: C.splunkGray, marginBottom: 10 }}>Search · executing…</div>
              <div style={{
                fontFamily: "monospace", fontSize: 12, color: C.splunkGreen,
                background: "#0D0D18", padding: "12px 14px", borderRadius: 6,
                marginBottom: 16, wordBreak: "break-all",
              }}>{activeSearch.search}</div>
              <div style={{ display: "flex", gap: 20 }}>
                <div><div style={{ fontSize: 11, color: C.splunkGray }}>Events matched</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.splunkGreen }}>{activeSearch.events.toLocaleString()}</div></div>
                <div><div style={{ fontSize: 11, color: C.splunkGray }}>Search time</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#E0E0F0" }}>{activeSearch.dur}</div></div>
              </div>
              <button onClick={() => setActiveSearch(null)} style={{
                marginTop: 16, background: "transparent", border: `1px solid ${C.splunkBorder}`,
                color: C.splunkGray, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12,
              }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SevDot({ sev }) {
  const color = sev === "CRITICAL" ? C.dtRed : sev === "HIGH" || sev === "WARNING" ? C.dtAmber : C.dtGreen;
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function SplunkNav() {
  const tabs = ["Search & Reporting", "ITSI", "Dashboards", "Alerts", "Settings"];
  const [active, setActive] = useState("ITSI");
  return (
    <div style={{ display: "flex", gap: 2, padding: "0 18px", background: "#16162A", borderBottom: `1px solid ${C.splunkBorder}` }}>
      {tabs.map(t => (
        <button key={t} onClick={() => setActive(t)} style={{
          background: active === t ? C.splunkBg : "transparent",
          border: "none", borderBottom: active === t ? `2px solid ${C.splunkGreen}` : "2px solid transparent",
          color: active === t ? "#E8E8F0" : C.splunkGray,
          padding: "8px 14px", fontSize: 12, cursor: "pointer", fontWeight: active === t ? 600 : 400,
        }}>{t}</button>
      ))}
    </div>
  );
}

function SplunkLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill={C.splunkGreen} />
      <text x="4" y="17" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="monospace">&gt;_</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DYNATRACE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DynatraceDashboard() {
  const [rtData] = useState(() => genTimeSeries(20, 280, 120));
  const [errRateData] = useState(() => genTimeSeries(20, 2.5, 4));
  const [throughput] = useState(() => genTimeSeries(20, 1200, 300));

  return (
    <div style={{ background: C.dtDeep, borderRadius: 10, overflow: "hidden", fontFamily: "'Source Sans Pro', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: C.dtPanel, borderBottom: `1px solid ${C.dtBorder}`,
        padding: "10px 18px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <DynatraceLogo />
        <span style={{ fontSize: 13, color: "#B4D5F8", fontWeight: 600 }}>Dynatrace · Smartscape</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4A7FA8" }}>Davis AI · Demo Tenant</span>
        <span style={{
          background: "#001A2E", color: C.dtPurple, fontSize: 11, padding: "3px 10px",
          borderRadius: 20, border: `1px solid ${C.dtPurple}55`,
        }}>● OneAgent Active</span>
      </div>

      {/* Top nav */}
      <DtNav />

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Tile label="Open problems" value="2" sub="1 critical" accent={C.dtRed} />
          <Tile label="Avg response time" value="284 ms" sub="↑ 18% vs baseline" accent={C.dtAmber} />
          <Tile label="Error rate" value="2.4%" sub="↑ from 0.9% baseline" accent={C.dtAmber} />
          <Tile label="Services monitored" value="47" sub="5 unhealthy" accent={C.dtPurple} />
        </div>

        {/* Problems */}
        <Panel title="Davis AI · open problems" bg={C.dtPanel} border={C.dtBorder}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dtProblems.map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: p.status === "OPEN" ? "#0D1C2E" : "#0A1510",
                borderRadius: 6, padding: "10px 14px",
                border: `1px solid ${p.status === "OPEN" ? C.dtBorder : "#1E3028"}`,
              }}>
                <span style={{ fontSize: 11, color: "#4A7FA8", fontFamily: "monospace", minWidth: 60 }}>{p.id}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: p.status === "OPEN" ? "#D0E8FF" : "#6A9A7A" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "#4A7FA8", marginTop: 2 }}>{p.age} ago · {p.status}</div>
                </div>
                <SevBadge level={p.impact} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel title="Response time (ms)" bg={C.dtPanel} border={C.dtBorder}>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={rtData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3042" />
                <XAxis dataKey="t" tick={{ fill: "#4A7FA8", fontSize: 10 }} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#4A7FA8", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: C.dtPanel, border: `1px solid ${C.dtBorder}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="v" stroke={C.dtPurple} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Throughput (calls/min)" bg={C.dtPanel} border={C.dtBorder}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={throughput} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3042" />
                <XAxis dataKey="t" tick={{ fill: "#4A7FA8", fontSize: 10 }} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#4A7FA8", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: C.dtPanel, border: `1px solid ${C.dtBorder}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke={C.dtGreen} fill={`${C.dtGreen}22`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Service table */}
        <Panel title="Service health · top 5" bg={C.dtPanel} border={C.dtBorder}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.dtBorder}` }}>
                {["Service", "Health", "Avg RT", "Throughput", "Error rate"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#4A7FA8", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dtServices.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.dtBorder}33` }}
                  onMouseEnter={e => e.currentTarget.style.background = "#ffffff06"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 10px", color: C.dtText, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "10px 10px", minWidth: 120 }}><HealthBar pct={s.health} /></td>
                  <td style={{ padding: "10px 10px", color: s.rt > 500 ? C.dtRed : s.rt > 200 ? C.dtAmber : C.dtGreen }}>{s.rt} ms</td>
                  <td style={{ padding: "10px 10px", color: "#4A7FA8" }}>{s.calls.toLocaleString()}/min</td>
                  <td style={{ padding: "10px 10px", color: parseFloat(s.errors) > 5 ? C.dtRed : parseFloat(s.errors) > 1 ? C.dtAmber : C.dtGreen }}>{s.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function DtNav() {
  const tabs = ["Overview", "Problems", "Services", "Smartscape", "Davis AI", "Logs"];
  const [active, setActive] = useState("Overview");
  return (
    <div style={{ display: "flex", gap: 2, padding: "0 18px", background: "#0D1825", borderBottom: `1px solid ${C.dtBorder}` }}>
      {tabs.map(t => (
        <button key={t} onClick={() => setActive(t)} style={{
          background: "transparent",
          border: "none", borderBottom: active === t ? `2px solid ${C.dtPurple}` : "2px solid transparent",
          color: active === t ? "#D0E8FF" : "#4A7FA8",
          padding: "8px 14px", fontSize: 12, cursor: "pointer", fontWeight: active === t ? 600 : 400,
        }}>{t}</button>
      ))}
    </div>
  );
}

function DynatraceLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill={C.dtPurple} />
      <polygon points="12,4 20,9 20,15 12,20 4,15 4,9" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="#fff" />
    </svg>
  );
}

// ── Shared panel wrapper ────────────────────────────────────────────────────
function Panel({ title, children, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: "#8B8D98", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — drop this into your existing layout
// ══════════════════════════════════════════════════════════════════════════════
export default function MonitoringDashboard() {
  const [tab, setTab] = useState("splunk");

  const tabs = [
    { id: "splunk", label: "Splunk ITSI", dot: "#65A637" },
    { id: "dynatrace", label: "Dynatrace", dot: "#1496FF" },
  ];

  return (
    <div style={{ padding: "0 0 24px", fontFamily: "sans-serif" }}>
      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 16,
        background: "#12121E", borderRadius: 8, padding: 4, width: "fit-content",
        border: "1px solid #2A2A3A",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer",
            background: tab === t.id ? "#1E1E30" : "transparent",
            color: tab === t.id ? "#E8E8F8" : "#6A6A8A",
            fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
            transition: "all 0.15s",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "splunk" ? <SplunkDashboard /> : <DynatraceDashboard />}

      {/* Attribution note */}
      <p style={{ fontSize: 11, color: "#555568", marginTop: 10, textAlign: "right" }}>
        Demo data only · not connected to live Splunk / Dynatrace APIs
      </p>
    </div>
  );
}
