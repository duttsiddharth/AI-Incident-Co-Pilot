/**
 * incidents.ts — all incident-related API calls.
 *
 * WHY: Separating by domain (incidents vs analytics vs simulation) means
 * a backend route change affects exactly one file. Each function returns
 * Result<T> — the component decides how to handle the error, not this layer.
 */

import { request } from './client';
import type { Result } from '../types/api';
import type {
  Incident,
  IncidentPatch,
  IncidentSearchParams,
  IncidentSearchResult,
  AnalyzeRequest,
  AnalyzeResponse,
} from '../types/incident';

/**
 * Analyze a raw ticket through the RAG + LLM pipeline.
 * Maps to: POST /api/analyze
 */
export const analyzeTicket = (payload: AnalyzeRequest): Promise<Result<AnalyzeResponse>> =>
  request<AnalyzeResponse>({ method: 'POST', url: '/analyze', data: payload });

/**
 * Fetch recent incidents for the dashboard live table.
 * Maps to: GET /api/incidents?limit=N
 */
export const fetchIncidents = (limit = 20): Promise<Result<Incident[]>> =>
  request<Incident[]>({ method: 'GET', url: '/incidents', params: { limit } });

/**
 * Paginated, filtered incident history search.
 * Maps to: GET /api/incidents/search
 */
export const searchIncidents = (
  params: IncidentSearchParams
): Promise<Result<IncidentSearchResult>> =>
  request<IncidentSearchResult>({ method: 'GET', url: '/incidents/search', params });

/**
 * Patch an incident's status, summary, root cause, or resolution steps.
 * Maps to: PATCH /api/incidents/:id
 */
export const patchIncident = (
  id: string,
  patch: IncidentPatch
): Promise<Result<Incident>> =>
  request<Incident>({ method: 'PATCH', url: `/incidents/${id}`, data: patch });
