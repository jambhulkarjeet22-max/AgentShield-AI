import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'success'
    | 'destructive'
    | 'warning'
    | 'secondary'
    | 'outline'
    | 'cyan'
    | 'violet';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-primary/20 text-primary border-primary/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    destructive: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    outline: 'border-border text-foreground bg-transparent',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    violet: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

