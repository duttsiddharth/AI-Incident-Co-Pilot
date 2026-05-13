/**
 * useAnalyze.ts — drives the LLM analysis flow with loading animation.
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { analyzeTicket } from '../api';
import { useIncidentStore } from '../store/incidentStore';

const LOADING_TEXTS = ['ANALYZING...', 'QUERYING RAG...', 'COMPUTING...', 'GENERATING...'];

export function useAnalyze() {
  const {
    isAnalyzing,
    setIsAnalyzing,
    setAnalysisResult,
    setAnalyzeError,
    resetAnalysis,
  } = useIncidentStore();

  const loadingIndexRef = useRef(0);
  const loadingTextRef = useRef(LOADING_TEXTS[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isAnalyzing) {
      intervalRef.current = setInterval(() => {
        loadingIndexRef.current = (loadingIndexRef.current + 1) % LOADING_TEXTS.length;
        loadingTextRef.current = LOADING_TEXTS[loadingIndexRef.current];
      }, 1500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      loadingIndexRef.current = 0;
      loadingTextRef.current = LOADING_TEXTS[0];
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAnalyzing]);

  const analyze = useCallback(async (ticket: string) => {
    if (!ticket.trim()) {
      toast.error('Please enter a ticket');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalyzeError(null);

    const result = await analyzeTicket({ ticket });

    if (result.ok) {
      setAnalysisResult(result.data);
      toast.success('Analysis complete');
    } else {
      setAnalyzeError(result.error);
      toast.error(result.error.message);
    }
    setIsAnalyzing(false);
  }, [setIsAnalyzing, setAnalysisResult, setAnalyzeError]);

  return {
    analyze,
    resetAnalysis,
    loadingText: loadingTextRef.current,
  };
}
