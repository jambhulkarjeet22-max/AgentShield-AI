'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Sun01Icon,
  Moon02Icon,
} from '@hugeicons/core-free-icons';
import { useTheme } from '@/context/ThemeContext';
import { UserButton } from '@clerk/nextjs';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-white/[0.06] bg-card/40 backdrop-blur-md px-6 flex items-center justify-end sticky top-0 z-20">
      {/* Right Controls */}
      <div className="flex items-center gap-3">
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

