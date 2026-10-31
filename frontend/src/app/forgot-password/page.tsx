'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, KeyRound, Copy, Check } from 'lucide-react';
import { PRECONFIGURED_ACTORS } from '@/services/auth-service';

export default function ForgotPasswordPage() {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-blue-600/30">
      <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">
              Agentra <span className="text-blue-400 font-mono text-xs">AI</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            MOCK CREDENTIAL RECOVERY
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            Agentra operates in deterministic mock mode. Use the predefined actor secrets below to authenticate.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {Object.entries(PRECONFIGURED_ACTORS).map(([key, actor]) => (
            <div
              key={key}
              className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-foreground capitalize">{key}</span>
                <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
                  {actor.api_key}
                </span>
              </div>
              <button
                onClick={() => handleCopy(actor.api_key)}
                className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                title="Copy Key"
              >
                {copiedKey === actor.api_key ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

