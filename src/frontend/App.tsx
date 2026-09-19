import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import NewIncident from './components/NewIncident';
import IncidentChat from './components/IncidentChat';
import IncidentHistory from './components/IncidentHistory';
import IncidentDetails from './components/IncidentDetails';
import EvidencePanel from './components/EvidencePanel';

type View = 'dashboard' | 'new' | 'investigation' | 'details';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNewIncident = useCallback(() => {
    setCurrentView('new');
    setActiveIncidentId(null);
  }, []);

  const handleIncidentCreated = useCallback((incidentId: string) => {
    setActiveIncidentId(incidentId);
    setCurrentView('investigation');
  }, []);

  const handleSelectIncident = useCallback((incidentId: string) => {
    setActiveIncidentId(incidentId);
    setCurrentView('details');
  }, []);

  const handleViewInvestigation = useCallback((incidentId: string) => {
    setActiveIncidentId(incidentId);
    setCurrentView('investigation');
  }, []);

  const handleGoHome = useCallback(() => {
    setCurrentView('dashboard');
    setActiveIncidentId(null);
  }, []);

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNewIncident={handleNewIncident} onSelectIncident={handleSelectIncident} />;
      case 'new':
        return <NewIncident onCreated={handleIncidentCreated} onCancel={handleGoHome} />;
      case 'investigation':
        return activeIncidentId ? (
          <IncidentChat
            incidentId={activeIncidentId}
            onBack={handleGoHome}
          />
        ) : null;
      case 'details':
        return activeIncidentId ? (
          <IncidentDetails
            incidentId={activeIncidentId}
            onBack={handleGoHome}
            onReplay={handleViewInvestigation}
          />
        ) : null;
      default:
        return <Dashboard onNewIncident={handleNewIncident} onSelectIncident={handleSelectIncident} />;
    }
  };

  return (
    <div className="app-layout">
      <Header onHome={handleGoHome} onNewIncident={handleNewIncident} />
      <div className="main-content">
        {/* Left Sidebar — Incident History */}
        <aside
          className="hidden lg:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden"
          style={{ display: sidebarOpen ? undefined : 'none' }}
        >
          <IncidentHistory
            onSelect={handleSelectIncident}
            activeId={activeIncidentId}
          />
        </aside>

        {/* Center — Main Content */}
        <main className="flex flex-col overflow-hidden">
          {renderMainContent()}
        </main>

        {/* Right Panel — Evidence (shown during investigation/details) */}
        <aside className="hidden lg:flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          {activeIncidentId && (currentView === 'investigation' || currentView === 'details') ? (
            <EvidencePanel incidentId={activeIncidentId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-4xl mb-4 opacity-30">🔍</div>
              <p className="text-[var(--color-text-dim)] text-sm">
                Evidence panel will appear here during an investigation
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
