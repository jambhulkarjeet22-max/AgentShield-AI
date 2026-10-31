'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'framer-motion';
import {
  Shield01Icon,
  ShieldAlertIcon,
  SwordsIcon,
  BotIcon,
  FileCodeIcon,
  PlayCircleIcon,
  BrainIcon,
  ScrollIcon,
  BarChartIcon,
} from '@hugeicons/core-free-icons';
import {
  Sidebar as BaseSidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from '@/components/ui/sidebar';

export interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: (c: boolean) => void;
}

function BrandHeader() {
  const { open } = useSidebar();

  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/35 text-violet-400 shadow-sm shadow-violet-500/20 transition-all duration-200">
        <HugeiconsIcon icon={ShieldAlertIcon} size={22} />
      </div>
      <motion.div
        animate={{
          display: open ? 'flex' : 'none',
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        className="flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="truncate font-bold text-base tracking-tight text-foreground leading-tight">
          Agentra
        </span>
        <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-tight">
          Defense Battlefield
        </span>
      </motion.div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { open } = useSidebar();

  return (
    <motion.div
      animate={{
        display: open ? 'block' : 'none',
        opacity: open ? 1 : 0,
      }}
      transition={{ duration: 0.15 }}
      className="px-2 pt-2.5 pb-1"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}

function StatusFooter() {
  const { open } = useSidebar();

  return (
    <div className="flex w-full items-center gap-3 px-1 pt-3 pb-1 border-t border-white/[0.06]">
      <div className="relative flex size-3 shrink-0 items-center justify-center ml-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </div>
      <motion.div
        animate={{
          display: open ? 'flex' : 'none',
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        className="flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap"
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-[12px] font-semibold text-foreground">
            Shield Active
          </span>
          <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-mono text-emerald-400 border border-emerald-500/20">
            SECURE
          </span>
        </div>
        <span className="truncate text-[10px] text-muted-foreground">
          Threat Level: Normal
        </span>
      </motion.div>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const battlefieldNav = [
    { label: 'Overview', href: '/dashboard', icon: <HugeiconsIcon icon={Shield01Icon} size={22} /> },
    { label: 'Cyber Arena', href: '/arena', icon: <HugeiconsIcon icon={SwordsIcon} size={22} />, badge: '3D' },
    { label: 'Agents', href: '/agents', icon: <HugeiconsIcon icon={BotIcon} size={22} /> },
    { label: 'Test Scenarios', href: '/scenarios', icon: <HugeiconsIcon icon={FileCodeIcon} size={22} /> },
    { label: 'Test Runs', href: '/test-runs', icon: <HugeiconsIcon icon={PlayCircleIcon} size={22} /> },
  ];

  const opsNav = [
    { label: 'Adaptive Learning', href: '/learning', icon: <HugeiconsIcon icon={BrainIcon} size={22} /> },
    { label: 'Security Events', href: '/events', icon: <HugeiconsIcon icon={ScrollIcon} size={22} /> },
    { label: 'Reports', href: '/reports', icon: <HugeiconsIcon icon={BarChartIcon} size={22} /> },
  ];

  return (
    <BaseSidebar
      open={collapsed !== undefined ? !collapsed : undefined}
      setOpen={
        setCollapsed
          ? (action) => {
              if (typeof action === 'function') {
                const currentOpen = !collapsed;
                const nextOpen = (action as (prev: boolean) => boolean)(currentOpen);
                setCollapsed(!nextOpen);
              } else {
                setCollapsed(!action);
              }
            }
          : undefined
      }
      animate={true}
    >
      <SidebarBody className="justify-between gap-4">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <BrandHeader />

          <div className="mt-5 flex flex-col gap-1">
            <SectionHeader label="Battlefield" />
            {battlefieldNav.map((item) => (
              <SidebarLink
                key={item.href}
                link={{
                  ...item,
                  active: pathname === item.href,
                }}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <SectionHeader label="Intelligence & Ops" />
            {opsNav.map((item) => (
              <SidebarLink
                key={item.href}
                link={{
                  ...item,
                  active: pathname === item.href,
                }}
              />
            ))}
          </div>
        </div>

        <StatusFooter />
      </SidebarBody>
    </BaseSidebar>
  );
}
