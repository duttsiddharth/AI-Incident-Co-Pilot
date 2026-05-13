/**
 * analytics.ts — types for dashboard, trends, and future OpenTelemetry signals.
 *
 * WHY: Keeping analytics types separate from incident types means the
 * Splunk/OTel signal layer can be added without touching incident contracts.
 */

import type { Priority, Status } from './incident';

export interface SLADashboard {
  total_incidents: number;
  active_incidents: number;
  breach_percentage: number;
  avg_resolution_minutes: number | null;
  priority_breakdown: Record<Priority, number>;
  status_breakdown: Record<Status, number>;
}

export interface VolumeTrendPoint {
  date: string;
  count: number;
}

export interface MTTRPoint {
  date: string;
  mttr: number;
}

export interface PriorityTrendPoint {
  date: string;
  P1: number;
  P2: number;
  P3: number;
}

export interface RecurringPattern {
  pattern: string;
  count: number;
}

export interface TrendsData {
  total_incidents: number;
  volume_trend: VolumeTrendPoint[];
  mttr_trend: MTTRPoint[];
  priority_trend: PriorityTrendPoint[];
  recurring_patterns: RecurringPattern[];
}

export interface SimulationStatus {
  running: boolean;
}

/**
 * Future: OpenTelemetry signal shape.
 * Introduced now so the monitoring layer can be typed immediately
 * when the OTel collector endpoint is wired in Phase 3.
 */
export interface OTelSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  duration: number;
  status: 'OK' | 'ERROR' | 'UNSET';
  attributes: Record<string, string | number | boolean>;
}

export interface OTelMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  labels: Record<string, string>;
}
