import React, { useEffect, useState } from 'react';
import { getIncident, getToolResults, getSteps, getMessages, replayIncident } from '../lib/api';
import IncidentTimeline from './IncidentTimeline';
import ReplayComparison from './ReplayComparison';

interface IncidentDetailsProps {
  incidentId: string;
  onBack: () => void;
  onReplay: (id: string) => void;
}

export default function IncidentDetails({ incidentId, onBack, onReplay }: IncidentDetailsProps) {
  const [incident, setIncident] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayData, setReplayData] = useState<any>(null);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [incidentId]);

  async function loadDetails() {
    setLoading(true);
    try {
      const [incData, resultsData, stepsData, msgsData] = await Promise.all([
        getIncident(incidentId),
        getToolResults(incidentId).catch(() => []),
        getSteps(incidentId).catch(() => []),
        getMessages(incidentId).catch(() => []),
      ]);
      if (incData) {
        setIncident(incData.incident);
        setAnalysis(incData.analysis);
      }
      if (Array.isArray(resultsData)) setResults(resultsData);
      if (Array.isArray(stepsData)) setSteps(stepsData);
      if (Array.isArray(msgsData)) setMessages(msgsData);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleReplay() {
    setReplaying(true);
    try {
      const data = await replayIncident(incidentId, true);
      setReplayData(data);
    } catch (err) {
      console.error('Replay failed:', err);
    } finally {
      setReplaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[var(--color-text-dim)] mb-4">Incident not found</p>
        <button onClick={onBack} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  const confidencePercent = analysis?.confidence != null ? Math.round(analysis.confidence * 100) : null;
  const confidenceColor = confidencePercent != null
    ? confidencePercent >= 80 ? 'var(--color-healthy)'
    : confidencePercent >= 50 ? 'var(--color-warning)'
    : 'var(--color-critical)'
    : 'var(--color-text-dim)';

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Back button */}
      <button onClick={onBack} className="btn-secondary mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      {/* Incident Header */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Incident</p>
            <p className="font-mono text-sm text-[var(--color-accent)] font-semibold">{incident.id}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Target</p>
            <p className="text-sm truncate">{incident.targetUrl}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Type</p>
            <span className="badge badge-info capitalize">{incident.incidentType}</span>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Severity</p>
            <span className={`badge severity-${incident.severity} capitalize`}>{incident.severity}</span>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Status</p>
            <span className={`badge status-${incident.status} capitalize`}>{incident.status}</span>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Confidence</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: confidenceColor }}>
                {confidencePercent != null ? `${confidencePercent}%` : '—'}
              </span>
            </div>
            {confidencePercent != null && (
              <div className="confidence-bar mt-1">
                <div
                  className="confidence-fill"
                  style={{ width: `${confidencePercent}%`, background: confidenceColor }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis */}
      {analysis && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            AI Analysis
          </h3>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-[var(--color-text-dim)] uppercase mb-1">Summary</h4>
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-[var(--color-text-dim)] uppercase mb-1">Likely Root Cause</h4>
            <p className="text-sm leading-relaxed text-[var(--color-warning)]">{analysis.likelyRootCause}</p>
          </div>

          {analysis.findings?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[var(--color-text-dim)] uppercase mb-2">Findings</h4>
              <div className="space-y-2">
                {analysis.findings.map((f: any, i: number) => (
                  <div key={i} className="evidence-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{f.signal}</span>
                      <span className="font-mono text-sm text-[var(--color-accent)]">{f.value}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-dim)] mt-1">{f.interpretation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.recommendedActions?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[var(--color-text-dim)] uppercase mb-2">Recommended Actions</h4>
              <div className="space-y-3">
                {analysis.recommendedActions.map((a: any, i: number) => (
                  <div key={i} className="evidence-card">
                    <div className="text-sm font-medium mb-1">{i + 1}. {a.problem}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-[var(--color-text-dim)]">Evidence:</span> {a.evidence}</div>
                      <div><span className="text-[var(--color-text-dim)]">Likely Cause:</span> {a.likelyCause}</div>
                      <div><span className="text-[var(--color-text-dim)]">Action:</span> <span className="text-[var(--color-accent)]">{a.action}</span></div>
                      <div><span className="text-[var(--color-text-dim)]">Risk:</span> {a.risk}</div>
                      <div className="md:col-span-2"><span className="text-[var(--color-text-dim)]">Validation:</span> {a.validation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.limitations?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--color-text-dim)] uppercase mb-2">Limitations</h4>
              <ul className="space-y-1">
                {analysis.limitations.map((l: string, i: number) => (
                  <li key={i} className="text-xs text-[var(--color-text-dim)] flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {steps.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Investigation Timeline
          </h3>
          <IncidentTimeline steps={steps} />
        </div>
      )}

      {/* Replay */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Replay Investigation
          </h3>
          <button onClick={handleReplay} disabled={replaying} className="btn-primary text-xs">
            {replaying ? (
              <>
                <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                Replaying…
              </>
            ) : (
              <>🔄 Replay</>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-dim)] mb-3">
          Re-run diagnostics and compare with the original results.
        </p>
        {replayData && <ReplayComparison data={replayData} />}
      </div>

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Conversation
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`chat-bubble chat-bubble-${msg.role} text-xs`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
