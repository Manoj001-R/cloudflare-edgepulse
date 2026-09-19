import React, { useEffect, useState, useCallback } from 'react';
import { listIncidents } from '../lib/api';

interface IncidentHistoryProps {
  onSelect: (id: string) => void;
  activeId: string | null;
}

export default function IncidentHistory({ onSelect, activeId }: IncidentHistoryProps) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listIncidents({
        limit: 50,
        search: search || undefined,
        severity: severityFilter || undefined,
      });
      setIncidents(data.incidents || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const severityDot = (sev: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-400',
      medium: 'bg-yellow-400',
      high: 'bg-orange-400',
      critical: 'bg-red-400',
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[sev] || 'bg-gray-400'}`} />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Incident History
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search incidents…"
          className="input-field text-xs py-1.5"
          id="incident-search"
        />
        <div className="flex gap-1 mt-2">
          {['', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`text-[0.65rem] px-2 py-0.5 rounded-full transition-colors ${
                severityFilter === sev
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]'
              }`}
            >
              {sev || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-dim)]">
            No incidents found
          </div>
        ) : (
          incidents.map((inc) => (
            <button
              key={inc.id}
              onClick={() => onSelect(inc.id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-hover)] ${
                activeId === inc.id ? 'bg-[var(--color-bg-hover)] border-l-2 border-l-[var(--color-accent)]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[0.7rem] text-[var(--color-accent)]">{inc.id}</span>
                {severityDot(inc.severity)}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] truncate mb-0.5">
                {inc.targetUrl}
              </p>
              <div className="flex items-center gap-2">
                <span className={`badge text-[0.6rem] status-${inc.status}`}>{inc.status}</span>
                <span className="text-[0.6rem] text-[var(--color-text-dim)]">
                  {new Date(inc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
