/**
 * useDashboard.ts — fetches SLA dashboard + incident list with polling.
 *
 * WHY A HOOK:
 * The polling logic in App.js is tied to a `useEffect` that depends on
 * `activeTab`. Extracting it means:
 * - DashboardPage only mounts this hook when visible
 * - The poll interval is driven by env.pollIntervalMs (configurable)
 * - Phase 3 replaces the setInterval with a WebSocket subscription
 *   in exactly this hook — zero component changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchDashboard, fetchIncidents, fetchSimulationStatus } from '../api';
import { useIncidentStore } from '../store/incidentStore';
import env from '../config/env';

export function useDashboard() {
  const {
    setIncidents,
    setIncidentsLoading,
    setIncidentsError,
    setSimulationRunning,
  } = useIncidentStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const [dashResult, incResult, simResult] = await Promise.all([
      fetchDashboard(),
      fetchIncidents(20),
      fetchSimulationStatus(),
    ]);

    if (!dashResult.ok) {
      setIncidentsError(dashResult.error);
      toast.error(dashResult.error.message);
      return null;
    }

    if (incResult.ok) setIncidents(incResult.data);
    if (simResult.ok) setSimulationRunning(simResult.data.running);

    setIncidentsLoading(false);
    return dashResult.data;
  }, [setIncidents, setIncidentsError, setIncidentsLoading, setSimulationRunning]);

  useEffect(() => {
    setIncidentsLoading(true);
    load();

    // Poll until WebSocket replaces this in Phase 3
    intervalRef.current = setInterval(load, env.pollIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load, setIncidentsLoading]);

  return { refresh: load };
}
