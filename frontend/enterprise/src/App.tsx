/**
 * App.tsx — root component. Providers only, no business logic.
 *
 * Before: 600+ lines with all state, all UI, all API calls.
 * After:  ~40 lines. Everything else lives in its correct module.
 *
 * Provider order matters:
 * 1. ErrorBoundary (outermost — catches everything)
 * 2. RouterProvider (enables useLocation in children)
 * 3. Toaster (needs to be outside route context to survive navigation)
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
const App: React.FC = () => (
  <ErrorBoundary scope="root">
    <RouterProvider router={router} />
    <Toaster position="top-right" richColors closeButton />
  </ErrorBoundary>
);

export default App;
