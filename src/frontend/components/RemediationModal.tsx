import React, { useState, useEffect } from 'react';

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
}

export default function RemediationModal({ isOpen, onClose, incidentId }: RemediationModalProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'worker' | 'terraform' | 'nginx'>('worker');

  if (!isOpen) return null;

  const workerCode = `/**
 * EdgePulse Auto-Remediation Rule: Emergency Origin Shield
 * Incident: ${incidentId}
 * Target: https://example.com
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Bypass cache for mutation endpoints
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    // 120s Temporary Edge Cache Shield to alleviate origin DB contention
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      response = await fetch(request, {
        cf: {
          cacheTtl: 120,
          cacheEverything: true,
          polish: 'lossy',
          mirage: true,
        },
      });

      // Clone response & write to Cloudflare Edge Cache
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=120');
      response.headers.set('X-EdgePulse-Remediation', 'active');
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};`;

  const terraformCode = `# Cloudflare Edge Cache Override for ${incidentId}
resource "cloudflare_page_rule" "origin_shield" {
  zone_id = var.cloudflare_zone_id
  target  = "example.com/*"
  priority = 1

  actions {
    cache_level         = "cache_everything"
    edge_cache_ttl      = 120
    browser_cache_ttl   = 120
    origin_cache_control = "off"
    always_online       = "on"
  }
}`;

  const nginxCode = `# Nginx Upstream Connection Pool Fix for ${incidentId}
upstream origin_backend {
    server 93.184.216.34:443;
    keepalive 64;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass https://origin_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
}`;

  const currentSnippet = tab === 'worker' ? workerCode : tab === 'terraform' ? terraformCode : nginxCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Automated Remediation Script
              </h3>
              <p className="text-xs text-slate-500">
                Generated playbook for <span className="font-mono text-indigo-600 font-semibold">{incidentId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setTab('worker')}
            className={`pb-2.5 border-b-2 transition-all ${
              tab === 'worker'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Cloudflare Worker
          </button>
          <button
            onClick={() => setTab('terraform')}
            className={`pb-2.5 border-b-2 transition-all ${
              tab === 'terraform'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Terraform Rule
          </button>
          <button
            onClick={() => setTab('nginx')}
            className={`pb-2.5 border-b-2 transition-all ${
              tab === 'nginx'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Nginx Config
          </button>
        </div>

        {/* Code Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-200">
          <pre className="whitespace-pre-wrap leading-relaxed">
            <code>{currentSnippet}</code>
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Deploy via Wrangler or Cloudflare Dashboard
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-700 text-white rounded-lg text-xs font-bold hover:bg-indigo-800 shadow-sm transition-all flex items-center gap-1.5"
            >
              {copied ? '✓ Copied to Clipboard' : '📋 Copy Script'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
