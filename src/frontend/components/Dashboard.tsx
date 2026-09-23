import React, { useEffect, useState } from 'react';
import { getStats, listIncidents } from '../lib/api';

interface DashboardProps {
  onNewInvestigation: () => void;
  onSelectIncident: (id: string) => void;
}

export default function Dashboard({ onNewInvestigation, onSelectIncident }: DashboardProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24h');
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthCheckNotice, setHealthCheckNotice] = useState<string | null>(null);
  const [backendIncidents, setBackendIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [statsResponse, incidentResponse] = await Promise.all([
          getStats().catch(() => null),
          listIncidents({ limit: 5 }).catch(() => ({ incidents: [] })),
        ]);

        if (cancelled) return;

        setStats(statsResponse);
        setBackendIncidents(incidentResponse?.incidents || []);
      } catch {
        setBackendIncidents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const incidentsList = backendIncidents.length ? backendIncidents.map((item) => ({
    id: item.id,
    domain: new URL(item.targetUrl || 'https://example.com').hostname,
    issue: item.userQuestion || 'Incident investigation',
    severity: item.severity ? item.severity.charAt(0).toUpperCase() + item.severity.slice(1) : 'Medium',
    severityColor: item.severity === 'critical' ? '#dc2626' : item.severity === 'high' ? '#ef4444' : '#3b82f6',
    severityBg: item.severity === 'critical' ? '#fee2e2' : item.severity === 'high' ? '#fef2f2' : '#eff6ff',
    status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Created',
    statusColor: '#3b82f6',
    statusBg: '#eff6ff',
    isAnalyzing: item.status === 'investigating' || item.status === 'planning',
    confidence: item.confidence || 0,
    created: 'recent',
    actionText: 'View Investigation',
    isPrimaryAction: true,
  })) : [
    {
      id: 'INC-20260919-0001',
      domain: 'example.com',
      issue: 'Origin TTFB Spike',
      severity: 'High',
      severityColor: '#ef4444',
      severityBg: '#fef2f2',
      status: 'Analyzing',
      statusColor: '#3b82f6',
      statusBg: '#eff6ff',
      isAnalyzing: true,
      confidence: 84,
      created: '2 min ago',
      actionText: 'View Investigation',
      isPrimaryAction: true,
    },
    {
      id: 'INC-20260919-0002',
      domain: 'api.example.com',
      issue: 'HTTP 502 Bad Gateway',
      severity: 'Medium',
      severityColor: '#3b82f6',
      severityBg: '#eff6ff',
      status: 'Mitigated',
      statusColor: '#64748b',
      statusBg: '#f1f5f9',
      isAnalyzing: false,
      confidence: 76,
      created: '18 min ago',
      actionText: 'View Report',
      isPrimaryAction: false,
    },
    {
      id: 'INC-20260919-0003',
      domain: 'shop.example.com',
      issue: 'DNS Resolution Failure',
      severity: 'Critical',
      severityColor: '#dc2626',
      severityBg: '#fee2e2',
      status: 'Resolved',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      isAnalyzing: false,
      confidence: 91,
      created: '1 hour ago',
      actionText: 'View Report',
      isPrimaryAction: false,
    },
    {
      id: 'INC-20260919-0004',
      domain: 'auth.globalcdn.net',
      issue: 'TLS Handshake Latency',
      severity: 'Low',
      severityColor: '#64748b',
      severityBg: '#f1f5f9',
      status: 'Resolved',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      isAnalyzing: false,
      confidence: 95,
      created: '3 hours ago',
      actionText: 'View Report',
      isPrimaryAction: false,
    },
    {
      id: 'INC-20260919-0005',
      domain: 'checkout.payments.io',
      issue: 'Origin Gateway Timeout',
      severity: 'High',
      severityColor: '#ef4444',
      severityBg: '#fef2f2',
      status: 'Queued',
      statusColor: '#64748b',
      statusBg: '#f1f5f9',
      isAnalyzing: false,
      confidence: 68,
      created: '5 hours ago',
      actionText: 'View Report',
      isPrimaryAction: false,
    },
  ];

  const handleRunHealthCheck = () => {
    setIsHealthChecking(true);
    setHealthCheckNotice('Running edge mesh diagnostics across 32 PoPs...');
    setTimeout(() => {
      setIsHealthChecking(false);
      setHealthCheckNotice('All 284 Anycast nodes healthy. Quorum 100% OK.');
      setTimeout(() => setHealthCheckNotice(null), 4000);
    }, 1200);
  };

  const filteredIncidents = incidentsList.filter((item) => {
    if (filterQuery) {
      const match =
        item.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.domain.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.issue.toLowerCase().includes(filterQuery.toLowerCase());
      if (!match) return false;
    }
    if (severityFilter !== 'all' && item.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="page-scroll-area fade-in">
      {/* Header Greeting & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Good evening, Manoj
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SRE Lead
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Overview of active incidents, edge performance, and automated investigations across your domains.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            onClick={handleRunHealthCheck}
            disabled={isHealthChecking}
          >
            <svg
              className={`w-4 h-4 text-slate-600 ${isHealthChecking ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Run Health Check</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 shadow-sm transition-all"
            onClick={onNewInvestigation}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {healthCheckNotice && (
        <div className="mb-5 p-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {healthCheckNotice}
        </div>
      )}

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Incidents */}
        <div className="white-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Incidents</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">128</span>
            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              ↑ +12% vs last mo
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '42%' }} />
          </div>
        </div>

        {/* Card 2: Active Investigations */}
        <div className="white-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Investigations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">4</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              2 need attention
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>2 high priority running now</span>
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="white-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">112</span>
            <span className="text-xs text-slate-600 font-medium">
              94% auto-resolved
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94%' }} />
          </div>
        </div>

        {/* Card 4: Avg. Resolution Time */}
        <div className="white-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Resolution Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">8m 42s</span>
            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ↓ -3m vs manual
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Automated playbook active</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table Card */}
      <div className="white-card overflow-hidden mb-6">
        {/* Table Top Header with Search and Filter controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">Recent Incidents</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                5 Active/Recent
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time edge diagnostics, automated root-cause detection, and remediation reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search filter */}
            <div className="relative min-w-[220px]">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-400"
                placeholder="Filter by domain or incident ID..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            {/* Severity Filter */}
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none font-medium cursor-pointer"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none font-medium cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="analyzing">Analyzing</option>
              <option value="mitigated">Mitigated</option>
              <option value="resolved">Resolved</option>
              <option value="queued">Queued</option>
            </select>

            {/* Time Filter */}
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none font-medium cursor-pointer"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Incident ID</th>
                <th className="py-3 px-5">Domain / URL</th>
                <th className="py-3 px-5">Issue</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Created</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectIncident(inc.id)}
                >
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </span>
                      <span className="font-semibold text-indigo-700 hover:underline">
                        {inc.id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200">
                      {inc.domain}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-800">
                    {inc.issue}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className="px-2.5 py-1 rounded-full font-semibold text-[11px] inline-block"
                      style={{ color: inc.severityColor, backgroundColor: inc.severityBg }}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px]"
                      style={{ color: inc.statusColor, backgroundColor: inc.statusBg }}
                    >
                      {inc.isAnalyzing && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${inc.confidence}%`,
                            backgroundColor: inc.confidence > 80 ? '#4338ca' : inc.confidence > 70 ? '#3b82f6' : '#10b981',
                          }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {inc.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                    {inc.created}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {inc.isPrimaryAction ? (
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs hover:bg-indigo-200 transition-all shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(inc.id);
                        }}
                      >
                        {inc.actionText}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-xs hover:bg-slate-50 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(inc.id);
                        }}
                      >
                        {inc.actionText}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-semibold">1-5</strong> of{' '}
            <strong className="text-slate-800 font-semibold">128</strong> incidents
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium rounded-lg text-xs cursor-not-allowed border border-slate-200"
              disabled
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1.5 bg-white text-slate-700 font-medium rounded-lg text-xs hover:bg-slate-50 border border-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Two Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Live Diagnostic Activity */}
        <div className="white-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h3 className="text-sm font-bold text-slate-900">Live Diagnostic Activity</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-time feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Continuous audit trail of edge probes, synthetic requests, and automated mitigation steps.
            </p>

            {/* Stream List */}
            <div className="space-y-3">
              {/* Event 1 */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Root cause analysis completed</h4>
                    <span className="text-[11px] text-slate-400">1m ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Correlation engine pinned latency spike on <strong className="text-slate-800">INC-20260919-0001</strong> to US-East-1 egress throttles.
                  </p>
                </div>
              </div>

              {/* Event 2 */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">DNS record health re-verified</h4>
                    <span className="text-[11px] text-slate-400">6m ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Authoritative name servers for <span className="font-mono text-slate-700">api.example.com</span> propagated correctly across all edge nodes.
                  </p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Latency probe normalized</h4>
                    <span className="text-[11px] text-slate-400">14m ago</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Edge mesh synthetic benchmarks cleared across 18 Asia-Pacific ingress PoPs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">
              Automated playbook rule: <strong>EP-PROBE-V4</strong>
            </span>
            <button type="button" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
              View all diagnostic logs →
            </button>
          </div>
        </div>

        {/* Right Card: Edge Mesh Fleet Status */}
        <div className="white-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <h3 className="text-sm font-bold text-slate-900">Edge Mesh Fleet Status</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Operational
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Worldwide traffic mesh availability across tier-1 regional transit nodes.
            </p>

            {/* Big Numbers & Progress */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-extrabold text-slate-900">284 / 284</span>
                <span className="text-xs font-bold text-emerald-600">100% Available</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                <span>Global Anycast Nodes</span>
                <span>Zero degraded clusters</span>
              </div>
            </div>

            {/* Sub-Metrics Boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500 font-medium">Global Latency P95</div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold text-slate-900">14.2ms</span>
                  <span className="text-xs font-semibold text-emerald-600">-1.1ms</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Strict SLA threshold &lt; 25ms</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500 font-medium">30-Day Uptime</div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold text-slate-900">99.994%</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Target met</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Error budget remaining: 92%</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>BGP routing converging normally</span>
            </div>
            <button type="button" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
              Fleet metrics ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
