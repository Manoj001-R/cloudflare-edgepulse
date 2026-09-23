import React, { useState, useCallback } from 'react';
import Sidebar, { NavTab } from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import NewIncident from './components/NewIncident';
import IncidentDetails from './components/IncidentDetails';
import IncidentsList from './components/IncidentsList';
import DiagnosticsView from './components/DiagnosticsView';
import SettingsView from './components/SettingsView';

type AppTab = NavTab | 'details';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('new');
  const [activeIncidentId, setActiveIncidentId] = useState<string>('INC-20260919-0001');
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = useCallback((tab: NavTab) => {
    setCurrentTab(tab);
  }, []);

  const handleNewInvestigation = useCallback(() => {
    setCurrentTab('new');
  }, []);

  const handleSelectIncident = useCallback((id: string) => {
    setActiveIncidentId(id);
    setCurrentTab('details');
  }, []);

  const handleIncidentCreated = useCallback((id: string) => {
    setActiveIncidentId(id);
    setCurrentTab('details');
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNewInvestigation={handleNewInvestigation}
            onSelectIncident={handleSelectIncident}
          />
        );
      case 'new':
        return (
          <NewIncident
            onCreated={handleIncidentCreated}
            onCancel={() => setCurrentTab('dashboard')}
          />
        );
      case 'details':
        return (
          <IncidentDetails
            incidentId={activeIncidentId}
            onBack={() => setCurrentTab('dashboard')}
          />
        );
      case 'incidents':
        return (
          <IncidentsList
            onSelectIncident={handleSelectIncident}
            onNewInvestigation={handleNewInvestigation}
          />
        );
      case 'diagnostics':
        return <DiagnosticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <Dashboard
            onNewInvestigation={handleNewInvestigation}
            onSelectIncident={handleSelectIncident}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar with EdgePulse Logo from images/image.png */}
      <Sidebar
        currentTab={currentTab === 'details' ? 'new' : currentTab}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          onNewInvestigation={handleNewInvestigation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        {renderContent()}
      </div>
    </div>
  );
}
