/**
 * mock.ts — fixture data returned when VITE_API_MODE=mock.
 *
 * WHY: GitHub Pages has no backend. This mock layer means the app
 * is fully functional as a demo without any server. CI tests run
 * against this layer — no network calls, no flakiness.
 *
 * Pattern: each function matches the signature of its live counterpart
 * in incidents.ts / analytics.ts. The api/index.ts barrel switches
 * between them based on env.apiMode — components never know.
 */

import type { Result } from '../types/api';
import type { Incident, IncidentSearchResult, AnalyzeResponse } from '../types/incident';
import type { SLADashboard, TrendsData, SimulationStatus } from '../types/analytics';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ── Fixture data ──────────────────────────────────────────────────────────

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    ticket: 'SIP 408 timeout errors. CUCM CPU at 95%.',
    summary: 'SIP registration failure affecting 50+ Contact Center agents',
    priority: 'P1',
    status: 'OPEN',
    confidence_score: 92,
    confidence_band: 'HIGH',
    needs_human_review: false,
    root_cause: 'CUCM Publisher CPU exhaustion causing SIP registration timeouts',
    resolution_steps:
      '1. Restart CUCM Cisco CallManager service\n2. Check CPU-heavy processes\n3. Review recent config changes',
    bridge_update:
      'P1 Bridge Update - 10:45 AM: SIP registration failure. 50+ agents impacted. CUCM CPU at 95%. Team engaged.',
    key_signals: ['SIP 408', 'CUCM Publisher', 'CPU 95%', 'Registration timeout'],
    sla_target_minutes: 30,
    sla_remaining_minutes: 18,
    sla_breached: false,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'inc-002',
    ticket: '200+ calls stuck in queue. Agents show Ready but no calls routing.',
    summary: 'Contact Center queue routing failure — 200+ calls stuck',
    priority: 'P1',
    status: 'IN_PROGRESS',
    confidence_score: 88,
    confidence_band: 'HIGH',
    needs_human_review: false,
    root_cause: 'Finesse skill group cache corruption causing agent state mismatch',
    resolution_steps:
      '1. Restart Cisco Finesse service\n2. Force agent re-login\n3. Clear skill group cache',
    bridge_update: 'P1 Bridge — Finesse routing issue. 200 calls queued. Fix in progress.',
    key_signals: ['Finesse', 'Skill group', 'Queue depth 180', 'SLA breached'],
    sla_target_minutes: 30,
    sla_remaining_minutes: 0,
    sla_breached: true,
    created_at: new Date(Date.now() - 140 * 60000).toISOString(),
  },
  {
    id: 'inc-003',
    ticket: 'One-way audio on external calls through SBC.',
    summary: 'Intermittent one-way audio — SBC media path issue',
    priority: 'P2',
    status: 'RESOLVED',
    confidence_score: 76,
    confidence_band: 'MEDIUM',
    needs_human_review: false,
    root_cause: 'SBC NAT traversal misconfiguration causing asymmetric RTP stream',
    resolution_steps: '1. Correct SBC NAT config\n2. Restart media engine\n3. Test external call',
    bridge_update: 'N/A',
    key_signals: ['One-way audio', 'SBC', 'RTP', 'External calls'],
    sla_target_minutes: 120,
    sla_remaining_minutes: 45,
    sla_breached: false,
    created_at: new Date(Date.now() - 200 * 60000).toISOString(),
  },
];

const MOCK_DASHBOARD: SLADashboard = {
  total_incidents: 3,
  active_incidents: 2,
  breach_percentage: 33,
  avg_resolution_minutes: 87,
  priority_breakdown: { P1: 2, P2: 1, P3: 0 },
  status_breakdown: { OPEN: 1, IN_PROGRESS: 1, RESOLVED: 1 },
};

const MOCK_TRENDS: TrendsData = {
  total_incidents: 3,
  volume_trend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    count: Math.floor(Math.random() * 10) + 1,
  })),
  mttr_trend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    mttr: Math.floor(Math.random() * 120) + 20,
  })),
  priority_trend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    P1: Math.floor(Math.random() * 3),
    P2: Math.floor(Math.random() * 4),
    P3: Math.floor(Math.random() * 5),
  })),
  recurring_patterns: [
    { pattern: 'SIP Timeout', count: 8 },
    { pattern: 'CUCM CPU', count: 5 },
    { pattern: 'One-way Audio', count: 4 },
  ],
};

// ── Mock implementations ──────────────────────────────────────────────────

export const mockAnalyzeTicket = async (ticket: string): Promise<Result<AnalyzeResponse>> => {
  await delay(2200);
  return {
    ok: true,
    data: {
      ...MOCK_INCIDENTS[0],
      id: `inc-${Date.now()}`,
      ticket,
      created_at: new Date().toISOString(),
    },
  };
};

export const mockFetchIncidents = async (): Promise<Result<Incident[]>> => {
  await delay(400);
  return { ok: true, data: MOCK_INCIDENTS };
};

export const mockSearchIncidents = async (): Promise<Result<IncidentSearchResult>> => {
  await delay(500);
  return { ok: true, data: { items: MOCK_INCIDENTS, total: 3, page: 1, pages: 1 } };
};

export const mockPatchIncident = async (
  id: string,
  patch: Partial<Incident>
): Promise<Result<Incident>> => {
  await delay(300);
  const inc = MOCK_INCIDENTS.find((i) => i.id === id) ?? MOCK_INCIDENTS[0];
  return { ok: true, data: { ...inc, ...patch } };
};

export const mockFetchDashboard = async (): Promise<Result<SLADashboard>> => {
  await delay(400);
  return { ok: true, data: MOCK_DASHBOARD };
};

export const mockFetchTrends = async (): Promise<Result<TrendsData>> => {
  await delay(600);
  return { ok: true, data: MOCK_TRENDS };
};

export const mockSimulationStatus = async (): Promise<Result<SimulationStatus>> => {
  await delay(200);
  return { ok: true, data: { running: false } };
};
