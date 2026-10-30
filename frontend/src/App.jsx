import React, { useState } from 'react';
import { ActorProvider } from './context/ActorContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CatalogPage } from './pages/CatalogPage';
import { GuardianPage } from './pages/GuardianPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TaskStudioPage } from './pages/TaskStudioPage';
import { MockToolsPage } from './pages/MockToolsPage';
import { AuditLedgerPage } from './pages/AuditLedgerPage';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage setActivePage={setActivePage} />;
      case 'campaigns':
        return <CampaignsPage />;
      case 'catalog':
        return <CatalogPage />;
      case 'guardian':
        return <GuardianPage />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'studio':
        return <TaskStudioPage />;
      case 'tools':
        return <MockToolsPage />;
      case 'audit':
        return <AuditLedgerPage />;
      default:
        return <DashboardPage setActivePage={setActivePage} />;
    }
  };

  return (
    <ActorProvider>
      <Layout activePage={activePage} setActivePage={setActivePage}>
        {renderActivePage()}
      </Layout>
    </ActorProvider>
  );
}

