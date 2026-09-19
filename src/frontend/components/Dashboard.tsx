import React, { useEffect, useState } from 'react';
import { getStats, listIncidents } from '../lib/api';

interface DashboardProps {
  onNewIncident: () => void;
  onSelectIncident: (id: string) => void;
}

interface Stats {
  activeInvestigations: number;
  completedInvestigations: number;
  criticalIncidents: number;
  averageInvestigationTimeMs: number;
}

export default function Dashboard({ onNewIncident, onSelectIncident }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsData, incidentsData] = await Promise.all([
        getStats().catch(() => null),
        listIncidents({ limit: 10 }).catch(() => ({ incidents: [], total: 0 })),
      ]);
      if (statsData) setStats(statsData);
      setIncidents(incidentsData.incidents || []);
    } catch {
      // Dashboard can fail gracefully
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (ms: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const statCards = [
    {
      label: 'Active Investigations',
      value: stats?.activeInvestigations ?? 0,
      icon: '🔄',
      color: 'text-[#60a5fa]',
    },
    {
      label: 'Completed',
      value: stats?.completedInvestigations ?? 0,
      icon: '✅',
      color: 'text-[#34d399]',
    },
    {
      label: 'Critical Incidents',
      value: stats?.criticalIncidents ?? 0,
      icon: '🚨',
      color: 'text-[#f87171]',
    },
    {
      label: 'Avg Investigation Time',
      value: formatTime(stats?.averageInvestigationTimeMs ?? 0),
      icon: '⏱️',
      color: 'text-[#fbbf24]',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Welcome Section */}
      <div className="text-center mb-8 pt-4">
        <h2 className="text-3xl font-bold mb-2">
          Welcome to <span className="text-gradient">EdgePulse</span>
        </h2>
        <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">
          AI-powered Internet incident investigation. Enter a URL and describe the problem —
          EdgePulse will diagnose, analyze, and recommend.
        </p>
        <button
          onClick={onNewIncident}
          className="btn-primary mt-5 text-base px-8 py-3"
          id="dashboard-start-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Start Investigation
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color} mb-1`}>
              {loading ? '—' : card.value}
            </div>
            <div className="text-xs text-[var(--color-text-dim)]">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Recent Incidents
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[var(--color-text-dim)]">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mb-3" />
            <p>Loading…</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-text-dim)] text-sm mb-4">
              No incidents yet. Start your first investigation!
            </p>
            <button onClick={onNewIncident} className="btn-secondary">
              Create Incident
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-dim)] text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Incident</th>
                  <th className="text-left px-5 py-3 font-medium">Target</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Severity</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc: any) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className="border-t border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-[var(--color-accent)]">{inc.id}</span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)] max-w-[200px] truncate">
                      {inc.targetUrl}
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-info">{inc.incidentType}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge severity-${inc.severity}`}>{inc.severity}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge status-${inc.status}`}>{inc.status}</span>
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {inc.confidence != null ? `${Math.round(inc.confidence * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
