/**
 * analytics.ts — dashboard, trends, and simulation API calls.
 */

import { request } from './client';
import type { Result } from '../types/api';
import type { SLADashboard, TrendsData, SimulationStatus } from '../types/analytics';

export const fetchDashboard = (): Promise<Result<SLADashboard>> =>
  request<SLADashboard>({ method: 'GET', url: '/sla-dashboard' });

export const fetchTrends = (): Promise<Result<TrendsData>> =>
  request<TrendsData>({ method: 'GET', url: '/trends' });

export const fetchSimulationStatus = (): Promise<Result<SimulationStatus>> =>
  request<SimulationStatus>({ method: 'GET', url: '/simulate/status' });

export const startSimulation = (): Promise<Result<SimulationStatus>> =>
  request<SimulationStatus>({ method: 'POST', url: '/simulate/start' });

export const stopSimulation = (): Promise<Result<SimulationStatus>> =>
  request<SimulationStatus>({ method: 'POST', url: '/simulate/stop' });
