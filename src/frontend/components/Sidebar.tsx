import React from 'react';
import logoImg from '../assets/logo.png';
import avatarImg from '../assets/avatar.svg';

export type NavTab = 'dashboard' | 'new' | 'incidents' | 'diagnostics' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export default function Sidebar({ currentTab, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Brand Logo & Name */}
        <button 
          className="sidebar-brand"
          onClick={() => onNavigate('dashboard')}
          type="button"
        >
          <img src={logoImg} alt="EdgePulse Logo" className="sidebar-logo-img" />
          <div className="sidebar-brand-text">
            <h1>EdgePulse</h1>
            <span>SRE Platform</span>
          </div>
        </button>

        {/* Navigation items */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-link ${currentTab === 'new' ? 'active' : ''}`}
            onClick={() => onNavigate('new')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span>
            <span>New Investigation</span>
          </button>

          <button
            type="button"
            className={`nav-link ${currentTab === 'incidents' ? 'active' : ''}`}
            onClick={() => onNavigate('incidents')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span>Incidents</span>
          </button>

          <button
            type="button"
            className={`nav-link ${currentTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => onNavigate('diagnostics')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            <span>Diagnostics</span>
          </button>

          <button
            type="button"
            className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        {/* System Status Pill */}
        <div className="system-status-pill">
          <div className="flex items-center">
            <span className="status-indicator-dot" />
            <span>All Systems Operational</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>

        {/* User Card */}
        <div className="user-profile-widget">
          <div className="user-profile-left">
            <img src={avatarImg} alt="Manoj K." className="user-avatar-img" />
            <div>
              <div className="user-info-name">Manoj K.</div>
              <div className="user-info-role">Staff SRE</div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 15 12 20 17 15" />
            <polyline points="7 9 12 4 17 9" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
