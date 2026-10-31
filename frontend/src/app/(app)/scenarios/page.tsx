'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCode2,
  Search,
  Filter,
  Play,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { fetchAttackCatalog } from '@/services/scenario-service';
import { AttackCatalogEntry } from '@/types';

export default function ScenariosPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<AttackCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedScenario, setSelectedScenario] = useState<AttackCatalogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAttackCatalog();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.attacks || [];
      if (res.ok && list.length > 0) {
        setCatalog(list);
        setSelectedScenario(list[0]);
      } else if (res.ok) {
        setCatalog([]);
      } else {
        setError(res.error || 'Failed to load catalog');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching scenario catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Filtered scenarios
  const filtered = catalog.filter((sc) => {
    const matchesSearch =
      sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sc.attack_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' || sc.category === selectedCategory;
    const matchesSev =
      selectedSeverity === 'ALL' || sc.severity === selectedSeverity;
    return matchesSearch && matchesCat && matchesSev;
  });

  const handleCopyPayload = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunInArena = (scenarioId: string) => {
    router.push(`/arena?scenario=${scenarioId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            TEST SCENARIOS
            <Badge variant="outline" size="sm">
              {catalog.length} Scenarios Cataloged
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Standardized adversarial scenarios covering Prompt Injection, Privilege Escalation, Fraud, and Abuse.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCatalog}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Reload Catalog</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/80 bg-card/60">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search scenario name, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/40 border border-border/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-9 bg-muted/40 border border-border/70 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Categories</option>
          <option value="prompt_injection_email">Prompt Injection (Email)</option>
          <option value="prompt_injection_web">Prompt Injection (Web)</option>
          <option value="privilege_escalation">Privilege Escalation</option>
          <option value="payment_fraud">Payment Fraud</option>
          <option value="tool_abuse">Tool Abuse</option>
          <option value="loop_exhaustion">Loop Exhaustion</option>
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="h-9 bg-muted/40 border border-border/70 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Main Layout: Scenarios Table + Selected Scenario Drawer */}
      <div
        className={`grid grid-cols-1 ${
          selectedScenario ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
        } gap-6 items-start`}
      >
        {/* Scenarios Table (7 cols when details open, 12 cols when details closed) */}
        <div className={selectedScenario ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Card className="bg-card/70 border-border/80 overflow-hidden flex flex-col shadow-lg">
            {/* Scrollable Container with Sticky Table Header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar border-b border-border/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/80 text-muted-foreground uppercase text-[10px] font-semibold shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-card/95">ID / Name</th>
                    <th className="px-4 py-3 bg-card/95">Severity</th>
                    <th className="px-4 py-3 bg-card/95">Target Tool</th>
                    <th className="px-4 py-3 bg-card/95">Status</th>
                    <th className="px-4 py-3 text-right bg-card/95">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filtered.length > 0 ? (
                    filtered.map((sc) => {
                      const isSelected = selectedScenario?.attack_id === sc.attack_id;
                      return (
                        <tr
                          key={sc.attack_id}
                          onClick={() => setSelectedScenario(sc)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-600/15' : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-foreground font-sans block">
                              {sc.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {sc.attack_id} • {sc.category_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <Badge
                              size="sm"
                              variant={
                                sc.severity === 'CRITICAL'
                                  ? 'destructive'
                                  : sc.severity === 'HIGH'
                                  ? 'warning'
                                  : 'cyan'
                              }
                            >
                              {sc.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-cyan-400 capitalize">
                            {sc.target_tool}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScenario(sc);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-sans text-xs">
                        No scenarios matched the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary Stats */}
            <div className="px-4 py-2.5 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>Showing {filtered.length} of {catalog.length} attack scenarios</span>
              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Scrollable Catalog Active
              </span>
            </div>
          </Card>
        </div>

        {/* Selected Scenario Details (5 cols) */}
        {selectedScenario && (
          <div className="lg:col-span-5 animate-in fade-in-0 duration-150">
            <Card className="bg-card/75 border-border/80 sticky top-20 shadow-lg">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                    {selectedScenario.attack_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      variant={
                        selectedScenario.severity === 'CRITICAL'
                          ? 'destructive'
                          : selectedScenario.severity === 'HIGH'
                          ? 'warning'
                          : 'cyan'
                      }
                    >
                      {selectedScenario.severity} Severity
                    </Badge>
                    <button
                      onClick={() => setSelectedScenario(null)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/50 transition-colors"
                      title="Close details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {selectedScenario.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Scenario Description:
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {selectedScenario.description}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Targeted Tool Environment:
                  </span>
                  <Badge variant="outline" size="sm" className="capitalize">
                    {selectedScenario.target_tool}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Adversarial Payload:
                    </span>
                    <button
                      onClick={() => handleCopyPayload(selectedScenario.default_payload)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-black/40 border border-border/70 text-xs font-mono text-rose-400 overflow-y-auto max-h-[160px] whitespace-pre-wrap leading-relaxed custom-scrollbar">
                    {selectedScenario.default_payload}
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/70 text-xs">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Expected Defense Control:
                  </span>
                  <p className="text-foreground leading-relaxed">
                    {selectedScenario.expected_control}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    onClick={() => handleRunInArena(selectedScenario.attack_id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    <span>Run Scenario in Arena</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

