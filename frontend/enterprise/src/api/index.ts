/**
 * index.ts — API barrel that switches between mock and live implementations.
 *
 * WHY: Components import from '@/api' and never know whether they're
 * talking to a real server or fixtures. GitHub Pages gets mock,
 * Render production gets live. Zero component changes needed.
 *
 * Usage in a component or hook:
 *   import { analyzeTicket, fetchDashboard } from '@/api';
 */

import env from '../config/env';
import * as live from './incidents';
import * as liveAnalytics from './analytics';
import * as mock from './mock';

const isMock = env.apiMode === 'mock';

export const analyzeTicket    = isMock ? mock.mockAnalyzeTicket    : live.analyzeTicket;
export const fetchIncidents   = isMock ? mock.mockFetchIncidents   : live.fetchIncidents;
export const searchIncidents  = isMock ? mock.mockSearchIncidents  : live.searchIncidents;
export const patchIncident    = isMock ? mock.mockPatchIncident    : live.patchIncident;

export const fetchDashboard        = isMock ? mock.mockFetchDashboard    : liveAnalytics.fetchDashboard;
export const fetchTrends           = isMock ? mock.mockFetchTrends       : liveAnalytics.fetchTrends;
export const fetchSimulationStatus = isMock ? mock.mockSimulationStatus  : liveAnalytics.fetchSimulationStatus;
export const startSimulation       = isMock ? mock.mockSimulationStatus  : liveAnalytics.startSimulation;
export const stopSimulation        = isMock ? mock.mockSimulationStatus  : liveAnalytics.stopSimulation;
