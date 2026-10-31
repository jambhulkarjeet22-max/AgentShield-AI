'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api as convexApi } from '@convex/_generated/api';
import {
  ScrollText,
  Search,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Info,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JSONViewer } from '@/components/ui/JSONViewer';
import { listAuditLogs } from '@/services/event-service';
import { exportToCSV } from '@/services/report-service';
import { AuditLogEntry } from '@/types';
import { formatDate } from '@/lib/utils';

export default function SecurityEventsPage() {
  const [restLogs, setRestLogs] = useState<AuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [restLoading, setRestLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convex Real-Time Reactive Subscription for Audit Log Stream
  const liveLogs = useQuery(convexApi.events.list, { limit: 100 });
  const isConvexLive = liveLogs !== undefined;

  // Seamlessly prioritize real-time Convex stream with REST fallback
  // Normalize both stream formats to guarantee event_id, actor_id, action, resource, etc.
  const rawLogs = liveLogs && liveLogs.length > 0 ? liveLogs : restLogs;
  const logs: AuditLogEntry[] = (rawLogs || []).map((l: any, idx: number) => {
    const event_id =
      l.event_id || l.id || l._id || `evt-${idx}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      event_id,
      timestamp: l.timestamp || new Date().toISOString(),
      actor_id: l.actor_id || l.actor || 'system',
      role: l.role || 'service',
      tool: l.tool || 'system',
      action: l.action || 'operation',
      resource: l.resource || '',
      status: l.status || 'ALLOWED',
      details: l.details || l,
    };
  });

  const loading = isConvexLive ? false : restLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toolFilter, setToolFilter] = useState('ALL');

  const loadLogs = async () => {
    setRestLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({ limit: 100 });
      if (res.data && res.data.logs) {
        setRestLogs(res.data.logs);
      } else {
        setError(res.error || 'Failed to load audit events');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching audit logs');
    } finally {
      setRestLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (logs.length > 0 && !hasInitializedSelection) {
      setSelectedLog(logs[0]);
      setHasInitializedSelection(true);
    }
  }, [logs, hasInitializedSelection]);

  const filtered = logs.filter((log) => {
    const term = (searchTerm || '').trim().toLowerCase();
    const eventId = String(log?.event_id || '').toLowerCase();
    const actorId = String(log?.actor_id || '').toLowerCase();
    const action = String(log?.action || '').toLowerCase();
    const resource = String(log?.resource || '').toLowerCase();
    const tool = String(log?.tool || '').toLowerCase();

    const matchesSearch =
      !term ||
      eventId.includes(term) ||
      actorId.includes(term) ||
      action.includes(term) ||
      resource.includes(term) ||
      tool.includes(term);

    const matchesStatus = statusFilter === 'ALL' || log?.status === statusFilter;
    const matchesTool = toolFilter === 'ALL' || log?.tool === toolFilter;
    return matchesSearch && matchesStatus && matchesTool;
  });

  const handleExport = () => {
    exportToCSV('agentshield-security-events', filtered);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            SECURITY EVENTS &amp; AUDIT LEDGER
            <Badge variant="outline" size="sm" className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isConvexLive ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{logs.length} Events {isConvexLive ? '(Live Stream)' : ''}</span>
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable structured telemetry capturing every simulated tool action, policy evaluation, and intercept.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Logs (CSV)</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/80 bg-card/60">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by event ID, actor, action, or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/40 border border-border/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          className="h-9 bg-muted/40 border border-border/70 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Subsystems / Tools</option>
          <option value="target_agent">target_agent</option>
          <option value="blue_guardian">blue_guardian</option>
          <option value="email">email</option>
          <option value="filesystem">filesystem</option>
          <option value="browser">browser</option>
          <option value="payments">payments</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 bg-muted/40 border border-border/70 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Decisions</option>
          <option value="ALLOWED">ALLOWED</option>
          <option value="DENIED">DENIED</option>
          <option value="FAILED">FAILED</option>
          <option value="WARNING">WARNING</option>
        </select>
      </div>

      {/* Grid: Events Table + Selected Event Panel */}
      <div
        className={`grid grid-cols-1 ${
          selectedLog ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
        } gap-6 items-start`}
      >
        {/* Table (7 cols when details open, 12 cols when details closed) */}
        <div className={selectedLog ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Card className="bg-card/70 border-border/80 overflow-hidden flex flex-col shadow-lg">
            {/* Scrollable Container with Sticky Table Header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar border-b border-border/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/80 text-muted-foreground uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-3 bg-card/95">Time</th>
                    <th className="px-4 py-3 bg-card/95">Actor</th>
                    <th className="px-4 py-3 bg-card/95">Tool</th>
                    <th className="px-4 py-3 bg-card/95">Action</th>
                    <th className="px-4 py-3 bg-card/95">Status</th>
                    <th className="px-4 py-3 text-right bg-card/95">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filtered.length > 0 ? (
                    filtered.map((log) => {
                      const isSelected = selectedLog?.event_id === log.event_id;
                      return (
                        <tr
                          key={log.event_id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="px-4 py-3 text-muted-foreground text-[11px]" suppressHydrationWarning>
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {log.actor_id}
                          </td>
                          <td className="px-4 py-3 text-violet-400">{log.tool}</td>
                          <td className="px-4 py-3 text-foreground truncate max-w-[120px]">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <Badge
                              size="sm"
                              variant={
                                log.status === 'ALLOWED'
                                  ? 'success'
                                  : log.status === 'DENIED'
                                  ? 'destructive'
                                  : 'warning'
                              }
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-sans text-xs">
                        No audit events match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary Stats */}
            <div className="px-4 py-2.5 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>Showing {filtered.length} of {logs.length} recorded events</span>
              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Scrollable Ledger Active
              </span>
            </div>
          </Card>
        </div>

        {/* Selected Event Details (5 cols) */}
        {selectedLog && (
          <div className="lg:col-span-5 animate-in fade-in-0 duration-150">
            <Card className="bg-card/75 border-border/80 sticky top-20 shadow-lg">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                    Event ID: {selectedLog.event_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      variant={
                        selectedLog.status === 'ALLOWED'
                          ? 'success'
                          : selectedLog.status === 'DENIED'
                          ? 'destructive'
                          : 'warning'
                      }
                    >
                      {selectedLog.status}
                    </Badge>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/50 transition-colors"
                      title="Close details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {selectedLog.tool} &bull; {selectedLog.action}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Actor Identity:
                    </span>
                    <span className="font-mono text-foreground font-semibold mt-1 block">
                      {selectedLog.actor_id} ({selectedLog.role})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Timestamp:
                    </span>
                    <span className="font-mono text-foreground text-[11px] mt-1 block">
                      {formatDate(selectedLog.timestamp)}
                    </span>
                  </div>
                </div>

                {selectedLog.resource && (
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Resource Target:
                    </span>
                    <p className="text-xs font-mono text-foreground p-2.5 rounded-lg bg-black/40 border border-border/70 truncate">
                      {selectedLog.resource}
                    </p>
                  </div>
                )}

                <div className="min-w-0">
                  <JSONViewer
                    title="Full Audit Metadata"
                    data={selectedLog.details || selectedLog}
                    maxHeight="max-h-[240px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

