import React, { useEffect, useState } from 'react';
import { listIncidents } from '../lib/api';

interface IncidentsListProps {
  onSelectIncident: (id: string) => void;
  onNewInvestigation: () => void;
}

export default function IncidentsList({ onSelectIncident, onNewInvestigation }: IncidentsListProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await listIncidents({ limit: 50 });
        if (!cancelled) setIncidents(response.incidents || []);
      } catch {
        if (!cancelled) setIncidents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = incidents.map((inc) => {
    const severity = (inc.severity || 'medium').toLowerCase();
    return {
      id: inc.id,
      domain: inc.targetUrl ? new URL(inc.targetUrl).hostname : 'example.com',
      issue: inc.userQuestion || 'Incident investigation',
      severityLabel: severity.charAt(0).toUpperCase() + severity.slice(1),
      severity,
      severityColor: severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ef4444' : '#3b82f6',
      severityBg: severity === 'critical' ? '#fee2e2' : severity === 'high' ? '#fef2f2' : '#eff6ff',
      status: (inc.status || 'created').charAt(0).toUpperCase() + (inc.status || 'created').slice(1),
      statusColor: '#3b82f6',
      statusBg: '#eff6ff',
      confidence: inc.confidence || 0,
      created: 'recent',
    };
  });

  const filtered = rows.filter((inc) => {
    const q = filterQuery.toLowerCase();
    const matchesQuery = !q || inc.id.toLowerCase().includes(q) || inc.domain.toLowerCase().includes(q) || inc.issue.toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
    return matchesQuery && matchesSeverity;
  });

  if (loading) {
    return (
      <div className="page-scroll-area fade-in">
        <div className="white-card p-6 text-sm text-slate-600">Loading incidents from the backend…</div>
      </div>
    );
  }

  return (
    <div className="page-scroll-area fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Incident Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical audit log of all edge diagnostic investigations, root causes, and remediation actions.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 shadow-sm transition-all self-start sm:self-auto"
          onClick={onNewInvestigation}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Investigation</span>
        </button>
      </div>

      <div className="white-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[280px]">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-400"
              placeholder="Search incidents by domain or ID..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Severity:</span>
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Incident ID</th>
                <th className="py-3 px-5">Domain</th>
                <th className="py-3 px-5">Issue</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Created</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectIncident(inc.id)}
                >
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="font-bold font-mono text-indigo-700 hover:underline">
                      {inc.id}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200">
                      {inc.domain}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-800">
                    {inc.issue}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className="px-2.5 py-0.5 rounded-full font-semibold text-[11px]"
                      style={{ color: inc.severityColor, backgroundColor: inc.severityBg }}
                    >
                      {inc.severityLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className="px-2.5 py-0.5 rounded-full font-semibold text-[11px]"
                      style={{ color: inc.statusColor, backgroundColor: inc.statusBg }}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-700 font-semibold">
                    {inc.confidence}%
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 font-medium">
                    {inc.created}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc.id);
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-[11px] font-semibold hover:bg-slate-700 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
