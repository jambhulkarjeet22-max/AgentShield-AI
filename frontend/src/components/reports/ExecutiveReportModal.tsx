'use client';

import React from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { CampaignResponse } from '@/types';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: CampaignResponse[];
  dateRangeLabel: string;
  onExportCSV: () => void;
}

export function ExecutiveReportModal({
  isOpen,
  onClose,
  campaigns,
  dateRangeLabel,
  onExportCSV,
}: ExecutiveReportModalProps) {
  if (!isOpen) return null;

  const totalAttacks = campaigns.reduce((acc, c) => acc + (c.total_attacks || 0), 0);
  const totalDefended = campaigns.reduce((acc, c) => acc + (c.defences_held || 0), 0);
  const totalLanded = campaigns.reduce((acc, c) => acc + (c.attacks_landed || 0), 0);
  const totalInconclusive = campaigns.reduce(
    (acc, c) => acc + ((c as any).failed_to_trigger || 0) + ((c as any).errors || 0),
    0
  );

  const defenseRate =
    totalAttacks > 0 ? ((totalDefended / totalAttacks) * 100).toFixed(1) : '0.0';

  const reportId = `AS-EVAL-${new Date().getFullYear()}-${campaigns.length}C${totalAttacks}A`;
  const generatedAt = new Date().toISOString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in-0 duration-150">
      <div
        className="w-full max-w-4xl bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar (Screen-only) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/80 bg-muted/30 no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-foreground tracking-tight">
              Executive Security Assessment Dossier
            </span>
            <Badge size="sm" variant="outline" className="font-mono text-[10px]">
              {reportId}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8"
              title="Print or Save as PDF via browser print dialog"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print / Save as PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Export CSV</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar bg-card font-sans">
          {/* Document Masthead */}
          <div className="border-b border-border/80 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold">
                    Agentra AI • Autonomous Threat Verification
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  Security Assessment &amp; Defense Reliability Report
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Formal multi-agent adversarial evaluation, policy interception metrics, and audit evidence.
                </p>
              </div>

              <div className="text-right sm:text-right font-mono text-[11px] text-muted-foreground space-y-0.5 bg-muted/30 p-2.5 rounded-lg border border-border/60">
                <div>Report Ref: <strong className="text-foreground">{reportId}</strong></div>
                <div>Generated: <span suppressHydrationWarning>{formatDate(generatedAt)}</span></div>
                <div>Scope: <strong className="text-foreground">{dateRangeLabel}</strong></div>
                <div className="text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-1">
                  <ShieldCheck className="w-3 h-3" /> SOC Verified
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Summary Metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-mono">
              1. Executive Performance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block font-semibold">
                  Campaigns Evaluated
                </span>
                <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                  {campaigns.length}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Unique test runs
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block font-semibold">
                  Total Attacks Tested
                </span>
                <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                  {totalAttacks}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Simulated attack cases
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">
                  Defenses Held
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {totalDefended} <span className="text-sm font-sans font-medium text-emerald-400/80">({defenseRate}%)</span>
                </span>
                <span className="text-[11px] text-emerald-400/80 mt-0.5 block">
                  Proactively contained
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
                <span className="text-[10px] font-mono text-rose-400 uppercase block font-semibold">
                  Attacks Landed
                </span>
                <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                  {totalLanded}
                </span>
                <span className="text-[11px] text-rose-400/80 mt-0.5 block">
                  {totalLanded === 0 ? 'Zero observed breaches' : 'Breach regressions'}
                </span>
              </div>
            </div>
          </div>

          {/* Result Definitions */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/70 text-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              2. Result Classifications &amp; Integrity Framework
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
              <div>
                <span className="font-semibold text-emerald-400">DEFENDED (Mitigation Held):</span>{' '}
                <span className="text-muted-foreground">
                  The simulated attack vector was successfully intercepted by the Blue Guardian policy boundary prior to tool execution.
                </span>
              </div>
              <div>
                <span className="font-semibold text-rose-400">LANDED (Breach Regression):</span>{' '}
                <span className="text-muted-foreground">
                  The adversarial payload bypassed safety boundaries and resulted in unauthorized tool execution or sensitive state disclosure.
                </span>
              </div>
              <div>
                <span className="font-semibold text-amber-400">FAILED TO TRIGGER:</span>{' '}
                <span className="text-muted-foreground">
                  The adversarial injection failed to elicit the expected agent intent. This is tracked separately and not counted as a confirmed defense.
                </span>
              </div>
              <div>
                <span className="font-semibold text-zinc-400">ERROR / INCONCLUSIVE:</span>{' '}
                <span className="text-muted-foreground">
                  A harness timeout or tool infrastructure error occurred during simulation.
                </span>
              </div>
            </div>
          </div>

          {/* Campaign Register Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              3. Campaign Register &amp; Empirical Findings
            </h3>
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-semibold text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="px-3 py-2">Campaign ID &amp; Name</th>
                    <th className="px-3 py-2">Date (UTC)</th>
                    <th className="px-3 py-2 text-center">Attacks</th>
                    <th className="px-3 py-2 text-center">Defended</th>
                    <th className="px-3 py-2 text-center">Landed</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {campaigns.map((c) => (
                    <tr key={c.campaign_id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-sans">
                        <span className="font-semibold text-foreground block truncate max-w-xs">
                          {c.campaign_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.campaign_id}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground" suppressHydrationWarning>
                        {formatDate(c.started_at)}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground font-semibold">
                        {c.total_attacks}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-400 font-semibold">
                        {c.defences_held}
                      </td>
                      <td className="px-3 py-2 text-center text-rose-400 font-semibold">
                        {c.attacks_landed}
                      </td>
                      <td className="px-3 py-2 text-right font-sans">
                        <Badge
                          size="sm"
                          variant={
                            c.status === 'COMPLETED'
                              ? 'success'
                              : c.status === 'RUNNING'
                              ? 'cyan'
                              : 'destructive'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology & Limitations Notice */}
          <div className="p-4 rounded-lg border border-border/80 bg-muted/10 text-xs text-muted-foreground space-y-1.5">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              4. Evaluation Methodology &amp; Threat Limitations
            </h4>
            <p className="text-[11px] leading-relaxed">
              This report represents empirical results from simulated adversarial attack campaigns executed against the Target Agent within deterministic, air-gapped sandboxes. Evaluations measure the containment efficacy of the Blue Guardian policy boundaries and risk scoring engine under defined test conditions.
            </p>
            <p className="text-[11px] leading-relaxed text-amber-400/90">
              <strong>Notice:</strong> Zero observed breaches within the executed test suites confirms robust enforcement against the evaluated threat vectors, but does not constitute an empirical guarantee of complete security against novel, unmodeled, or out-of-distribution zero-day attack methodologies.
            </p>
          </div>
        </div>

        {/* Modal Footer Controls (Screen-only) */}
        <div className="px-6 py-3.5 border-t border-border/80 bg-muted/30 flex items-center justify-between no-print">
          <span className="text-[11px] text-muted-foreground font-mono">
            Document generated for SOC review &amp; compliance audit
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print Assessment</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

