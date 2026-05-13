import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
} from 'react-router-dom';

import { ShellLayout } from './components/layout/ShellLayout';

const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function Loader() {
  return <div>Loading...</div>;
}

const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      {
        index: true,
        element: withSuspense(AnalyzePage),
      },
      {
        path: 'dashboard',
        element: withSuspense(DashboardPage),
      },
    ],
  },
]);
