'use client';

import React, { useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { resetMockEnvironment } from '@/services/tool-service';
import { UserButton } from '@clerk/nextjs';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleReset = async () => {
    setResetting(true);
    const res = await resetMockEnvironment();
    setResetting(false);
    if (res.ok) {
      setResetMsg('Environment Reset');
      setTimeout(() => setResetMsg(null), 2500);
      window.location.reload();
    }
  };

  return (
    <header className="h-16 border-b border-border/80 bg-card/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-72 md:w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns, scenarios, audit logs..."
            className="w-full bg-muted/40 border border-border/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Reset State Action */}
        <button
          onClick={handleReset}
          disabled={resetting}
          title="Reset simulated environment to initial seed state"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 border border-border/60 hover:bg-muted/60 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-blue-400' : ''}`} />
          <span className="hidden sm:inline">{resetMsg || 'Reset Mocks'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        {/* Clerk User Profile */}
        <div className="flex items-center pl-1">
          <UserButton />
        </div>
      </div>
    </header>
  );
}

