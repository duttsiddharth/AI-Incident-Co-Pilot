/**
 * env.ts — single source of truth for all environment variables.
 *
 * WHY: Scattering `process.env` / `import.meta.env` across files makes
 * the mock ↔ live switch non-deterministic. One config object means:
 * - One place to add a new variable
 * - TypeScript catches typos at build time
 * - Easy to stub in tests
 *
 * Vite exposes vars prefixed with VITE_ via import.meta.env.
 * CRA exposes vars prefixed with REACT_APP_ via process.env.
 * This file normalises both so components are runtime-agnostic.
 */

const get = (key: string, fallback = ''): string =>
  (typeof import.meta !== 'undefined'
    ? (import.meta as Record<string, Record<string, string>>).env?.[key]
    : (process.env as Record<string, string | undefined>)[key]) ?? fallback;

const env = {
  /** Base URL for the FastAPI backend */
  apiBase: get('VITE_BACKEND_URL', get('REACT_APP_BACKEND_URL', 'http://localhost:8000')),

  /**
   * 'mock'  → all API calls return local fixture data (CI, GitHub Pages demo)
   * 'live'  → real FastAPI backend (Render production)
   */
  apiMode: get('VITE_API_MODE', get('REACT_APP_API_MODE', 'live')) as 'mock' | 'live',

  /** Milliseconds between dashboard auto-refresh polls (WebSocket replaces this in Phase 3) */
  pollIntervalMs: Number(get('VITE_POLL_INTERVAL_MS', '5000')),

  /** Feature flags — toggle enterprise features per environment */
  features: {
    splunkIntegration:  get('VITE_FF_SPLUNK',  'false') === 'true',
    dynatraceIntegration: get('VITE_FF_DYNATRACE', 'false') === 'true',
    otelTracing:        get('VITE_FF_OTEL',    'false') === 'true',
    webSocket:          get('VITE_FF_WEBSOCKET', 'false') === 'true',
    auth:               get('VITE_FF_AUTH',    'false') === 'true',
  },

  isDev:  get('NODE_ENV', 'development') === 'development',
  isProd: get('NODE_ENV', 'development') === 'production',
} as const;

export default env;
