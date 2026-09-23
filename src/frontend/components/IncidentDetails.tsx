import React, { useEffect, useState } from 'react';
import { getAnalysis, getIncident, getMessages, getSteps, replayIncident, sendChat } from '../lib/api';
import RemediationModal from './RemediationModal';

interface IncidentDetailsProps {
  incidentId?: string;
  onBack: () => void;
}

export default function IncidentDetails({
  incidentId = 'INC-20260919-0001',
  onBack,
}: IncidentDetailsProps) {
  const [isResolved, setIsResolved] = useState(false);
  const [isReRunning, setIsReRunning] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotReplies, setCopilotReplies] = useState<Array<{ q: string; a: string }>>([]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [incidentData, setIncidentData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setDataError(null);

      try {
        const [incidentResponse, analysisResponse, messagesResponse, stepsResponse] = await Promise.all([
          getIncident(incidentId).catch(() => null),
          getAnalysis(incidentId).catch(() => null),
          getMessages(incidentId).catch(() => []),
          getSteps(incidentId).catch(() => []),
        ]);

        if (cancelled) return;

        setIncidentData(incidentResponse || null);
        setAnalysisData(analysisResponse || null);

        if (messagesResponse?.length) {
          setCopilotReplies((prev) => prev.length ? prev : messagesResponse
            .filter((msg: any) => msg.role === 'assistant')
            .map((msg: any) => ({ q: 'Previous context', a: msg.content })));
        }

        if (stepsResponse?.length && !incidentResponse) {
          setDataError('The incident exists but the full payload is still being prepared.');
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : 'Unable to load incident data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  const handleReRun = async () => {
    setIsReRunning(true);
    try {
      await replayIncident(incidentId, false);
    } catch (error) {
      setExportNotice(error instanceof Error ? error.message : 'Replay failed');
    } finally {
      setIsReRunning(false);
    }
  };

  const handleExport = () => {
    setExportNotice('Exporting incident report as PDF / JSON...');
    setTimeout(() => {
      setExportNotice('Incident report exported successfully.');
      setTimeout(() => setExportNotice(null), 3000);
    }, 1000);
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const question = copilotInput.trim();
    setCopilotInput('');

    try {
      const response = await sendChat(incidentId, question);
      setCopilotReplies((prev) => [...prev, { q: question, a: response.answer }]);
    } catch (error) {
      setCopilotReplies((prev) => [...prev, {
        q: question,
        a: error instanceof Error ? error.message : 'Unable to reach the backend AI service.',
      }]);
    }
  };

  const targetUrl = incidentData?.incident?.targetUrl || 'https://example.com';
  const currentSeverity = (incidentData?.incident?.severity || 'high').toLowerCase();
  const currentStatus = incidentData?.incident?.status || 'investigating';
  const summary = analysisData?.summary || 'AI analysis is loading from the backend service.';
  const rootCause = analysisData?.rootCause || 'No root cause available yet.';

  return (
    <div className="page-scroll-area fade-in">
      {/* Top Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {incidentId}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              {currentSeverity === 'critical' ? 'Critical Severity' : currentSeverity === 'medium' ? 'Medium Severity' : currentSeverity === 'low' ? 'Low Severity' : 'High Severity'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isResolved || currentStatus === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isResolved ? 'bg-emerald-500' : 'bg-indigo-600 animate-pulse'
                }`}
              />
              {isResolved || currentStatus === 'completed' ? 'Resolved' : 'Investigating'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Target:</span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1"
            >
              {targetUrl}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
            onClick={handleReRun}
            disabled={isReRunning}
          >
            <svg
              className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Re-run</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
            onClick={handleExport}
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Export Report</span>
          </button>

          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
              isResolved ? 'bg-slate-600 hover:bg-slate-700' : 'bg-emerald-800 hover:bg-emerald-900'
            }`}
            onClick={() => setIsResolved(!isResolved)}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{isResolved ? 'Mark Investigating' : 'Mark Resolved'}</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="mb-5 p-3 px-4 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          {exportNotice}
        </div>
      )}

      {/* 3 Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Investigation Plan (width: 3 cols in 12-grid) */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="white-card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Investigation Plan</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                80%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              8 of 10 automated steps completed
            </p>

            {/* Timeline Steps */}
            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
              {/* Step 1: Incident Created */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Incident Created</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:01</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Edge trigger matched</p>
                </div>
              </div>

              {/* Step 2: AI Triage Initiated */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">AI Triage Initiated</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:05</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Priority assigned (P1)</p>
                </div>
              </div>

              {/* Step 3: Plan Synthetic Probes */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Plan Synthetic Probes</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:09</span>
                  </div>
                  <p className="text-[11px] text-slate-500">6 probes scheduled</p>
                </div>
              </div>

              {/* Step 4: DNS Health Check */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">DNS Health Check</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:14</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">45ms resolution • OK</p>
                </div>
              </div>

              {/* Step 5: HTTP Probe (Origin) - Warning */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 z-10 bg-white">
                  <span className="text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-700">HTTP Probe (Origin)</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:19</span>
                  </div>
                  <p className="text-[11px] text-red-600 font-semibold">1,820ms TTFB detected</p>
                </div>
              </div>

              {/* Step 6: Multi-Region Latency - Warning */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 z-10 bg-white">
                  <span className="text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-700">Multi-Region Latency</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:28</span>
                  </div>
                  <p className="text-[11px] text-red-600 font-semibold">Global spike confirmed</p>
                </div>
              </div>

              {/* Step 7: Security Headers */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Security Headers</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:34</span>
                  </div>
                  <p className="text-[11px] text-slate-500">5 of 6 checks passed</p>
                </div>
              </div>

              {/* Step 8: TLS & SSL Integrity */}
              <div className="flex items-start gap-2.5 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 z-10 bg-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">TLS & SSL Integrity</span>
                    <span className="text-[10px] text-slate-400 font-mono">14:32:41</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">TLS 1.3 • 18ms • Valid</p>
                </div>
              </div>

              {/* Step 9: Root Cause Analysis - Active */}
              <div className="flex items-start gap-2.5 relative p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 -mx-1">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 z-10">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">Root Cause Analysis</span>
                    <span className="text-[10px] font-bold text-indigo-700">88%</span>
                  </div>
                  <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '88%' }} />
                  </div>
                </div>
              </div>

              {/* Step 10: Remediation Playbook - Pending */}
              <div className="flex items-start gap-2.5 relative opacity-60">
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 flex-shrink-0 z-10 bg-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Remediation Playbook</span>
                    <span className="text-[10px] text-slate-400">Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Waiting for analysis</p>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Diagnostician Card */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center gap-3 shadow-md border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Auto-Diagnostician</div>
              <div className="text-[11px] text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Processing 42 trace spans...
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Telemetry, Health & Security (width: 5.5 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Latency & Response Time */}
          <div className="white-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Latency & Response Time</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                +1,200% Spike
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              End-to-end edge-to-origin duration
            </p>

            {/* Top Stat Boxes */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Current P99
                </div>
                <div className="text-3xl font-extrabold text-red-600 mt-0.5">
                  1,820 <span className="text-sm font-medium">ms</span>
                </div>
                <div className="text-[11px] font-semibold text-red-600 mt-0.5">
                  Critical degradation
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Normal Baseline
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                  140 <span className="text-sm font-medium">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  30-day historical avg
                </div>
              </div>
            </div>

            {/* SVG Spike Curve Area Chart */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl mb-4">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="font-semibold text-slate-700">Last 60 Minutes (Spike profile)</span>
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Anomaly start 14:18 UTC
                </span>
              </div>

              <div className="w-full h-28 relative">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="spikeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                      <stop offset="70%" stopColor="#ef4444" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Baseline dashed reference line at Y=85 (140ms) */}
                  <line x1="0" y1="85" x2="400" y2="85" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Shaded area under curve */}
                  <path
                    d="M 0 85 L 180 85 Q 210 85 240 18 L 400 15 L 400 95 L 0 95 Z"
                    fill="url(#spikeGradient)"
                  />

                  {/* Primary red spike line */}
                  <path
                    d="M 0 85 L 180 85 Q 210 85 240 18 L 400 15"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Spike peak dot with pulse */}
                  <circle cx="240" cy="18" r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="390" cy="15" r="3" fill="#dc2626" />
                </svg>

                <div className="absolute left-1 bottom-1 text-[10px] text-slate-400 font-mono">
                  Baseline 140ms
                </div>
              </div>
            </div>

            {/* Regional Point of Presence Telemetry Cards */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Regional Point-of-Presence Telemetry
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] font-semibold text-slate-600">SFO (US-West)</div>
                  <div className="text-sm font-extrabold text-red-600 mt-0.5">1,840ms</div>
                  <div className="text-[9px] text-slate-400">+1,214ms origin</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] font-semibold text-slate-600">ORD (US-East)</div>
                  <div className="text-sm font-extrabold text-red-600 mt-0.5">1,790ms</div>
                  <div className="text-[9px] text-slate-400">+1,180ms origin</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] font-semibold text-slate-600">LHR (Europe)</div>
                  <div className="text-sm font-extrabold text-red-600 mt-0.5">1,910ms</div>
                  <div className="text-[9px] text-slate-400">+1,205ms origin</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] font-semibold text-slate-600">SYD (APAC)</div>
                  <div className="text-sm font-extrabold text-red-600 mt-0.5">2,100ms</div>
                  <div className="text-[9px] text-slate-400">+1,240ms origin</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Protocol & Network Health */}
          <div className="white-card p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Protocol & Network Health</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DNS Probes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">DNS Probes</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Healthy
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resolve Time</span>
                    <strong className="text-slate-900">45 ms</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">A Record</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10.5px]">
                      93.184.216.34
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DNSSEC</span>
                    <span className="text-emerald-700 font-semibold">✔ Validated</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-slate-500">Authoritative NS</span>
                    <span className="font-mono text-slate-700 text-[11px]">dynect.n...</span>
                  </div>
                </div>
              </div>

              {/* HTTP Layer */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">HTTP Layer</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                    Degraded
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Code</span>
                    <strong className="text-emerald-600 font-bold">200 OK</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TTFB</span>
                    <strong className="text-red-600 font-bold">1,820 ms (Delayed)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Protocol</span>
                    <span className="text-slate-800 font-mono text-[11px]">HTTP/2 h2-14</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Edge Cache</span>
                    <span className="text-slate-700 font-mono text-[11px]">BYPASS / MISS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Security & TLS Integrity */}
          <div className="white-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Security & TLS Integrity</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🔒 Secure Handshake
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Security Headers */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">Security Headers</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      5 / 6 Pass
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                    HSTS, CSP, and X-Frame-Options configured with strict enforcement policy.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    HSTS max-age
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    CSP Enforced
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    SAMEORIGIN
                  </span>
                </div>
              </div>

              {/* TLS Certificate */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">TLS Certificate</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      242 Days Left
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                    DigiCert Global TLS RSA SHA256 • TLS 1.3 negotiated with cipher TLS_AES_256_GCM_SHA384.
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-slate-600 border-t border-slate-200 pt-1.5">
                  <span>OCSP Stapling: <strong>Active</strong></span>
                  <span>Valid until <strong>Nov 2026</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: AI Copilot (width: 3.5 cols in 12-grid)     */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="white-card p-5">
            {/* AI Copilot Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="16" x2="8.01" y2="16" />
                    <line x1="16" y1="16" x2="16.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Copilot</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                84% Confidence
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Real-time SRE Agent
            </p>

            {/* Box 1: Key Finding */}
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl mb-4">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase mb-2">
                <span>📄</span>
                <span>Key Finding</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Origin Performance Bottleneck
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                High latency originates directly from the origin web service (<span className="font-mono text-slate-800">93.184.216.34:443</span>), completely independent of edge routing or DNS propagation.
              </p>
            </div>

            {/* Box 2: Correlated Telemetry Evidence */}
            <div className="mb-4">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Correlated Telemetry Evidence
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <span className="text-emerald-600 font-bold mt-0.5">✔</span>
                  <span>Edge transit latency remains optimal across global mesh (<strong>22ms</strong>).</span>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/60 border border-red-100 text-xs text-red-900 leading-relaxed">
                  <span className="text-red-600 font-bold mt-0.5">⚠</span>
                  <span>Origin TTFB accounts for <strong>96%</strong> of total transaction duration (<strong>1,820ms</strong>).</span>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <span className="text-red-500 font-bold mt-0.5">🚫</span>
                  <span>Consistent delay across all 4 monitored geographic regions indicates central application layer block.</span>
                </div>
              </div>
            </div>

            {/* Box 3: Recommended Actions */}
            <div className="mb-4">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Recommended Actions
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">
                      Inspect origin server CPU & database connection pool
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Check for lock contention on Postgres primary node.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">
                      Enable Edge Cache-Everything rule
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Shield origin with a 120s TTL temporary cache to shed 85% load.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">
                      Review origin APM profiling traces
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Identify specific slow endpoints matching <code className="text-indigo-600">/api/v1/checkout</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button: Generate Remediation Script */}
            <button
              type="button"
              className="w-full py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all mb-4"
              onClick={() => setShowRemediation(true)}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Generate Remediation Script</span>
            </button>

            {/* Copilot Chat Interactions */}
            {copilotReplies.length > 0 && (
              <div className="mb-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {copilotReplies.map((reply, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="p-2 bg-indigo-100/70 text-indigo-950 font-medium rounded-lg text-right">
                      {reply.q}
                    </div>
                    <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg leading-relaxed border border-slate-200">
                      {reply.a}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ask AI Copilot Input */}
            <form onSubmit={handleAskCopilot} className="relative">
              <input
                type="text"
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all"
                placeholder="Ask AI Copilot about this incident..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 font-bold p-1"
                title="Send"
              >
                →
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Remediation Script Modal */}
      <RemediationModal
        isOpen={showRemediation}
        onClose={() => setShowRemediation(false)}
        incidentId={incidentId}
      />
    </div>
  );
}
