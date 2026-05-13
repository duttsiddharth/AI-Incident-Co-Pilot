/**
 * Sidebar.tsx — enterprise collapsible sidebar navigation.
 *
 * WHY THIS DESIGN:
 * - Collapsed state persisted in uiStore (survives page refresh)
 * - Active route detected via useLocation — no prop needed
 * - Icon-only mode at 64px collapsed, full labels at 240px expanded
 * - Each nav item maps to a route — adding a new page = one array entry
 * - Simulation toggle lives in the header, not here
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Lightning, ChartPie, Clock, TrendUp, ChartLine,
  Cpu, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { useUIStore } from '../../store/uiStore';
import { NAV_ITEMS } from '../../config/constants';
import type { NavId } from '../../config/constants';

const ICON_MAP: Record<NavId, React.ReactElement> = {
  analyze:    <Lightning size={20} weight="bold" />,
  dashboard:  <ChartPie size={20} />,
  history:    <Clock size={20} />,
  trends:     <TrendUp size={20} />,
  monitoring: <ChartLine size={20} />,
};

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  const width = sidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`${width} flex-shrink-0 h-screen bg-white border-r border-black/10 flex flex-col transition-all duration-200 relative`}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-black/10 min-h-[60px]">
        <div className="w-8 h-8 bg-black flex-shrink-0 flex items-center justify-center">
          <Cpu className="text-white" size={18} weight="bold" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <p className="font-black text-sm tracking-tighter leading-tight">AI INCIDENT</p>
            <p className="font-black text-sm tracking-tighter leading-tight">CO-PILOT</p>
            <p className="text-[10px] font-mono text-gray-400 mt-0.5">ENTERPRISE v2.0</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2" role="navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={sidebarCollapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all
                ${isActive
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {ICON_MAP[item.id]}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Version / env indicator */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-t border-black/10">
          <p className="text-[10px] font-mono text-gray-400">
            {import.meta.env?.MODE === 'mock' ? '● DEMO MODE' : '● LIVE'}
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-black/15 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        {sidebarCollapsed
          ? <CaretRight size={12} />
          : <CaretLeft size={12} />
        }
      </button>
    </aside>
  );
};
