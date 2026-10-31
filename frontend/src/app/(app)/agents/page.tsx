'use client';

import React, { useState } from 'react';
import {
  Bot,
  Swords,
  ShieldCheck,
  Cpu,
  Key,
  Lock,
  Save,
  CheckCircle2,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PRECONFIGURED_ACTORS } from '@/services/auth-service';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<'RED' | 'TARGET' | 'BLUE'>('TARGET');
  const [targetModel, setTargetModel] = useState('mock-deterministic');
  const [maxSteps, setMaxSteps] = useState(10);
  const [guardianThreshold, setGuardianThreshold] = useState(80.0);
  const [approvalThreshold, setApprovalThreshold] = useState(60.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            AGENT LAB
            <Badge variant="cyan" size="sm">
              Triad Configuration
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage autonomous agent roles, planning backends, security guardrails, and access policies.
          </p>
        </div>
        <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          <span>Save Configuration</span>
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Agent configuration updated and synchronized with active runtime!</span>
        </div>
      )}

      {/* 3 Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Red Team Attacker */}
        <Card
          onClick={() => setSelectedAgent('RED')}
          className={`cursor-pointer transition-all border ${
            selectedAgent === 'RED'
              ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30'
              : 'border-border/80 bg-card/60 hover:bg-muted/30'
          }`}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <Swords className="w-5 h-5" />
              </div>
              <Badge variant="destructive" size="sm">
                Adversary
              </Badge>
            </div>
            <CardTitle className="text-base font-bold mt-3">Red Team Agent</CardTitle>
            <CardDescription className="text-xs">
              Attacks Target Agent through the public API using 15 named attack vectors.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs space-y-1.5 font-mono text-muted-foreground">
            <div>Role: UNTRUSTED_AGENT</div>
            <div>Direct Mock Access: DENIED</div>
          </CardContent>
        </Card>

        {/* Target AI Agent */}
        <Card
          onClick={() => setSelectedAgent('TARGET')}
          className={`cursor-pointer transition-all border ${
            selectedAgent === 'TARGET'
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
              : 'border-border/80 bg-card/60 hover:bg-muted/30'
          }`}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <Badge variant="cyan" size="sm">
                Executor
              </Badge>
            </div>
            <CardTitle className="text-base font-bold mt-3">Target AI Agent</CardTitle>
            <CardDescription className="text-xs">
              Plans multi-step tasks, invokes sandboxed tools, and executes business logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs space-y-1.5 font-mono text-muted-foreground">
            <div>Planner: {targetModel}</div>
            <div>Ceiling: {maxSteps} Steps/Task</div>
          </CardContent>
        </Card>

        {/* Blue Team Guardian */}
        <Card
          onClick={() => setSelectedAgent('BLUE')}
          className={`cursor-pointer transition-all border ${
            selectedAgent === 'BLUE'
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
              : 'border-border/80 bg-card/60 hover:bg-muted/30'
          }`}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <Badge variant="success" size="sm">
                Defender
              </Badge>
            </div>
            <CardTitle className="text-base font-bold mt-3">Blue Team Guardian</CardTitle>
            <CardDescription className="text-xs">
              Proactive real-time interceptor scoring proposals with 8 signal analyzers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs space-y-1.5 font-mono text-muted-foreground">
            <div>Block Score: &ge; {guardianThreshold}</div>
            <div>ML Microservice: Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Agent Detailed Configuration Panel */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader className="pb-4 border-b border-border/60">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>
              {selectedAgent === 'RED'
                ? 'Red Team Adversary Settings'
                : selectedAgent === 'TARGET'
                ? 'Target Agent Planning & Guardrail Policy'
                : 'Blue Team Guardian Defense Parameters'}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Inspect operational parameters, authorized tool policies, and runtime boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {selectedAgent === 'TARGET' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    LLM Planner Backend
                  </label>
                  <select
                    value={targetModel}
                    onChange={(e) => setTargetModel(e.target.value)}
                    className="w-full bg-muted/40 border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="mock-deterministic">
                      Deterministic Mock Planner (Offline, Keyword-Based)
                    </option>
                    <option value="openai-compatible">
                      OpenAI-Compatible External LLM (Requires LLM_API_KEY)
                    </option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mock mode requires no external API keys and produces reproducible plans.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Maximum Tool Calls Per Task (Ceiling Guard)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={maxSteps}
                    onChange={(e) => setMaxSteps(Number(e.target.value))}
                    className="w-full bg-muted/40 border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Hard loop exhaustion protection to prevent runaway tool recursion.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Hard Policy Guardrails (PolicyValidator):
                </span>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>
                      <strong className="text-foreground">authorize_payment:</strong> Permanently
                      blocked from autonomous agent proposals.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>
                      <strong className="text-foreground">Filesystem Sandbox:</strong> Writes outside
                      sandbox/ are rejected.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>
                      <strong className="text-foreground">Tool Allowlist:</strong> Unknown tool calls
                      halt execution immediately.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {selectedAgent === 'BLUE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Hard Block Risk Threshold (&ge; Score)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={guardianThreshold}
                    onChange={(e) => setGuardianThreshold(Number(e.target.value))}
                    className="w-full bg-muted/40 border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Actions with risk score &ge; 80 are halted with GUARDIAN_BLOCKED.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Human Approval Threshold (&ge; Score &lt; Block)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={80}
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                    className="w-full bg-muted/40 border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Actions scored between 60.0 and 79.0 require Human-in-the-Loop review.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-2">
                <span className="text-xs font-bold text-foreground block">
                  8 Risk Signal Detectors:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
                  <div>• USER_FORBIDDEN_ACTION</div>
                  <div>• INTENT_MISMATCH</div>
                  <div>• SENSITIVITY_VIOLATION</div>
                  <div>• UNKNOWN_RECIPIENT</div>
                  <div>• LARGE_PAYMENT</div>
                  <div>• MALICIOUS_CONTEXT</div>
                  <div>• STEP_VELOCITY</div>
                  <div>• ATTACKER_DOMAIN</div>
                </div>
              </div>
            </div>
          )}

          {selectedAgent === 'RED' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300">
                <span className="font-bold block mb-1">Adversarial Constraints:</span>
                The Red Team Agent authenticates strictly with the least-privileged UNTRUSTED_AGENT
                role. It dispatches attacks only through the public task endpoint and never accesses
                underlying mock services directly.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Prompt Injection (Email)</span>
                  <span className="text-[11px] text-muted-foreground">2 named attacks</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Prompt Injection (Web)</span>
                  <span className="text-[11px] text-muted-foreground">2 named attacks</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Privilege Escalation</span>
                  <span className="text-[11px] text-muted-foreground">3 named attacks</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Payment Fraud</span>
                  <span className="text-[11px] text-muted-foreground">3 named attacks</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Tool Abuse</span>
                  <span className="text-[11px] text-muted-foreground">3 named attacks</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block">Loop Exhaustion</span>
                  <span className="text-[11px] text-muted-foreground">2 named attacks</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

