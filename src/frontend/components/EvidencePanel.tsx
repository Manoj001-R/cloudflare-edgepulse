import React, { useEffect, useState } from 'react';
import { getToolResults } from '../lib/api';

interface EvidencePanelProps {
  incidentId: string;
}

export default function EvidencePanel({ incidentId }: EvidencePanelProps) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
    const interval = setInterval(loadResults, 4000);
    return () => clearInterval(interval);
  }, [incidentId]);

  async function loadResults() {
    try {
      const data = await getToolResults(incidentId);
      if (Array.isArray(data)) setResults(data);
    } catch {
      // Silent poll failure
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <span className="badge badge-healthy">PASS</span>;
      case 'warning': return <span className="badge badge-warning">WARN</span>;
      case 'critical': return <span className="badge badge-critical">FAIL</span>;
      case 'error': return <span className="badge badge-critical">ERROR</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  function renderToolResult(result: any) {
    switch (result.tool) {
      case 'check_dns':
        return (
          <div className="evidence-card" key={result.tool} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="evidence-card-header">
              <span className="evidence-card-title">🌐 DNS</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="evidence-value">{result.records?.length || 0} records</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              {result.responseTimeMs}ms response
            </div>
            {result.records?.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                {r.type}: {r.value}
              </div>
            ))}
            {result.isDemo && <DemoLabel />}
          </div>
        );

      case 'check_http':
        return (
          <div className="evidence-card" key={result.tool} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="evidence-card-header">
              <span className="evidence-card-title">📡 HTTP</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="evidence-value">
              {result.httpStatus || 'N/A'}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              {result.latencyMs}ms • {result.contentType || 'unknown'}
            </div>
            {result.server && (
              <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
                Server: {result.server}
              </div>
            )}
            {result.isDemo && <DemoLabel />}
          </div>
        );

      case 'check_latency':
        const latencyColor = result.classification === 'low' ? 'var(--color-healthy)' :
          result.classification === 'moderate' ? 'var(--color-warning)' :
          result.classification === 'high' ? '#fb923c' : 'var(--color-critical)';

        return (
          <div className="evidence-card" key={result.tool} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="evidence-card-header">
              <span className="evidence-card-title">⏱️ Latency</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="evidence-value" style={{ color: latencyColor }}>
              {result.latencyMs}ms
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              Classification: <span className="capitalize">{result.classification}</span>
            </div>
            {result.measurements?.length > 0 && (
              <div className="text-xs font-mono text-[var(--color-text-dim)] mt-1">
                Samples: {result.measurements.join('ms, ')}ms
              </div>
            )}
            {result.isDemo && <DemoLabel />}
          </div>
        );

      case 'check_security_headers':
        return (
          <div className="evidence-card" key={result.tool} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="evidence-card-header">
              <span className="evidence-card-title">🛡️ Security Headers</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="evidence-value">
              {result.score}/{result.maxScore}
            </div>
            <div className="confidence-bar mt-2">
              <div
                className="confidence-fill"
                style={{
                  width: `${(result.score / result.maxScore) * 100}%`,
                  background: result.score === result.maxScore ? 'var(--color-healthy)' :
                    result.score >= result.maxScore * 0.5 ? 'var(--color-warning)' : 'var(--color-critical)',
                }}
              />
            </div>
            {result.missing?.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-[var(--color-text-dim)]">Missing: </span>
                {result.missing.map((h: string, i: number) => (
                  <span key={i} className="text-xs text-red-400 mr-1">{h}{i < result.missing.length - 1 ? ',' : ''}</span>
                ))}
              </div>
            )}
            {result.isDemo && <DemoLabel />}
          </div>
        );

      case 'check_https_reachability':
        return (
          <div className="evidence-card" key={result.tool} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="evidence-card-header">
              <span className="evidence-card-title">🔒 HTTPS</span>
              {getStatusBadge(result.status)}
            </div>
            <div className="space-y-1 mt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-dim)]">HTTPS</span>
                <span className={result.httpsAccessible ? 'text-green-400' : 'text-red-400'}>
                  {result.httpsAccessible ? '✓ Accessible' : '✗ Not accessible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-dim)]">HTTP</span>
                <span className={result.httpAccessible ? 'text-green-400' : 'text-red-400'}>
                  {result.httpAccessible ? '✓ Accessible' : '✗ Not accessible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-dim)]">Redirect</span>
                <span className="text-[var(--color-text-muted)]">
                  {result.redirectsToHttps ? '→ HTTPS' : 'None'}
                </span>
              </div>
            </div>
            {result.isDemo && <DemoLabel />}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Evidence Dashboard
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-dim)]">
            <p>Awaiting diagnostic results…</p>
          </div>
        ) : (
          results.map((r) => renderToolResult(r))
        )}
      </div>
    </div>
  );
}

function DemoLabel() {
  return (
    <div className="mt-2 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[0.65rem] font-semibold text-center">
      DEMO DATA
    </div>
  );
}
