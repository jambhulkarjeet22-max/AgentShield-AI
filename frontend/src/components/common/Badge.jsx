import React from 'react';

export function Badge({ children, variant = 'default', size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size] || 'px-2.5 py-1 text-xs font-semibold';

  const variantStr = String(children || variant).toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border border-slate-700';

  if (['ALLOW', 'ALLOWED', 'DEFENCE_HELD', 'COMPLETED', 'SUCCESS', 'APPROVED', 'HEALTHY'].includes(variantStr)) {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  } else if (['BLOCK', 'BLOCKED', 'GUARDIAN_BLOCKED', 'REJECTED', 'FAILED', 'ATTACK_SUCCESS', 'ERROR'].includes(variantStr)) {
    colorClasses = 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
  } else if (['REQUIRE_APPROVAL', 'PENDING', 'PENDING_APPROVAL', 'SUSPICIOUS', 'RUNNING'].includes(variantStr)) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
  } else if (['INFO', 'ANALYST', 'ADMIN', 'BLUE', 'PROMPT_INJECTION_EMAIL', 'PROMPT_INJECTION_WEB'].includes(variantStr)) {
    colorClasses = 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
  } else if (['CYAN', 'ML_ADVISORY'].includes(variantStr)) {
    colorClasses = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
  }

  return (
    <span className={`inline-flex items-center rounded-md uppercase tracking-wider ${sizeClasses} ${colorClasses}`}>
      {children}
    </span>
  );
}

