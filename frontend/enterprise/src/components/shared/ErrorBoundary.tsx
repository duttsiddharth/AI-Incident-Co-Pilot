/**
 * ErrorBoundary.tsx — React class-based error boundary.
 *
 * WHY A CLASS COMPONENT:
 * React only supports error boundaries as class components (as of React 19).
 * This cannot be written as a function component — getDerivedStateFromError
 * and componentDidCatch are class-only lifecycle methods.
 *
 * ARCHITECTURE DECISION:
 * We use three boundary levels:
 * 1. Root boundary (wraps entire app) — catches catastrophic errors
 * 2. Shell boundary (wraps ShellLayout) — keeps the chrome alive
 * 3. Page boundary (wraps each page's Outlet content) — isolates page crashes
 *
 * FUTURE: componentDidCatch is where OpenTelemetry error spans are sent.
 * When Phase 3 OTel arrives, add:
 *   tracer.startSpan('ui.error').setStatus({ code: SpanStatusCode.ERROR }).end();
 */

import React from 'react';
import { Warning } from '@phosphor-icons/react';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback — defaults to full-page error card */
  fallback?: React.ReactNode;
  /** Optional scope label for debugging */
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Phase 3: send to OTel collector here
    console.error(`[ErrorBoundary:${this.props.scope ?? 'unknown'}]`, error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="bg-white border border-red-200 p-6 max-w-md w-full text-center">
            <Warning size={40} className="text-red-500 mx-auto mb-4" weight="fill" />
            <h2 className="font-bold text-lg mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4 font-mono">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            {this.props.scope && (
              <p className="text-xs text-gray-400 mb-4">Scope: {this.props.scope}</p>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * PageErrorBoundary — convenience wrapper with page-level scope.
 * Use this inside each page component.
 */
export const PageErrorBoundary: React.FC<{ children: React.ReactNode; page: string }> = ({
  children,
  page,
}) => (
  <ErrorBoundary scope={`page:${page}`}>
    {children}
  </ErrorBoundary>
);
