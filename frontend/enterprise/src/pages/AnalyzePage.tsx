/**
 * AnalyzePage.tsx — Analyze tab as a standalone page.
 *
 * All existing UI from App.js is preserved exactly.
 * State is now read from useIncidentStore instead of useState.
 * API calls go through useAnalyze hook instead of inline axios.
 */

import React, { useState } from 'react';
import {
  ArrowRight, User, Cpu, Clipboard, Copy, FilePdf, Warning,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { PageErrorBoundary } from '../components/shared/ErrorBoundary';
import { PriorityBadge, StatusBadge, ConfidenceBandBadge } from '../components/badges/badges';
import { useIncidentStore } from '../store/incidentStore';
import { useAnalyze } from '../hooks/useAnalyze';
import { exportIncidentPDF } from '../utils/exportPDF';
import { copyToClipboard } from '../utils/formatters';
import { SAMPLE_TICKETS } from '../config/constants';

const LOADING_TEXTS = ['ANALYZING...', 'QUERYING RAG...', 'COMPUTING...', 'GENERATING...'];

const AnalyzePage: React.FC = () => {
  const [ticketText, setTicketText] = useState('');
  const [loadingIdx, setLoadingIdx] = useState(0);

  const { analysisResult, isAnalyzing } = useIncidentStore();
  const { analyze } = useAnalyze();

  React.useEffect(() => {
    if (!isAnalyzing) return;
    const t = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_TEXTS.length), 1500);
    return () => clearInterval(t);
  }, [isAnalyzing]);

  const result = analysisResult;

  return (
    <PageErrorBoundary page="analyze">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Input panel ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-black/10 p-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-gray-400">INCIDENT TICKET</span>
              <span className="text-xs font-mono text-gray-400">{ticketText.length} chars</span>
            </div>
            <textarea
              data-testid="ticket-textarea"
              className="w-full h-64 p-3 border border-black/20 font-mono text-sm resize-none focus:border-black focus:ring-1 focus:ring-black outline-none"
              placeholder="Paste incident ticket here..."
              value={ticketText}
              onChange={(e) => setTicketText(e.target.value)}
              disabled={isAnalyzing}
            />
            <button
              data-testid="analyze-button"
              onClick={() => analyze(ticketText)}
              disabled={isAnalyzing || !ticketText.trim()}
              className="w-full mt-3 bg-black text-white py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing
                ? LOADING_TEXTS[loadingIdx]
                : <><ArrowRight weight="bold" /> ANALYZE</>
              }
            </button>
          </div>

          <div className="bg-white border border-black/10 p-4">
            <span className="text-xs font-mono text-gray-400 block mb-3">SAMPLE TICKETS</span>
            {SAMPLE_TICKETS.map((s, i) => (
              <button
                key={i}
                onClick={() => setTicketText(s.ticket)}
                className="w-full text-left px-3 py-2 mb-2 border border-black/10 hover:border-black text-sm flex items-center gap-2"
                data-testid={`sample-ticket-${i}`}
              >
                <Clipboard size={14} /> {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results panel ── */}
        <div className="lg:col-span-8 space-y-4">
          {isAnalyzing ? (
            <div className="bg-white border-2 border-black/20 p-12 flex flex-col items-center animate-pulse">
              <Cpu size={48} className="mb-4" />
              <p className="font-mono">{LOADING_TEXTS[loadingIdx]}</p>
            </div>
          ) : result ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-black/10 p-4">
                  <span className="text-xs font-mono text-gray-400 block mb-2">PRIORITY</span>
                  <PriorityBadge priority={result.priority} />
                  <p className="text-xs mt-2 text-gray-500">SLA: {result.sla_target_minutes} min</p>
                </div>
                <div className="bg-white border border-black/10 p-4">
                  <span className="text-xs font-mono text-gray-400 block mb-2">CONFIDENCE</span>
                  <ConfidenceBandBadge band={result.confidence_band} score={result.confidence_score} />
                  {result.needs_human_review && (
                    <p className="text-xs mt-2 text-amber-600 font-bold flex items-center gap-1">
                      <Warning size={12} /> NEEDS HUMAN REVIEW
                    </p>
                  )}
                </div>
              </div>

              {result.key_signals?.length > 0 && (
                <div className="bg-white border border-black/10 p-4">
                  <span className="text-xs font-mono text-gray-400 block mb-2">KEY SIGNALS DETECTED</span>
                  <div className="flex flex-wrap gap-2">
                    {result.key_signals.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-xs font-mono">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-black/10 p-4">
                <span className="text-xs font-mono text-gray-400 block mb-2">SUMMARY</span>
                <p>{result.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-black/10 p-4">
                  <span className="text-xs font-mono text-gray-400 block mb-2">ROOT CAUSE</span>
                  <p className="text-sm">{result.root_cause}</p>
                </div>
                <div className="bg-white border border-black/10 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-400">RESOLUTION STEPS</span>
                    <button
                      onClick={() => { copyToClipboard(result.resolution_steps); toast.success('Copied'); }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{result.resolution_steps}</p>
                </div>
              </div>

              {result.priority === 'P1' && result.bridge_update !== 'N/A' && (
                <div className="bg-black text-white p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400">P1 BRIDGE COMMUNICATION</span>
                    <button
                      onClick={() => { copyToClipboard(result.bridge_update); toast.success('Copied'); }}
                      className="text-xs text-blue-400 flex items-center gap-1"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <p className="font-mono text-sm whitespace-pre-wrap">{result.bridge_update}</p>
                </div>
              )}

              <button
                onClick={() => exportIncidentPDF(result)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold hover:bg-black transition-colors"
              >
                <FilePdf size={16} weight="fill" /> EXPORT PDF
              </button>
            </>
          ) : (
            <div className="bg-white border-2 border-dashed border-black/20 p-12 flex flex-col items-center text-gray-400">
              <User size={48} className="mb-4" />
              <p className="font-bold">Ready to Analyze</p>
              <p className="text-sm">Paste a ticket or select a sample</p>
            </div>
          )}
        </div>
      </div>
    </PageErrorBoundary>
  );
};

export default AnalyzePage;
