'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, XCircle, AlertCircle, Bot, Shield, Swords } from 'lucide-react';

export interface LiveEventItem {
  id: string;
  type: string;
  title: string;
  category?: string;
  status: 'BLOCKED' | 'BREACHED' | 'ALLOWED' | 'PENDING';
  timestamp: string;
  payload?: string;
  mechanism?: string;
  details?: any;
}

interface ArenaLiveEventsProps {
  events: LiveEventItem[];
  selectedEventId?: string;
  onSelectEvent: (event: LiveEventItem) => void;
  simulationState: 'IDLE' | 'ATTACKING' | 'DEFENDING' | 'BLOCKED' | 'BREACHED';
}

export function ArenaLiveEvents({
  events,
  selectedEventId,
  onSelectEvent,
  simulationState,
}: ArenaLiveEventsProps) {
  return (
    <div className="flex flex-col h-full rounded-xl border border-border/80 bg-card/60 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
          <h3 className="text-xs font-bold font-mono tracking-wider text-foreground uppercase">
            LIVE EVENTS
          </h3>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {events.length > 0 ? `${events.length} recorded` : '0s ago'}
        </span>
      </div>

      {/* Events Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[440px] scrollbar-thin">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
            <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/60 border border-border">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/80">Awaiting Scenario Dispatch</p>
              <p className="text-[11px] text-muted-foreground/60 max-w-[200px] mt-0.5">
                Launch a test run to stream live multi-agent defense telemetry.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-rose-500 before:via-sky-500 before:to-emerald-500">
            {events.slice(0, 10).map((evt, idx) => {
              const isSelected = selectedEventId === evt.id;
              const isBlocked = evt.status === 'BLOCKED';

              return (
                <div
                  key={evt.id || idx}
                  onClick={() => onSelectEvent(evt)}
                  className={`group relative cursor-pointer rounded-lg p-2.5 transition-all duration-150 border ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-muted/30'
                  }`}
                >
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-[27px] top-3.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-transform group-hover:scale-125 ${
                      isBlocked
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                    }`}
                  />

                  {/* Stage 1: Red Team Attack */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <Swords className="w-3 h-3" /> Red Team
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {evt.details?.attack_id || 'ATTACK'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground/90 truncate">
                      {evt.title}
                    </p>
                  </div>

                  {/* Stage 2: Blue Team & Verdict */}
                  <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-sky-400 font-medium">
                      <Bot className="w-3 h-3" /> Target AI
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        isBlocked
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" /> BLOCKED
                        </>
                      ) : (
                        <>
                          <XCircle className="w-2.5 h-2.5" /> BREACHED
                        </>
                      )}
                    </span>
                  </div>

                  {/* Brief Reason */}
                  {evt.mechanism && (
                    <p className="text-[10px] text-muted-foreground/75 truncate mt-1">
                      {evt.mechanism}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="p-3 border-t border-border/60 bg-muted/10 text-right">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All Events <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

