/**
 * exportPDF.ts — jsPDF export extracted from App.js.
 *
 * WHY EXTRACTED: PDF logic is ~40 lines of imperative code that has
 * nothing to do with React rendering. Extracting it makes it testable
 * in Node.js (jsdom) and reusable from any component.
 */

import { jsPDF } from 'jspdf';
import type { Incident } from '../types/incident';

export const exportIncidentPDF = (inc: Incident): void => {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;
  const pw = doc.internal.pageSize.getWidth() - margin * 2;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Incident Co-Pilot Report', margin, y);
  y += 10;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + pw, y);
  y += 8;

  const addSection = (label: string, value: string | undefined | null) => {
    if (!value) return;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(label, margin, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(String(value), pw);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  };

  addSection(
    'PRIORITY',
    `${inc.priority} | SLA Target: ${inc.sla_target_minutes} min | SLA Breached: ${inc.sla_breached ? 'YES' : 'NO'}`
  );
  addSection('CONFIDENCE', `${inc.confidence_score}% (${inc.confidence_band})${inc.needs_human_review ? ' - NEEDS HUMAN REVIEW' : ''}`);
  addSection('SUMMARY', inc.summary);
  addSection('ROOT CAUSE', inc.root_cause);
  addSection('RESOLUTION STEPS', inc.resolution_steps);
  if (inc.bridge_update && inc.bridge_update !== 'N/A') {
    addSection('BRIDGE UPDATE', inc.bridge_update);
  }
  if (inc.key_signals?.length) {
    addSection('KEY SIGNALS', inc.key_signals.join(', '));
  }
  addSection('CREATED', inc.created_at);
  addSection('TICKET', inc.ticket);

  doc.save(`incident-${inc.id?.slice(0, 8) ?? 'report'}.pdf`);
};
