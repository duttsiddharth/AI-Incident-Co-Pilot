/**
 * incidentStore.ts — global incident state via Zustand.
 *
 * WHY ZUSTAND over useState:
 * App.js has 15+ useState calls. Any component needing incident state
 * must live inside App and receive props — this prevents modularisation.
 * Zustand gives any component direct store access with zero prop drilling.
 *
 * WHY NOT REDUX:
 * Redux Toolkit adds ~3 files per feature (slice, selector, thunk).
 * At this scale, Zustand is faster to write, easier to test, and
 * produces identical runtime behaviour.
 *
 * FUTURE: When WebSocket arrives (Phase 3), the socket message handler
 * calls store actions directly — no component wiring needed.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Incident, IncidentSearchParams, IncidentSearchResult } from '../types/incident';
import type { ApiError } from '../types/api';

interface IncidentState {
  // Dashboard list
  incidents: Incident[];
  incidentsLoading: boolean;
  incidentsError: ApiError | null;

  // Selected / detail
  selectedIncident: Incident | null;

  // History / search
  historyData: IncidentSearchResult;
  historyFilter: IncidentSearchParams;
  historyLoading: boolean;
  historyPage: number;

  // Simulation
  simulationRunning: boolean;

  // Analysis result (Analyze tab)
  analysisResult: Incident | null;
  isAnalyzing: boolean;
  analyzeError: ApiError | null;

  // Actions
  setIncidents: (incidents: Incident[]) => void;
  setIncidentsLoading: (loading: boolean) => void;
  setIncidentsError: (error: ApiError | null) => void;
  setSelectedIncident: (incident: Incident | null) => void;
  updateIncidentInList: (updated: Incident) => void;

  setHistoryData: (data: IncidentSearchResult) => void;
  setHistoryFilter: (filter: Partial<IncidentSearchParams>) => void;
  setHistoryLoading: (loading: boolean) => void;
  setHistoryPage: (page: number) => void;

  setSimulationRunning: (running: boolean) => void;

  setAnalysisResult: (result: Incident | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalyzeError: (error: ApiError | null) => void;

  resetAnalysis: () => void;
}

const DEFAULT_HISTORY: IncidentSearchResult = { items: [], total: 0, page: 1, pages: 1 };
const DEFAULT_FILTER: IncidentSearchParams = {
  page: 1, limit: 15, priority: '', status: '', search: '', date_from: '', date_to: '',
};

export const useIncidentStore = create<IncidentState>()(
  devtools(
    (set) => ({
      incidents: [],
      incidentsLoading: false,
      incidentsError: null,

      selectedIncident: null,

      historyData: DEFAULT_HISTORY,
      historyFilter: DEFAULT_FILTER,
      historyLoading: false,
      historyPage: 1,

      simulationRunning: false,

      analysisResult: null,
      isAnalyzing: false,
      analyzeError: null,

      setIncidents: (incidents) => set({ incidents }),
      setIncidentsLoading: (incidentsLoading) => set({ incidentsLoading }),
      setIncidentsError: (incidentsError) => set({ incidentsError }),
      setSelectedIncident: (selectedIncident) => set({ selectedIncident }),
      updateIncidentInList: (updated) =>
        set((state) => ({
          incidents: state.incidents.map((i) => (i.id === updated.id ? updated : i)),
        })),

      setHistoryData: (historyData) => set({ historyData }),
      setHistoryFilter: (filter) =>
        set((state) => ({ historyFilter: { ...state.historyFilter, ...filter } })),
      setHistoryLoading: (historyLoading) => set({ historyLoading }),
      setHistoryPage: (historyPage) => set({ historyPage }),

      setSimulationRunning: (simulationRunning) => set({ simulationRunning }),

      setAnalysisResult: (analysisResult) => set({ analysisResult }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setAnalyzeError: (analyzeError) => set({ analyzeError }),

      resetAnalysis: () =>
        set({ analysisResult: null, isAnalyzing: false, analyzeError: null }),
    }),
    { name: 'IncidentStore' }
  )
);
