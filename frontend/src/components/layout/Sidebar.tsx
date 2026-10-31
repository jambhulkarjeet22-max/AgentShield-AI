'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Swords,
  Bot,
  FileCode2,
  PlayCircle,
  BrainCircuit,
  ScrollText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: Shield },
    { name: 'Cyber Arena', href: '/arena', icon: Swords, badge: '3D' },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Test Scenarios', href: '/scenarios', icon: FileCode2 },
    { name: 'Test Runs', href: '/test-runs', icon: PlayCircle },
    { name: 'Adaptive Learning', href: '/learning', icon: BrainCircuit },
    { name: 'Security Events', href: '/events', icon: ScrollText },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-md transition-all duration-300 z-30 select-none',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/80">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground">
                AgentShield
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Defense Battlefield
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors hidden md:flex"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-blue-400' : 'text-muted-foreground'
                )}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actor Pill */}
      {!collapsed && (
        <div className="p-3 border-t border-border/80">
          <div className="p-2.5 rounded-lg bg-black/30 border border-border/60 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                Mock Environment
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] truncate">
              Air-gapped & Sandbox Isolated
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

