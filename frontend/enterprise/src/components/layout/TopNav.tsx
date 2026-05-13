/**
 * TopNav.tsx — sticky top navigation bar.
 *
 * Contains:
 * - Page title / breadcrumb (driven by current route)
 * - Simulation toggle (moved from inline App.js to a dedicated component)
 * - Future: auth avatar, notification bell, org switcher
 *
 * WHY HERE: The simulation toggle was mixed into the header logo area.
 * TopNav is the correct home — it's a global action, not a page action.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Stop, ArrowClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { startSimulation, stopSimulation } from '../../api';
import { useIncidentStore } from '../../store/incidentStore';
import { NAV_ITEMS } from '../../config/constants';

interface TopNavProps {
  onRefresh?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onRefresh }) => {
  const location = useLocation();
  const { simulationRunning, setSimulationRunning } = useIncidentStore();

  const currentNav = NAV_ITEMS.find((n) =>
    n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)
  );

  const toggleSimulation = async () => {
    const action = simulationRunning ? stopSimulation : startSimulation;
    const result = await action();
    if (!result.ok) {
      toast.error('Simulation toggle failed');
      return;
    }
    const next = !simulationRunning;
    setSimulationRunning(next);
    toast[next ? 'success' : 'info'](
      next ? 'Simulation started — incidents auto-generating' : 'Simulation stopped'
    );
  };

  return (
    <header className="h-[60px] flex-shrink-0 bg-white border-b border-black/10 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumb */}
      <div>
        <h1 className="font-bold text-sm tracking-wide">
          {currentNav?.label ?? 'AI Incident Co-Pilot'}
        </h1>
        <p className="text-xs font-mono text-gray-400">
          {new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black/15 text-xs font-bold hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowClockwise size={14} /> Refresh
          </button>
        )}

        <button
          data-testid="simulation-toggle"
          onClick={toggleSimulation}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold transition-all ${
            simulationRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {simulationRunning
            ? <><Stop weight="fill" size={14} /> STOP SIM</>
            : <><Play weight="fill" size={14} /> START SIM</>
          }
        </button>

        {/* Future: <UserAvatar /> */}
      </div>
    </header>
  );
};
