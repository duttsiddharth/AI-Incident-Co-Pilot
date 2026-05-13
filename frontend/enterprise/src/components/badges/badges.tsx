/**
 * badges.tsx — atomic badge components extracted from App.js.
 *
 * Each badge is a pure function of its prop — no state, no side effects.
 * This makes them trivially testable and reusable across every page.
 */

import React from 'react';
import { Lightning, Warning, Cpu } from '@phosphor-icons/react';
import type { Priority, Status, ConfidenceBand } from '../../types/incident';

// ── Priority Badge ────────────────────────────────────────────────────────
const PRIORITY_CLASSES: Record<Priority, string> = {
  P1: 'bg-red-100 text-red-700 border-red-200',
  P2: 'bg-amber-100 text-amber-700 border-amber-200',
  P3: 'bg-blue-100 text-blue-700 border-blue-200',
};

const PRIORITY_ICONS: Record<Priority, React.ReactElement> = {
  P1: <Lightning weight="fill" size={12} />,
  P2: <Warning weight="fill" size={12} />,
  P3: <Cpu size={12} />,
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => (
  <span
    data-testid={`priority-badge-${priority}`}
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border ${PRIORITY_CLASSES[priority]}`}
  >
    {PRIORITY_ICONS[priority]} {priority}
  </span>
);

// ── Status Badge ──────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<Status, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
};

export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => (
  <span
    data-testid={`status-badge-${status}`}
    className={`px-2 py-0.5 text-xs font-bold ${STATUS_CLASSES[status]}`}
  >
    {status}
  </span>
);

// ── Confidence Band ───────────────────────────────────────────────────────
const CONFIDENCE_CLASSES: Record<ConfidenceBand, string> = {
  HIGH: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-red-100 text-red-700',
};

export const ConfidenceBandBadge: React.FC<{ band: ConfidenceBand; score: number }> = ({
  band,
  score,
}) => (
  <span className={`px-2 py-0.5 text-xs font-bold ${CONFIDENCE_CLASSES[band]}`}>
    {score}% ({band})
  </span>
);

// ── SLA Status Indicator ──────────────────────────────────────────────────
export const SLAIndicator: React.FC<{
  remaining: number | null;
  breached: boolean;
  formatted: string;
}> = ({ breached, formatted }) => (
  <span
    className={`font-mono text-xs font-bold ${
      breached ? 'text-red-500' : 'text-green-600'
    }`}
  >
    {breached ? '⚠ BREACHED' : formatted}
  </span>
);
