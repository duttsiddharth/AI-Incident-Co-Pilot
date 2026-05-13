import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.tsx';

const App: React.FC = () => (
  <ErrorBoundary scope="root">
    <RouterProvider router={router} />
    <Toaster position="top-right" richColors closeButton />
  </ErrorBoundary>
);

export default App;
