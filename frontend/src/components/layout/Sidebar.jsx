import React from 'react';
import {
  ShieldAlert,
  Swords,
  BookOpen,
  ShieldCheck,
  UserCheck,
  Bot,
  Terminal,
  FileText,
  Activity,
  X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Security Posture', icon: Activity, pageNumber: 1 },
  { id: 'campaigns', label: 'Red Team Campaigns', icon: Swords, pageNumber: 2 },
  { id: 'catalog', label: 'Attack Catalog', icon: BookOpen, pageNumber: 3 },
  { id: 'guardian', label: 'Blue Team Guardian', icon: ShieldCheck, pageNumber: 4 },
  { id: 'approvals', label: 'Human Approvals', icon: UserCheck, pageNumber: 5 },
  { id: 'studio', label: 'Target Agent Studio', icon: Bot, pageNumber: 6 },
  { id: 'tools', label: 'Mock Infrastructure', icon: Terminal, pageNumber: 7 },
  { id: 'audit', label: 'Security Audit Ledger', icon: FileText, pageNumber: 8 },
];

export function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-navy-900 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">AgentShield</span>
              <span className="text-blue-500 font-bold ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">AI</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Operations & Defence
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'text-slate-400 bg-slate-850'
                  }`}
                >
                  P{item.pageNumber}
                </span>
              </button>
            );
          })}
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-slate-800 bg-navy-950/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI + Postgres
            </span>
            <span className="font-mono text-slate-400 text-[11px]">v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

