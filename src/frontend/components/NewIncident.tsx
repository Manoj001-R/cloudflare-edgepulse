import React, { useState } from 'react';

interface NewIncidentProps {
  onCreated: (incidentId: string) => void;
  onCancel: () => void;
}

export default function NewIncident({ onCreated, onCancel }: NewIncidentProps) {
  const [targetUrl, setTargetUrl] = useState('https://api.edgepulse.io/v1/health');
  const [description, setDescription] = useState(
    'e.g. Users in Western Europe are reporting 504 timeouts on POST /checkout, or page load times exceeding 3 seconds...'
  );
  const [severity, setSeverity] = useState<'auto' | 'low' | 'medium' | 'high' | 'critical'>('auto');
  const [strategy, setStrategy] = useState<'ai' | 'full'>('ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const presets = [
    {
      label: '⚡ Website is slow (TTFB)',
      text: 'Users in Western Europe are reporting severe page load degradation and slow TTFB exceeding 2.5 seconds on key landing routes.',
      url: 'https://example.com',
    },
    {
      label: '⏱ HTTP 502/504 errors',
      text: 'Origin gateway is throwing intermittent 502 Bad Gateway and 504 Gateway Timeout on checkout API requests under normal load.',
      url: 'https://api.example.com',
    },
    {
      label: '🗄 DNS not resolving',
      text: 'Authoritative DNS lookups are failing intermittently for regional resolvers in APAC and South America.',
      url: 'https://shop.example.com',
    },
    {
      label: '🔄 SSL/TLS cert error',
      text: 'Clients are reporting certificate validity warnings and TLS handshake negotiation timeouts during SSL connection establishment.',
      url: 'https://auth.globalcdn.net',
    },
    {
      label: '🛡 WAF false positive',
      text: 'WAF managed rules are triggering false-positive 403 Forbidden blocks on valid authenticated REST requests.',
      url: 'https://checkout.payments.io',
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    setDescription(preset.text);
    setTargetUrl(preset.url);
  };

  const handlePingCheck = () => {
    setPingStatus('Pinging 28 edge PoPs...');
    setTimeout(() => {
      setPingStatus('Reachable: 28/28 PoPs (14ms avg RTT, 0% packet loss)');
      setTimeout(() => setPingStatus(null), 3500);
    }, 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onCreated('INC-20260919-0001');
    }, 450);
  };

  const handleRunDemo = () => {
    setTargetUrl('https://example.com');
    setDescription(
      'Users in Western Europe are reporting 504 timeouts on POST /checkout, or page load times exceeding 3 seconds...'
    );
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onCreated('INC-20260919-0001');
    }, 400);
  };

  const handleReset = () => {
    setTargetUrl('');
    setDescription('');
    setSeverity('auto');
    setStrategy('ai');
  };

  return (
    <div className="page-scroll-area fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
          <span>Investigations</span>
          <span>/</span>
          <span className="text-indigo-600 font-semibold">New</span>
        </div>

        {/* Header Title & PoP Ready Status */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              New Investigation
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Enter an endpoint and describe the issue. EdgePulse will plan and dispatch automated diagnostics across edge nodes.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800 self-start sm:self-auto flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>32/32 Edge PoPs Ready</span>
          </div>
        </div>

        {/* Main Form Container Card */}
        <div className="white-card p-6 sm:p-8 mb-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target URL Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="target-url" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Target URL
                  </label>
                  <span className="text-xs text-slate-400 font-normal">Public endpoints only</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  🌐 HTTPS / HTTP
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <input
                  id="target-url"
                  type="text"
                  className="w-full pl-10 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="https://api.edgepulse.io/v1/health"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Valid Syntax
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>IPv4 / IPv6 reachable from 28 distributed POPs (14ms avg RTT)</span>
                </div>
                <button
                  type="button"
                  className="text-indigo-600 font-semibold hover:underline"
                  onClick={handlePingCheck}
                >
                  Ping check
                </button>
              </div>

              {pingStatus && (
                <div className="mt-2 p-2 px-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-mono rounded">
                  {pingStatus}
                </div>
              )}
            </div>

            {/* What is happening? Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="incident-desc" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  What is happening?
                </label>
                <span className="text-xs text-slate-400 font-normal">Markdown supported</span>
              </div>

              <textarea
                id="incident-desc"
                rows={4}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
                placeholder="e.g. Users in Western Europe are reporting 504 timeouts on POST /checkout, or page load times exceeding 3 seconds..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs font-semibold text-slate-500 mr-1">Presets:</span>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-all"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Investigation Settings Section */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Investigation Settings</h3>

              {/* Incident Severity Segmented Bar */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span>Incident Severity</span>
                </div>

                <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                  {(['auto', 'low', 'medium', 'high', 'critical'] as const).map((sev) => {
                    const isSelected = severity === sev;
                    const labels: Record<string, string> = {
                      auto: 'Auto-Detect',
                      low: 'Low',
                      medium: 'Medium',
                      high: 'High',
                      critical: 'Critical',
                    };
                    return (
                      <button
                        key={sev}
                        type="button"
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => setSeverity(sev)}
                      >
                        {labels[sev]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Two Strategy Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* AI-Guided Triage Card */}
                <div
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    strategy === 'ai'
                      ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setStrategy('ai')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        AI
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">AI-Guided Triage</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          Adaptive sequence • ~15s execution
                        </p>
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${strategy === 'ai' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                        {strategy === 'ai' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                    Dynamically sequences curl, DNS propagation, traceroute, and TLS certificate chain verification based on the issue description.
                  </p>
                </div>

                {/* Full Diagnostic Suite Card */}
                <div
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    strategy === 'full'
                      ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setStrategy('full')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Full Diagnostic Suite</h4>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          Exhaustive multi-PoP • ~60s
                        </p>
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${strategy === 'full' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                        {strategy === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                    Runs synchronous benchmark probes across all 32 global edge nodes simultaneously. Includes BGP routing table dump and cache purge tests.
                  </p>
                </div>
              </div>

              {/* Enterprise Safe Guard Box */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
                <div className="text-indigo-600 mt-0.5 flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-indigo-900 font-semibold">Enterprise Safe Guard:</strong> Outbound probing strictly prohibits private RFC 1918 subnets (<code className="px-1 py-0.5 bg-white border border-indigo-200 rounded text-[11px] text-slate-800">10.0.0.0/8</code>, <code className="px-1 py-0.5 bg-white border border-indigo-200 rounded text-[11px] text-slate-800">172.16.0.0/12</code>, <code className="px-1 py-0.5 bg-white border border-indigo-200 rounded text-[11px] text-slate-800">192.168.0.0/16</code>) and cloud instance metadata addresses (<code className="px-1 py-0.5 bg-white border border-indigo-200 rounded text-[11px] text-slate-800">169.254.169.254</code>).
                </p>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs"
                onClick={handleRunDemo}
              >
                <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Run Demo Incident (example.com)</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  onClick={handleReset}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-700 text-white rounded-lg text-xs font-bold hover:bg-indigo-800 shadow-sm transition-all"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Starting...' : 'Start Investigation'}</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Recent Targets Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Recent Targets</span>
            </div>
            <button type="button" className="text-xs text-indigo-600 font-semibold hover:underline">
              View audit logs
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div
              className="white-card p-4 hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => {
                setTargetUrl('https://api.production.io');
                setDescription('Probing origin endpoints and synthetic load metrics.');
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-900 font-mono">api.production.io</h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-500">Last checked 24m ago</span>
                <span className="font-bold text-emerald-600">99.98%</span>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="white-card p-4 hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => {
                setTargetUrl('https://status.corp.net');
                setDescription('Analyzing edge mesh latency across global Anycast ingress.');
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-900 font-mono">status.corp.net</h4>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-500">Last checked 2h ago</span>
                <span className="font-bold text-slate-700">21ms</span>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="white-card p-4 hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => {
                setTargetUrl('https://checkout.edgepulse.store');
                setDescription('Investigating 504 gateway timeout spike on checkout API.');
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-900 font-mono">checkout.edgepulse.store</h4>
                <span className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-500">Incidents logged: 3</span>
                <span className="font-bold text-red-600">Alert active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edge Diagnostic Orchestrator v2.4.1 Banner */}
        <div className="white-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Edge Diagnostic Orchestrator v2.4.1</h4>
              <p className="text-[11px] text-slate-500">
                Continuous health probing active across Frankfurt, Ashburn, Tokyo & São Paulo nodes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs flex-shrink-0">
            <div>
              <span className="text-slate-400 block text-[10px]">System Latency</span>
              <strong className="text-slate-900 font-bold">11.4ms</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Mesh Quorum</span>
              <strong className="text-emerald-600 font-bold">100% OK</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
