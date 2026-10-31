'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface JSONViewerProps {
  data: any;
  title?: string;
  initialExpanded?: boolean;
  maxHeight?: string;
  className?: string;
}

export function JSONViewer({
  data,
  title,
  maxHeight = 'max-h-[220px]',
  className = '',
}: JSONViewerProps) {
  const [copied, setCopied] = useState(false);
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative rounded-lg border border-border/80 bg-black/60 overflow-hidden font-mono text-xs shadow-inner flex flex-col min-w-0 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/50 text-muted-foreground text-[11px] shrink-0 backdrop-blur-sm select-none">
          <span className="font-semibold text-foreground/80 tracking-wide">{title}</span>
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted/50 text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div
        className={`p-3 overflow-y-auto overflow-x-auto text-emerald-400/90 leading-relaxed ${maxHeight} custom-scrollbar min-h-0`}
      >
        <pre className="text-xs font-mono whitespace-pre m-0 p-0 font-mono">
          {formatted}
        </pre>
      </div>
    </div>
  );
}
