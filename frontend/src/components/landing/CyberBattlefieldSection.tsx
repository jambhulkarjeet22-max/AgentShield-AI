'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Swords, Bot, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof typeof motion;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className = '',
  style,
  as = 'div',
}: FadeInProps) {
  const Component = (motion[as as keyof typeof motion] || motion.div) as any;

  return (
    <Component
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

function AnimatedChar({
  char,
  index,
  total,
  progress,
}: {
  char: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const charProgress = index / total;
  const start = Math.max(0, charProgress - 0.1);
  const end = Math.min(1, charProgress + 0.05);
  const opacity = useTransform(progress, [start, end], [0.2, 1]);

  return (
    <span className="relative inline-block font-sans">
      <span className="opacity-0 select-none">{char === ' ' ? '\u00A0' : char}</span>
      <motion.span style={{ opacity }} className="absolute inset-0 select-none">
        {char === ' ' ? '\u00A0' : char}
      </motion.span>
    </span>
  );
}

export function CyberBattlefieldSection() {
  const { isSignedIn } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  });

  const paragraphText =
    'AgentShield AI is an autonomous cybersecurity simulation platform where adversaries attack, defenders intercept, and AI agents execute business workflows strictly within deterministic, air-gapped mock environments.';

  return (
    <section
      id="battlefield"
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 md:px-10 py-20 bg-[#0C0C0C] text-foreground overflow-hidden select-none border-t border-white/5"
    >
      <style jsx global>{`
        .hero-heading {
          background: linear-gradient(180deg, #646973 0%, #bbccd7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cta-btn-custom {
          background: linear-gradient(123deg, #18011f 7%, #b600a8 37%, #7621b0 72%, #be4c00 100%);
          box-shadow: 0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721b1 inset;
          outline: 2px solid #e3e3e3;
          outline-offset: -3px;
        }
      `}</style>

      {/* 4 Decorative Corner Floating Images */}
      {/* 1. Top-Left: Moon Icon */}
      <FadeIn
        delay={0.1}
        duration={0.9}
        x={-80}
        y={0}
        className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] z-0 pointer-events-none select-none"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png"
          alt=""
          aria-hidden="true"
          className="w-[120px] sm:w-[160px] md:w-[210px] h-auto object-contain drop-shadow-[0_10px_35px_rgba(255,255,255,0.12)] opacity-85"
        />
      </FadeIn>

      {/* 2. Bottom-Left: 3D Object */}
      <FadeIn
        delay={0.25}
        duration={0.9}
        x={-80}
        y={0}
        className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] z-0 pointer-events-none select-none"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png"
          alt=""
          aria-hidden="true"
          className="w-[100px] sm:w-[140px] md:w-[180px] h-auto object-contain drop-shadow-[0_10px_35px_rgba(118,33,176,0.25)] opacity-85"
        />
      </FadeIn>

      {/* 3. Top-Right: Lego Icon */}
      <FadeIn
        delay={0.15}
        duration={0.9}
        x={80}
        y={0}
        className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] z-0 pointer-events-none select-none"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png"
          alt=""
          aria-hidden="true"
          className="w-[120px] sm:w-[160px] md:w-[210px] h-auto object-contain drop-shadow-[0_10px_35px_rgba(255,255,255,0.12)] opacity-85"
        />
      </FadeIn>

      {/* 4. Bottom-Right: 3D Group */}
      <FadeIn
        delay={0.3}
        duration={0.9}
        x={80}
        y={0}
        className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] z-0 pointer-events-none select-none"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png"
          alt=""
          aria-hidden="true"
          className="w-[130px] sm:w-[170px] md:w-[220px] h-auto object-contain drop-shadow-[0_10px_35px_rgba(182,0,168,0.25)] opacity-85"
        />
      </FadeIn>

      {/* Center Content (relative z-10, max-w-5xl, centered) */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-12 sm:gap-16 md:gap-20">
        {/* Group 1 -- Heading + Animated Text */}
        <div className="flex flex-col items-center gap-8 sm:gap-12 md:gap-14 w-full">
          {/* Heading */}
          <FadeIn delay={0} y={40} className="w-full text-center">
            <h2
              className="font-black uppercase leading-none tracking-tight text-center hero-heading"
              style={{
                fontFamily: "'Kanit', sans-serif",
                fontSize: 'clamp(2.75rem, 8vw, 140px)',
              }}
            >
              Cyber Battlefield
            </h2>
          </FadeIn>

          {/* Animated Scroll Reveal Paragraph */}
          <p
            ref={textRef}
            className="text-[#D7E2EA] font-medium text-center leading-relaxed max-w-[640px] px-4"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.35rem)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {paragraphText.split('').map((char, index) => (
              <AnimatedChar
                key={index}
                char={char}
                index={index}
                total={paragraphText.length}
                progress={scrollYProgress}
              />
            ))}
          </p>

          {/* Preserved Section Content: The Triad Battlefield Cards */}
          <FadeIn delay={0.2} y={30} className="w-full mt-2">
            <div className="w-full rounded-2xl border border-white/10 bg-[#121316]/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span
                    className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold"
                    style={{ fontFamily: "'Kanit', sans-serif" }}
                  >
                    Autonomous Triad Cyber Battlefield Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
                  Deterministic Simulation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Red Team Node */}
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-left transition-all hover:border-rose-500/50 hover:bg-rose-950/30">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3.5">
                    <Swords className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold block">
                    Red Team Agent
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: "'Kanit', sans-serif" }}>
                    Autonomous Attacker
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Dispatches 15 distinct attacks across prompt injection, privilege escalation, payment fraud, and tool abuse.
                  </p>
                </div>

                {/* Target Agent Node */}
                <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-5 text-left transition-all hover:border-cyan-500/60 hover:bg-cyan-950/30 shadow-lg shadow-cyan-950/20">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
                    Target AI Agent
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: "'Kanit', sans-serif" }}>
                    Task Orchestrator
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Autonomous agent performing business workflows with multi-step planning, policy checks, and inert content isolation.
                  </p>
                </div>

                {/* Blue Guardian Node */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-950/30">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                    Blue Team Guardian
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: "'Kanit', sans-serif" }}>
                    Proactive Interceptor
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Real-time security gate scoring 8 multi-signal anomalies, enforcing human approvals, and consulting ML advisories.
                  </p>
                </div>
              </div>

              {/* Protected Tool Environments Bar */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-around gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Lock className="w-3.5 h-3.5 text-blue-400" /> Protected Mock Tools:
                </span>
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
                  Virtual Filesystem
                </span>
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
                  Mock Mailbox
                </span>
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
                  Air-Gapped Browser
                </span>
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
                  Dual-Auth Payments
                </span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Group 2 -- Action Button */}
        <FadeIn delay={0.3} y={20}>
          <Link
            href={isSignedIn ? '/arena' : '/sign-in?redirect_url=/arena'}
            className="cta-btn-custom inline-flex items-center justify-center rounded-full text-white font-semibold uppercase tracking-widest text-xs sm:text-sm md:text-base px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 transition-all duration-200 hover:opacity-90 active:opacity-75 hover:scale-105 active:scale-95 shadow-xl"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            Enter Cyber Arena
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

