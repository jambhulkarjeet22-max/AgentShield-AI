import React, { useState, useEffect } from 'react';
import { Menu, KeyRound, CheckCircle, AlertTriangle, ShieldCheck, Database, RefreshCw, X, Shield } from 'lucide-react';
import { useActor } from '../../context/ActorContext';
import { fetchHealth } from '../../api/system';
import { Modal } from '../common/Modal';

export function Header({ onOpenSidebar, pageTitle }) {
  const { apiKey, actorLabel, updateApiKey, clearApiKey } = useActor();
  const [health, setHealth] = useState({ status: 'checking', app: '', version: '' });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    const res = await fetchHealth();
    if (res.ok && res.data) {
      setHealth({
        status: res.data.status || 'healthy',
        app: res.data.app || 'AgentShield-AI',
        version: res.data.version || '0.1.0',
        environment: res.data.environment || 'development',
      });
    } else {
      setHealth({ status: 'offline', error: res.error });
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveKey = (e) => {
    e.preventDefault();
    updateApiKey(inputKey);
    setIsKeyModalOpen(false);
  };

  const handleClearKey = () => {
    setInputKey('');
    clearApiKey();
    setIsKeyModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-navy-900/90 border-b border-slate-800 backdrop-blur px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Status Indicators & Actor Switcher */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Backend Status Probe */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs">
            {health.status === 'healthy' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300 font-medium">FastAPI: <span className="text-emerald-400">Online</span></span>
              </>
            ) : health.status === 'checking' ? (
              <>
                <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                <span className="text-slate-400">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-400 font-medium">FastAPI: Offline</span>
              </>
            )}
          </div>

          {/* Database Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300">PostgreSQL 18</span>
          </div>

          {/* Actor Identity Badge / Switcher */}
          <button
            onClick={() => {
              setInputKey(apiKey || '');
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition-all text-xs font-semibold"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate">{actorLabel}</span>
          </button>
        </div>
      </header>

      {/* Modal for Setting / Updating API Key */}
      <Modal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        title="Mock Actor Identity & API Key"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveKey} className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Requests pass this API key via the <code className="text-cyan-400 font-mono">X-API-Key</code> HTTP header.
            The backend validates the actor's permissions deterministically via Role-Based Access Control (RBAC).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Enter API Key
            </label>
            <input
              type="password"
              placeholder="e.g. mock-key-admin-secret-7701"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Available Mock Role Presets (From .env.example):</span>
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li>• Admin: <span className="text-slate-300">mock-key-admin-secret-7701</span> (All Permissions)</li>
              <li>• Analyst: <span className="text-slate-300">mock-key-analyst-secret-5502</span> (Campaigns & Audits)</li>
              <li>• Employee: <span className="text-slate-300">mock-key-employee-secret-3303</span> (Standard Tasks)</li>
              <li>• Guest: <span className="text-slate-300">mock-key-guest-secret-1104</span> (Read-Only Public)</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClearKey}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
            >
              Clear Key (Anonymous)
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition"
              >
                Apply Key
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

