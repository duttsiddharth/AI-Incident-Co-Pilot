/**
 * incident.ts — canonical type contracts for the AI Incident Co-Pilot.
 *
 * WHY: A single source of truth for shapes shared between the API client,
 * Zustand stores, and every component. When the backend schema changes,
 * only this file needs updating — TypeScript surfaces every broken consumer.
 */

export type Priority = 'P1' | 'P2' | 'P3';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Incident {
  id: string;
  ticket: string;
  summary: string;
  priority: Priority;
  status: Status;
  confidence_score: number;
  confidence_band: ConfidenceBand;
  needs_human_review: boolean;
  root_cause: string;
  resolution_steps: string;
  bridge_update: string;
  key_signals: string[];
  sla_target_minutes: number;
  sla_remaining_minutes: number | null;
  sla_breached: boolean;
  created_at: string;
  updated_at?: string;
}

export interface IncidentPatch {
  status?: Status;
  summary?: string;
  root_cause?: string;
  resolution_steps?: string;
}

export interface AnalyzeRequest {
  ticket: string;
}

export type AnalyzeResponse = Incident;

/** Paginated incident search */
export interface IncidentSearchParams {
  page?: number;
  limit?: number;
  priority?: Priority | '';
  status?: Status | '';
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface IncidentSearchResult {
  items: Incident[];
  total: number;
  page: number;
  pages: number;
}
