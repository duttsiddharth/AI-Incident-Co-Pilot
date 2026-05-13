/**
 * ShellLayout.tsx — the persistent application shell.
 *
 * WHY A SHELL LAYOUT:
 * React Router v6 uses nested routes. ShellLayout is the parent route
 * element — Sidebar and TopNav render once; only the <Outlet /> swaps
 * as the user navigates. This prevents the entire page from re-mounting
 * on route change (sidebar collapse state preserved, polling uninterrupted).
 *
 * FUTURE: When auth lands, a <ProtectedRoute> wraps this shell.
 * When a notification drawer lands, it's a sibling to <Outlet />.
 */

import React, { useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useUIStore } from '../../store/uiStore';

/**
 * Page-level refresh callbacks are registered here via context so
 * TopNav's Refresh button can trigger the active page's data reload
 * without prop drilling through the router.
 */
interface RefreshContextValue {
  register: (cb: () => void) => void;
  unregister: () => void;
}

export const RefreshContext = React.createContext<RefreshContextValue>({
  register: () => undefined,
  unregister: () => undefined,
});

export const ShellLayout: React.FC = () => {
  const { sidebarCollapsed } = useUIStore();
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  const register = useCallback((cb: () => void) => {
    refreshCallbackRef.current = cb;
  }, []);

  const unregister = useCallback(() => {
    refreshCallbackRef.current = null;
  }, []);

  const handleRefresh = useCallback(() => {
    refreshCallbackRef.current?.();
  }, []);

  return (
    <RefreshContext.Provider value={{ register, unregister }}>
      <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav onRefresh={handleRefresh} />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
          <footer className="border-t border-black/10 py-2 px-6 flex justify-between text-[10px] font-mono text-gray-400">
            <span>AI INCIDENT CO-PILOT ENTERPRISE v2.0</span>
            <span>GROQ LLAMA-3.3 · RAG · SLA TRACKING</span>
          </footer>
        </div>
      </div>
    </RefreshContext.Provider>
  );
};
