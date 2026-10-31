'use client';

import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Sun01Icon,
  Moon02Icon,
  ReloadIcon,
} from '@hugeicons/core-free-icons';
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
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns, scenarios, audit logs..."
            className="w-full bg-muted/40 border border-border/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Langfuse Observability Link */}
        <a
          href="https://cloud.langfuse.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Langfuse LLM Observability & Traces Console"
          className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-white bg-violet-950/60 border border-violet-500/40 hover:bg-violet-900/60 px-2.5 py-1.5 rounded-lg transition-all shadow-sm shadow-violet-950/40"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          <span className="font-mono text-[11px] font-semibold">Langfuse</span>
          <span className="text-[10px] text-violet-400">↗</span>
        </a>

        {/* Reset State Action */}
        <button
          onClick={handleReset}
          disabled={resetting}
          title="Reset simulated environment to initial seed state"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 border border-border/60 hover:bg-muted/60 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <HugeiconsIcon icon={ReloadIcon} size={14} className={resetting ? 'animate-spin text-violet-400' : ''} />
          <span className="hidden sm:inline">{resetMsg || 'Reset Mocks'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {theme === 'dark' ? (
            <HugeiconsIcon icon={Sun01Icon} size={16} className="text-amber-400" />
          ) : (
            <HugeiconsIcon icon={Moon02Icon} size={16} className="text-violet-400" />
          )}
        </button>

        {/* Clerk User Profile */}
        <div className="flex items-center pl-1">
          <UserButton />
        </div>
      </div>
    </header>
  );
}

