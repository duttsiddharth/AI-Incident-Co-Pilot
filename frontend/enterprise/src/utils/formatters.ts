/**
 * formatters.ts — pure formatting functions extracted from App.js.
 *
 * Pure functions = trivially testable. No component imports needed.
 */

import type { Priority } from '../types/incident';
import { PRIORITY_COLORS } from '../config/constants';

export const formatTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

export const formatDate = (iso: string | undefined): string => {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const getSLAColor = (remaining: number | null, breached: boolean): string => {
  if (breached) return 'text-red-500';
  if (remaining !== null && remaining < 30) return 'text-red-500';
  if (remaining !== null && remaining < 60) return 'text-amber-500';
  return 'text-green-500';
};

export const getPriorityColor = (priority: Priority): string =>
  PRIORITY_COLORS[priority] ?? '#888';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
