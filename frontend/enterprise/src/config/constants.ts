/**
 * constants.ts — application constants extracted from App.js.
 *
 * WHY: Magic strings and colours scattered across components make
 * theming and i18n impossible. Centralising them means a single change
 * propagates everywhere.
 */

import type { Priority, Status } from '../types/incident';

export const PRIORITY_COLORS: Record<Priority, string> = {
  P1: '#E63946',
  P2: '#F59E0B',
  P3: '#2563EB',
};

export const STATUS_COLORS: Record<Status, string> = {
  OPEN: '#E63946',
  IN_PROGRESS: '#F59E0B',
  RESOLVED: '#10B981',
};

export const SLA_TARGETS_MINUTES: Record<Priority, number> = {
  P1: 30,
  P2: 120,
  P3: 480,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Minor',
};

export const NAV_ITEMS = [
  { id: 'analyze',    label: 'Analyze',    icon: 'Lightning',  path: '/'           },
  { id: 'dashboard',  label: 'Dashboard',  icon: 'ChartPie',   path: '/dashboard'  },
  { id: 'history',    label: 'History',    icon: 'Clock',      path: '/history'    },
  { id: 'trends',     label: 'Trends',     icon: 'TrendUp',    path: '/trends'     },
  { id: 'monitoring', label: 'Monitoring', icon: 'ChartLine',  path: '/monitoring' },
] as const;

export type NavId = typeof NAV_ITEMS[number]['id'];

export const SAMPLE_TICKETS = [
  {
    title: 'SIP Registration Failure',
    ticket: `INCIDENT: Multiple users unable to make/receive calls
TIME: Started 10:30 AM EST
IMPACT: 50+ agents in Contact Center unable to login
SYMPTOMS:
- Phones showing "Registering" status
- SIP 408 timeout errors in logs
- CUCM Publisher showing high CPU (95%)
USER REPORTS: "Phone won't connect"
BUSINESS IMPACT: Contact center operations severely impacted`,
  },
  {
    title: 'Contact Center Queue Issue',
    ticket: `INCIDENT: Calls not routing to available agents
TIME: Ongoing for past 2 hours
IMPACT: 200+ calls stuck in queue
SYMPTOMS:
- Agent states showing "Ready" in Finesse
- Queue showing 180 calls waiting
- Skill group shows 0 agents available
USER REPORTS: "I'm ready but no calls coming through"
BUSINESS IMPACT: Critical - SLA breached`,
  },
  {
    title: 'One-Way Audio Issue',
    ticket: `INCIDENT: Intermittent one-way audio on external calls
TIME: Reported by multiple users today
IMPACT: 15+ users experiencing issue
SYMPTOMS:
- Customer can hear agent, agent cannot hear customer
- Issue only on calls going through SBC
USER REPORTS: "Customer keeps saying hello but I can't hear them"`,
  },
] as const;
