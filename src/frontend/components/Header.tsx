import React from 'react';

interface HeaderProps {
  onHome: () => void;
  onNewIncident: () => void;
}

export default function Header({ onHome, onNewIncident }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <button
        onClick={onHome}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        aria-label="Go to dashboard"
      >
        {/* Logo */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4c6ef5] to-[#748ffc] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gradient">EdgePulse</h1>
          <p className="text-[0.65rem] text-[var(--color-text-dim)] -mt-1 tracking-wide uppercase">
            AI Internet Incident Investigator
          </p>
        </div>
      </button>

      <div className="flex items-center gap-3">
        <button onClick={onNewIncident} className="btn-primary" id="new-incident-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Investigation
        </button>
      </div>
    </header>
  );
}
