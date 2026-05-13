import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import { ShellLayout } from './components/layout/ShellLayout';

const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function Loader() {
  return <div>Loading...</div>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loader />}>
            <AnalyzePage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<Loader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
