import React from 'react';

interface ReplayComparisonProps {
  data: {
    comparisons: any[];
    incident: any;
  };
}

const TOOL_LABELS: Record<string, string> = {
  check_dns: '🌐 DNS',
  check_http: '📡 HTTP',
  check_latency: '⏱️ Latency',
  check_security_headers: '🛡️ Security Headers',
  check_https_reachability: '🔒 HTTPS',
};

export default function ReplayComparison({ data }: ReplayComparisonProps) {
  if (!data.comparisons || data.comparisons.length === 0) {
    return (
      <div className="text-xs text-[var(--color-text-dim)] text-center py-4">
        No comparison data available.
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ animation: 'slideUp 0.3s ease-out' }}>
      {data.comparisons.map((comp: any) => (
        <div key={comp.tool} className="evidence-card">
          <div className="evidence-card-header">
            <span className="evidence-card-title">
              {TOOL_LABELS[comp.tool] || comp.tool}
            </span>
            <div className="flex items-center gap-2">
              <StatusDot status={comp.previous?.status} label="Before" />
              <span className="text-[var(--color-text-dim)]">→</span>
              <StatusDot status={comp.current?.status} label="Now" />
            </div>
          </div>

          {comp.changes && comp.changes.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {comp.changes.map((change: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-dim)]">{change.field}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[var(--color-text-muted)]">{change.previousValue}</span>
                    <span className="text-[var(--color-text-dim)]">→</span>
                    <span className="text-[var(--color-text)]">{change.currentValue}</span>
                    <span className={`text-xs font-semibold ${
                      change.difference.startsWith('+') ? 'text-red-400' :
                      change.difference.startsWith('-') ? 'text-green-400' :
                      'text-[var(--color-text-dim)]'
                    }`}>
                      {change.difference}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-[var(--color-text-dim)]">
              No significant changes detected
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-400',
    warning: 'bg-yellow-400',
    critical: 'bg-red-400',
    error: 'bg-red-400',
  };

  return (
    <span className="flex items-center gap-1 text-[0.65rem] text-[var(--color-text-dim)]">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      {label}
    </span>
  );
}
