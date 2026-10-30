import React, { useState } from 'react';
import { Sidebar, NAV_ITEMS } from './Sidebar';
import { Header } from './Header';

export function Layout({ activePage, setActivePage, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-navy-950 flex text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 min-h-screen">
        <Header
          onOpenSidebar={() => setIsSidebarOpen(true)}
          pageTitle={activeItem.label}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

