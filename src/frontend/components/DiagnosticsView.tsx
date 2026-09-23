import React from 'react';

export default function DiagnosticsView() {
  const edgePoPs = [
    { name: 'Frankfurt (FRA)', region: 'Europe', latency: '12ms', status: 'Optimal', load: '38%' },
    { name: 'London (LHR)', region: 'Europe', latency: '14ms', status: 'Optimal', load: '45%' },
    { name: 'Ashburn (IAD)', region: 'US-East', latency: '9ms', status: 'Optimal', load: '62%' },
    { name: 'San Jose (SJC)', region: 'US-West', latency: '16ms', status: 'Optimal', load: '51%' },
    { name: 'Tokyo (NRT)', region: 'APAC', latency: '19ms', status: 'Optimal', load: '40%' },
    { name: 'Singapore (SIN)', region: 'APAC', latency: '22ms', status: 'Optimal', load: '34%' },
    { name: 'São Paulo (GRU)', region: 'South America', latency: '28ms', status: 'Optimal', load: '29%' },
    { name: 'Sydney (SYD)', region: 'Oceania', latency: '24ms', status: 'Optimal', load: '31%' },
  ];

  return (
    <div className="page-scroll-area fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Edge Diagnostics & Mesh Health
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Live monitoring of Anycast routing, synthetic latency benchmarks, and edge worker health across 32 PoPs.
        </p>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="white-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Global Anycast Quorum
          </div>
          <div className="text-3xl font-extrabold text-slate-900">284 / 284</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">100% Operational • 0 degraded</div>
        </div>

        <div className="white-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Median Global RTT
          </div>
          <div className="text-3xl font-extrabold text-indigo-700">14.2ms</div>
          <div className="text-xs font-semibold text-slate-500 mt-1">SLA Target &lt; 25ms (Passing)</div>
        </div>

        <div className="white-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Edge AI Inference
          </div>
          <div className="text-3xl font-extrabold text-slate-900">@cf/meta/llama-3.1-8b</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">Workers AI Gateway Active</div>
        </div>
      </div>

      {/* PoP Latency Grid */}
      <div className="white-card overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Tier-1 Point-of-Presence Telemetry</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            All 32 PoPs Synced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-5">Edge Location</th>
                <th className="py-3 px-5">Region</th>
                <th className="py-3 px-5">Mesh Latency</th>
                <th className="py-3 px-5">BGP Status</th>
                <th className="py-3 px-5">Transit Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {edgePoPs.map((pop) => (
                <tr key={pop.name} className="hover:bg-slate-50">
                  <td className="py-3 px-5 font-bold text-slate-900">{pop.name}</td>
                  <td className="py-3 px-5 text-slate-600">{pop.region}</td>
                  <td className="py-3 px-5 font-mono font-semibold text-indigo-700">{pop.latency}</td>
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {pop.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-slate-700 font-medium">{pop.load}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
