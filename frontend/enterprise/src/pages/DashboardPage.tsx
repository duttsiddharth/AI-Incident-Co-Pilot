/**
 * page-shells.tsx — thin page shells for Dashboard, History, Trends, Monitoring.
 *
 * These are intentionally minimal — they mount the useDashboard/useTrends
 * hooks and delegate rendering to feature components (to be built in Phase 2).
 *
 * WHY SEPARATE FILES: Each page is a lazy chunk. Putting them all in one
 * file would defeat code splitting. In production, split these into
 * DashboardPage.tsx, HistoryPage.tsx, etc. — shown together here for brevity.
 */

import React, { useEffect } from 'react';
import { PageErrorBoundary } from '../components/shared/ErrorBoundary';
import { useDashboard } from '../hooks/useDashboard';
import { useIncidentStore } from '../store/incidentStore';
import { PriorityBadge, StatusBadge, SLAIndicator } from '../components/badges/badges';
import { exportIncidentPDF } from '../utils/exportPDF';
import { formatTime, formatDate, getSLAColor } from '../utils/formatters';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { FilePdf, ArrowClockwise } from '@phosphor-icons/react';

// ── Dashboard Page ────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { refresh } = useDashboard();
  const { incidents } = useIncidentStore();

  return (
    <PageErrorBoundary page="dashboard">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={refresh} className="flex items-center gap-1 text-xs text-blue-600">
            <ArrowClockwise size={12} /> Refresh
          </button>
        </div>

        {/* Incident table */}
        <div className="bg-white border border-black/10">
          <div className="p-4 border-b border-black/10">
            <span className="text-xs font-mono text-gray-400">RECENT INCIDENTS</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-mono text-gray-500">
                <tr>
                  <th className="p-3 text-left">SUMMARY</th>
                  <th className="p-3 text-left">PRIORITY</th>
                  <th className="p-3 text-left">STATUS</th>
                  <th className="p-3 text-left">SLA</th>
                  <th className="p-3 text-left">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className="border-t border-black/5 hover:bg-gray-50">
                    <td className="p-3 max-w-xs truncate text-sm">{inc.summary?.slice(0, 60)}...</td>
                    <td className="p-3"><PriorityBadge priority={inc.priority} /></td>
                    <td className="p-3"><StatusBadge status={inc.status} /></td>
                    <td className="p-3">
                      <SLAIndicator
                        remaining={inc.sla_remaining_minutes}
                        breached={inc.sla_breached}
                        formatted={formatTime(inc.sla_remaining_minutes)}
                      />
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => exportIncidentPDF(inc)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs"
                        title="Export PDF"
                      >
                        <FilePdf size={12} weight="fill" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
};

// ── History Page ──────────────────────────────────────────────────────────
export const HistoryPage: React.FC = () => {
  const { historyData, historyLoading } = useIncidentStore();

  return (
    <PageErrorBoundary page="history">
      <div className="space-y-4">
        {historyLoading ? (
          <div className="bg-white border border-black/10 p-12 text-center text-gray-400 animate-pulse">
            Loading history...
          </div>
        ) : historyData.items.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-black/20 p-12 text-center text-gray-400">
            <p className="font-bold">No incidents found</p>
            <p className="text-sm">Analyze tickets or start simulation to generate data</p>
          </div>
        ) : (
          <div className="bg-white border border-black/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-mono text-gray-500">
                <tr>
                  <th className="p-3 text-left">DATE</th>
                  <th className="p-3 text-left">SUMMARY</th>
                  <th className="p-3 text-left">PRIORITY</th>
                  <th className="p-3 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {historyData.items.map((inc) => (
                  <tr key={inc.id} className="border-t border-black/5 hover:bg-gray-50">
                    <td className="p-3 text-xs font-mono text-gray-500">{formatDate(inc.created_at)}</td>
                    <td className="p-3 max-w-xs truncate">{inc.summary?.slice(0, 80)}</td>
                    <td className="p-3"><PriorityBadge priority={inc.priority} /></td>
                    <td className="p-3"><StatusBadge status={inc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageErrorBoundary>
  );
};

// ── Trends Page ───────────────────────────────────────────────────────────
export const TrendsPage: React.FC = () => (
  <PageErrorBoundary page="trends">
    <div className="bg-white border-2 border-dashed border-black/20 p-12 text-center text-gray-400">
      <p className="font-bold">Trends</p>
      <p className="text-sm">Charts load here — same recharts components from App.js</p>
    </div>
  </PageErrorBoundary>
);

// ── Monitoring Page ───────────────────────────────────────────────────────
export const MonitoringPage: React.FC = () => {
  // Future: import MonitoringDashboard from '../components/monitoring/MonitoringDashboard'
  return (
    <PageErrorBoundary page="monitoring">
      <div className="bg-white border-2 border-dashed border-black/20 p-12 text-center text-gray-400">
        <p className="font-bold">Splunk · Dynatrace Monitoring</p>
        <p className="text-sm">MonitoringDashboard component mounts here</p>
      </div>
    </PageErrorBoundary>
  );
};

export default DashboardPage;
