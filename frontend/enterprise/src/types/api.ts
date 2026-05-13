/**
 * api.ts — HTTP envelope types shared across all API modules.
 *
 * WHY: Wrapping every response in a typed Result<T, ApiError> forces
 * callers to handle errors explicitly — no silent undefined access.
 * This pattern also makes adding OpenTelemetry trace context trivial:
 * just add traceId to ApiError and every error surface gets it for free.
 */

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  /** Future: populated by OpenTelemetry middleware on the backend */
  traceId?: string;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/**
 * Standard paginated envelope — matches FastAPI pagination conventions.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Webhook ingest envelope — used when Splunk/Dynatrace POST alerts.
 * Defined now so the ingestion API module is typed when Phase 4 arrives.
 */
export interface AlertWebhookPayload {
  source: 'splunk' | 'dynatrace' | 'pagerduty' | 'prometheus' | 'custom';
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  title: string;
  body: string;
  service?: string;
  host?: string;
  timestamp: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}
