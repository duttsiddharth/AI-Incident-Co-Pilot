/**
 * client.ts — the single axios instance for the entire application.
 *
 * WHY THIS MATTERS:
 * Every enterprise concern lives here and is applied to ALL requests:
 *
 * 1. Auth headers    — Bearer token injected from the auth store.
 *                      When Phase 2 (auth) lands, zero component changes.
 *
 * 2. Trace headers   — W3C traceparent header injected when OTel is enabled.
 *                      When Phase 3 (OTel) lands, the backend gets a
 *                      distributed trace from browser → FastAPI → Groq.
 *
 * 3. Retry logic     — 503 / network errors retry with exponential backoff.
 *                      Render free tier has cold starts — this makes them
 *                      invisible to users.
 *
 * 4. Error normalisation — every error becomes a typed ApiError.
 *                          Components never parse raw axios errors.
 *
 * 5. Request ID      — X-Request-ID on every request for log correlation.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import env from '../config/env';
import type { ApiError, Result } from '../types/api';

// ── Trace header generation (W3C traceparent format) ──────────────────────
const generateTraceParent = (): string => {
  const rand = () => Math.random().toString(16).slice(2).padStart(16, '0');
  return `00-${rand()}${rand()}-${rand()}-01`;
};

const generateRequestId = (): string =>
  `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Axios instance ────────────────────────────────────────────────────────
const instance: AxiosInstance = axios.create({
  baseURL: `${env.apiBase}/api`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Auth token — reads from localStorage until Phase 2 wires up the auth store
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Distributed trace header — enables Splunk/OTel correlation in Phase 3
  if (env.features.otelTracing) {
    config.headers['traceparent'] = generateTraceParent();
  }

  // Request ID — correlates frontend log with backend log line
  config.headers['X-Request-ID'] = generateRequestId();

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────
instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };

    // Retry on network errors and 503 (Render cold start)
    const isRetryable =
      !error.response || error.response.status === 503 || error.response.status === 429;
    config._retryCount = config._retryCount ?? 0;

    if (isRetryable && config._retryCount < 3) {
      config._retryCount += 1;
      const backoff = 2 ** config._retryCount * 500;
      await new Promise((r) => setTimeout(r, backoff));
      return instance(config);
    }

    return Promise.reject(error);
  }
);

// ── Typed request wrapper ─────────────────────────────────────────────────
/**
 * Wraps every axios call in a Result<T> — callers never throw.
 *
 * Usage:
 *   const result = await request<Incident[]>({ method: 'GET', url: '/incidents' });
 *   if (!result.ok) { showError(result.error.message); return; }
 *   setIncidents(result.data);
 */
export async function request<T>(config: AxiosRequestConfig): Promise<Result<T>> {
  try {
    const response = await instance(config);
    return { ok: true, data: response.data as T };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const apiError: ApiError = {
        status: err.response?.status ?? 0,
        message:
          err.response?.data?.detail ??
          err.response?.data?.message ??
          err.message ??
          'An unexpected error occurred',
        detail: err.response?.data?.detail,
        traceId: err.response?.headers?.['x-trace-id'],
      };
      return { ok: false, error: apiError };
    }
    return {
      ok: false,
      error: { status: 0, message: 'Network error — please check your connection' },
    };
  }
}

export default instance;
