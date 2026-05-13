/**
 * router.tsx — application routing with React Router v6 data API.
 *
 * WHY createBrowserRouter:
 * - Enables route-level error boundaries (errorElement)
 * - Each route can have a loader function — data fetches before render
 * - Code splitting via React.lazy keeps initial bundle small
 * - GitHub Pages needs basename='/AI-Incident-Co-Pilot' in production
 *   (set via env so it's correct in both Render and GH Pages)
 *
 * LAZY LOADING: Each page is a separate chunk. The Analyze page (heaviest)
 * loads immediately; others load on first visit.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ShellLayout } from '../components/layout/ShellLayout';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

// ── Lazy page imports ─────────────────────────────────────────────────────
const AnalyzePage    = lazy(() => import('../pages/AnalyzePage'));
const DashboardPage  = lazy(() => import('../pages/DashboardPage'));
const HistoryPage    = lazy(() => import('../pages/HistoryPage'));
const TrendsPage     = lazy(() => import('../pages/TrendsPage'));
const MonitoringPage = lazy(() => import('../pages/MonitoringPage'));

// ── Page loading skeleton ─────────────────────────────────────────────────
const PageSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-black/5 w-48" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-black/5" />
      ))}
    </div>
    <div className="h-64 bg-black/5" />
  </div>
);

const withSuspense = (Component: React.LazyExoticComponent<React.FC>) => (
  <Suspense fallback={<PageSkeleton />}>
    <Component />
  </Suspense>
);

// ── GitHub Pages basename ─────────────────────────────────────────────────
const basename =
  import.meta?.env?.VITE_ROUTER_BASENAME ??
  (process.env.NODE_ENV === 'production' ? '/AI-Incident-Co-Pilot' : '/');

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <ShellLayout />,
      errorElement: (
        <ErrorBoundary scope="router">
          <div className="p-8 text-center">
            <p className="font-bold">Page not found</p>
          </div>
        </ErrorBoundary>
      ),
      children: [
        { index: true,            element: withSuspense(AnalyzePage)    },
        { path: 'dashboard',      element: withSuspense(DashboardPage)  },
        { path: 'history',        element: withSuspense(HistoryPage)    },
        { path: 'trends',         element: withSuspense(TrendsPage)     },
        { path: 'monitoring',     element: withSuspense(MonitoringPage) },
        { path: '*',              element: <Navigate to="/" replace />  },
      ],
    },
  ],
  { basename }
);
