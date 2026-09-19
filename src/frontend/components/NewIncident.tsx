import React, { useState } from 'react';
import { createIncident } from '../lib/api';

interface NewIncidentProps {
  onCreated: (incidentId: string) => void;
  onCancel: () => void;
}

const EXAMPLE_INCIDENTS = [
  {
    label: '🐌 Website is slow',
    url: 'https://example.com',
    question: 'Users are reporting that the website is very slow and pages take a long time to load.',
  },
  {
    label: '💥 5xx errors',
    url: 'https://example.com',
    question: 'The website is returning 500 and 503 errors intermittently. Some users cannot access the site.',
  },
  {
    label: '🌐 DNS broken',
    url: 'https://example.com',
    question: 'DNS resolution appears to be failing. Users report that the domain cannot be found.',
  },
  {
    label: '🔒 SSL/TLS issue',
    url: 'https://example.com',
    question: 'Users are seeing SSL certificate warnings when trying to access the website.',
  },
  {
    label: '🛡️ Security headers',
    url: 'https://example.com',
    question: 'We need to audit our security headers. Some headers may be missing or misconfigured.',
  },
];

export default function NewIncident({ onCreated, onCancel }: NewIncidentProps) {
  const [targetUrl, setTargetUrl] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl || !userQuestion) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createIncident({
        targetUrl,
        userQuestion,
        demoMode,
      });
      onCreated(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  }

  function handleExample(example: (typeof EXAMPLE_INCIDENTS)[0]) {
    setTargetUrl(example.url);
    setUserQuestion(example.question);
  }

  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center p-6 pt-12" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4c6ef5] to-[#748ffc] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">New Investigation</h2>
          <p className="text-[var(--color-text-muted)] text-sm">
            Enter a URL and describe the problem. EdgePulse AI will investigate.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6">
          <div className="mb-5">
            <label htmlFor="target-url" className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Target URL
            </label>
            <input
              id="target-url"
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="input-field font-mono"
              required
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label htmlFor="problem-desc" className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Problem Description
            </label>
            <textarea
              id="problem-desc"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Describe the issue you're experiencing..."
              className="input-field"
              rows={4}
              required
              minLength={5}
            />
          </div>

          <div className="flex items-center gap-3 mb-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] accent-[var(--color-accent)]"
              />
              Demo Mode
              <span className="text-xs text-[var(--color-text-dim)]">(uses simulated data)</span>
            </label>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !targetUrl || !userQuestion}
              className="btn-primary flex-1 justify-center"
              id="start-investigation-btn"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Starting Investigation…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Start Investigation
                </>
              )}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>

        {/* Example Buttons */}
        <div>
          <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-medium mb-3">
            Quick Examples
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_INCIDENTS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleExample(ex)}
                className="btn-secondary text-xs"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
