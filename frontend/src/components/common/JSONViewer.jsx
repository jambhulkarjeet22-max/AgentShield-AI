import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function JSONViewer({ data, title = 'Payload JSON' }) {
  const [copied, setCopied] = useState(false);

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <span className="text-xs text-slate-500 italic">None</span>;
  }

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-navy-950 border border-slate-800 p-3 my-1">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-850 text-xs text-slate-400">
        <span className="font-mono text-cyan-400">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          title="Copy JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed">
        {jsonString}
      </pre>
    </div>
  );
}

