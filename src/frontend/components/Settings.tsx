import React from 'react';

export default function Settings() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 className="text-xl font-bold mb-6">Settings</h2>

      <div className="glass-card p-6 max-w-xl">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
          Application Info
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">Application</span>
            <span>EdgePulse</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">Version</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">AI Model</span>
            <span className="font-mono text-xs">@cf/meta/llama-3.3-70b-instruct-fp8-fast</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">Runtime</span>
            <span>Cloudflare Workers</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">Storage</span>
            <span>Durable Objects + SQLite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">Orchestration</span>
            <span>Cloudflare Workflows</span>
          </div>
        </div>
      </div>
    </div>
  );
}
