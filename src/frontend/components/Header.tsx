import React from 'react';
import avatarImg from '../assets/avatar.svg';

interface HeaderProps {
  onNewInvestigation: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function Header({
  onNewInvestigation,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  return (
    <header className="topbar">
      {/* Search Input Box */}
      <div className="topbar-search-box">
        <span className="search-icon-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search incidents, domains..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="search-shortcut-badge">⌘K</span>
      </div>

      {/* Right Actions */}
      <div className="topbar-actions">
        {/* Global Mesh Latency */}
        <div className="mesh-status-badge">
          <span className="mesh-dot" />
          <span>Global Mesh: <strong>14ms</strong></span>
        </div>

        {/* Notifications Icon */}
        <button type="button" className="topbar-icon-btn" title="Notifications" aria-label="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* New Investigation CTA Button */}
        <button
          type="button"
          className="btn-new-investigation-primary"
          onClick={onNewInvestigation}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Investigation</span>
        </button>

        {/* User avatar on top right */}
        <img
          src={avatarImg}
          alt="Manoj K."
          className="user-avatar-img"
          style={{ width: '32px', height: '32px', cursor: 'pointer' }}
        />
      </div>
    </header>
  );
}
