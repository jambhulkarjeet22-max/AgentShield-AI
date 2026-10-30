import React from 'react';

export function MetricCard({ title, value, subtitle, icon: Icon, badge, color = 'blue' }) {
  const borderGlow = {
    blue: 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/5',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5',
    rose: 'border-rose-500/20 hover:border-rose-500/40 hover:shadow-rose-500/5',
    amber: 'border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/5',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-cyan-500/5',
  }[color] || 'border-slate-800';

  const iconColors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  }[color] || 'text-slate-400 bg-slate-800 border-slate-700';

  return (
    <div className={`relative overflow-hidden rounded-xl bg-navy-900/80 p-5 border shadow-lg backdrop-blur transition-all duration-200 ${borderGlow}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${iconColors}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-['JetBrains_Mono']">{value}</span>
        {badge && <span>{badge}</span>}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

