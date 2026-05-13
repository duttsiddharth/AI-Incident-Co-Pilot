import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ShellLayout } from './components/layout/ShellLayout.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.tsx';

const AnalyzePage    = lazy(() => import('./pages/AnalyzePage.tsx'));
const DashboardPage  = lazy(() => import('./pages/DashboardPage.tsx'));
const HistoryPage    = lazy(() => import('./pages/HistoryPage.tsx'));
const TrendsPage     = lazy(() => import('./pages/TrendsPage.tsx'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage.tsx'));

const PageSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-6">
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

export const router = createBrowserRouter([
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
      { index: true,        element: withSuspense(AnalyzePage)    },
      { path: 'dashboard',  element: withSuspense(DashboardPage)  },
      { path: 'history',    element: withSuspense(HistoryPage)    },
      { path: 'trends',     element: withSuspense(TrendsPage)     },
      { path: 'monitoring', element: withSuspense(MonitoringPage) },
      { path: '*',          element: <Navigate to="/" replace />  },
    ],
  },
]);
