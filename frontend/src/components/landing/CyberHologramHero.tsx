'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export function CyberHologramHero() {
  const { isLoaded, isSignedIn } = useAuth();
  const vidARef = useRef<HTMLVideoElement>(null);
  const vidBRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [animClass, setAnimClass] = useState('anim');

  // Entrance Sequence Orchestration
  useEffect(() => {
    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimClass('');
      return;
    }

    let started = false;
    let cleanTimer: NodeJS.Timeout;

    const start = () => {
      if (started) return;
      started = true;
      setAnimClass('anim go');

      // 2600ms safety timeout to complete entrance and strip anim classes
      cleanTimer = setTimeout(() => {
        setAnimClass('');
      }, 2600);
    };

    const bootTimer = setTimeout(start, 900);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        clearTimeout(bootTimer);
        start();
      }).catch(() => {
        start();
      });
    }

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(cleanTimer);
    };
  }, []);

  // Background Looping Video Cross-Fade Controller
  useEffect(() => {
    const vidA = vidARef.current;
    const vidB = vidBRef.current;
    if (!vidA || !vidB) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      vidA.removeAttribute('autoplay');
      try {
        vidA.pause();
        vidB.pause();
        vidA.currentTime = 0;
      } catch (e) {}
      return;
    }

    const FADE = 0.9;
    let cur = vidA;
    let nxt = vidB;
    let swapping = false;

    const playSafe = (v: HTMLVideoElement) => {
      const p = v.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    };

    playSafe(vidA);

    const onTimeUpdate = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      if (v !== cur || swapping || !cur.duration) return;
      if (cur.duration - cur.currentTime > FADE) return;

      swapping = true;
      const out = cur;
      nxt.currentTime = 0;
      playSafe(nxt);
      nxt.classList.add('is-active');
      out.classList.remove('is-active');

      cur = nxt;
      nxt = out;

      setTimeout(() => {
        try {
          out.pause();
          out.currentTime = 0;
        } catch (e) {}
        swapping = false;
      }, FADE * 1000 + 100);
    };

    vidA.addEventListener('timeupdate', onTimeUpdate);
    vidB.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      vidA.removeEventListener('timeupdate', onTimeUpdate);
      vidB.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // Close menu on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className={`hologram-hero-scope ${animClass}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;800&display=block');

        :root {
          --u: min(calc(100vw / 1280), calc(100dvh / 760));
          --ink: #ffffff;
          --ink-muted: #ededed;
          --panel: #181818;
          --white-btn: #fdfdfd;
          --btn-ink: #050505;
          --glass-fill: rgba(0, 0, 0, 0.78);
          --glass-line: rgba(255, 255, 255, 0.12);
          --dx: 8.5;
          --dy: 13.1;
          --e-reveal: cubic-bezier(0.16, 1, 0.3, 1);
          --e-soft: cubic-bezier(0.25, 0.8, 0.3, 1);
        }

        @supports not (height: 100dvh) {
          :root {
            --u: min(calc(100vw / 1280), calc(100vh / 760));
          }
        }

        .hologram-hero-scope {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
          color: var(--ink);
        }

        .hero-root {
          position: relative;
          width: 100%;
          height: 100dvh;
          min-height: 600px;
          overflow: hidden;
          background: #000;
        }

        @supports not (height: 100dvh) {
          .hero-root {
            height: 100vh;
          }
        }

        /* 1280:800 Bleed Box */
        .hero-root .bg {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: max(100vw, calc(100dvh * 1.6));
          height: max(62.5vw, 100dvh);
          background-color: #000;
          pointer-events: none;
        }

        @supports not (height: 100dvh) {
          .hero-root .bg {
            width: max(100vw, calc(100vh * 1.6));
            height: max(62.5vw, 100vh);
          }
        }

        .hero-root .bg-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 51% 8%;
          display: block;
          background-color: #000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.9s linear;
        }

        .hero-root .bg-video.is-active {
          opacity: 1;
        }

        /* Nav Desktop */
        .hero-root .nav {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: calc(67 * var(--u));
          display: flex;
          align-items: center;
          padding-left: calc(24.5 * var(--u));
          padding-right: calc(50.7 * var(--u));
          z-index: 20;
        }

        .hero-root .logo {
          font-weight: 800;
          font-size: calc(24 * var(--u));
          letter-spacing: calc(0.45 * var(--u));
          transform: translateY(calc(-2.4 * var(--u)));
          line-height: 1;
          color: var(--ink);
          text-decoration: none;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: calc(9 * var(--u));
        }

        .hero-root .logo-icon {
          width: calc(26 * var(--u));
          height: calc(26 * var(--u));
          border-radius: calc(7 * var(--u));
          background: rgba(18, 130, 162, 0.25);
          border: 1px solid rgba(93, 145, 181, 0.5);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #5d91b5;
          box-shadow: 0 0 calc(12 * var(--u)) rgba(18, 130, 162, 0.35);
        }

        .hero-root .nav-links {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) translateX(calc(-20 * var(--u)));
          display: flex;
          align-items: center;
          gap: calc(24.3 * var(--u));
          white-space: nowrap;
        }

        .hero-root .nav-links a {
          color: var(--ink-muted);
          text-decoration: none;
          font-size: calc(11.5 * var(--u));
          font-weight: 500;
          letter-spacing: calc(-0.15 * var(--u));
          line-height: 1;
          transition: color 0.18s ease;
        }

        .hero-root .nav-links a:hover {
          color: #ffffff;
        }

        .hero-root .nav-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: calc(6.8 * var(--u));
        }

        .hero-root .btn-nav {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          text-decoration: none;
          white-space: nowrap;
          border: 0;
          cursor: pointer;
        }

        .hero-root .btn-login {
          height: calc(28 * var(--u));
          padding: 0 calc(12.9 * var(--u));
          border-radius: calc(14 * var(--u));
          background: var(--panel);
          color: #e8e8e8;
          font-size: calc(11.5 * var(--u));
          font-weight: 500;
          letter-spacing: calc(-0.15 * var(--u));
          transition: background 0.18s ease, color 0.18s ease;
        }

        .hero-root .btn-login:hover {
          background: #232323;
          color: #ffffff;
        }

        .hero-root .btn-nav-start {
          height: calc(28 * var(--u));
          padding-left: calc(13.5 * var(--u));
          padding-right: calc(14.5 * var(--u));
          border-radius: calc(14 * var(--u));
          background: var(--white-btn);
          color: var(--btn-ink);
          font-size: calc(11.1 * var(--u));
          font-weight: 600;
          letter-spacing: 0;
          gap: calc(7 * var(--u));
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .hero-root .btn-nav-start:hover {
          background: #ffffff;
          transform: scale(1.02);
        }

        .hero-root .arw {
          width: calc(11.5 * var(--u));
          height: calc(9.6 * var(--u));
          flex: 0 0 auto;
          display: block;
        }

        .hero-root .burger {
          display: none;
          margin-left: auto;
          width: calc(40 * var(--u));
          height: calc(28 * var(--u));
          align-items: center;
          justify-content: center;
          background: var(--panel);
          border-radius: calc(14 * var(--u));
          border: 0;
          cursor: pointer;
          padding: 0;
        }

        .hero-root .burger span {
          display: block;
          width: 16px;
          height: 1.5px;
          background: #ededed;
          border-radius: 2px;
          position: relative;
        }

        .hero-root .burger span::before,
        .hero-root .burger span::after {
          content: "";
          position: absolute;
          left: 0;
          width: 16px;
          height: 1.5px;
          background: #ededed;
          border-radius: 2px;
        }

        .hero-root .burger span::before {
          top: -5px;
        }

        .hero-root .burger span::after {
          top: 5px;
        }

        /* Hero Content */
        .hero-root .hero-inner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) translate(calc(var(--dx) * var(--u)), calc(var(--dy) * var(--u)));
          width: max-content;
          text-align: center;
          z-index: 10;
        }

        .hero-root h1 {
          margin: 0;
          font-weight: 500;
          font-size: calc(88 * var(--u));
          line-height: calc(90 * var(--u));
          letter-spacing: calc(-1.1 * var(--u));
          color: var(--ink);
        }

        .hero-root .ln {
          display: block;
          overflow: hidden;
          padding-top: 0.26em;
          margin-top: -0.26em;
        }

        .hero-root .ln-i {
          display: block;
        }

        .hero-root .sub {
          margin: calc(16.1 * var(--u)) 0 0;
          font-weight: 300;
          font-size: calc(17.4 * var(--u));
          line-height: calc(27 * var(--u));
          letter-spacing: calc(-0.30 * var(--u));
          color: #f6f6f6;
        }

        .hero-root .ctas {
          margin-top: calc(21.8 * var(--u));
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateX(calc(-0.75 * var(--u)));
          gap: calc(7 * var(--u));
        }

        .hero-root .btn-lg {
          height: calc(39 * var(--u));
          border-radius: calc(19.5 * var(--u));
          font-size: calc(13.3 * var(--u));
          font-weight: 600;
          letter-spacing: calc(-0.3 * var(--u));
          gap: calc(9 * var(--u));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          cursor: pointer;
        }

        .hero-root .btn-primary {
          background: var(--white-btn);
          color: var(--btn-ink);
          padding-left: calc(18.2 * var(--u));
          padding-right: calc(19.2 * var(--u));
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .hero-root .btn-primary:hover {
          background: #ffffff;
          transform: scale(1.02);
        }

        .hero-root .btn-ghost {
          background: var(--glass-fill);
          color: #d9d9d9;
          padding: 0 calc(17.4 * var(--u));
          border: 1px solid var(--glass-line);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .hero-root .btn-ghost:hover {
          background: rgba(0, 0, 0, 0.66);
          border-color: rgba(255, 255, 255, 0.22);
          transform: scale(1.02);
        }

        .hero-root .btn-lg .arw {
          width: calc(13 * var(--u));
          height: calc(10.8 * var(--u));
        }

        /* Focus outline */
        .hero-root a:focus-visible,
        .hero-root button:focus-visible {
          outline: 2px solid #5d91b5;
          outline-offset: 3px;
          border-radius: 99px;
        }

        /* Entrance Animations */
        @keyframes lineRise {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes subIn {
          from { opacity: 0; transform: translateY(calc(14 * var(--u))); filter: blur(4px); }
          to { opacity: 1; transform: none; filter: blur(0); }
        }

        @keyframes subInFlat {
          from { opacity: 0; transform: translateY(calc(12 * var(--u))); }
          to { opacity: 1; transform: none; }
        }

        @keyframes pillIn {
          from { opacity: 0; transform: translateY(calc(8 * var(--u))) scale(0.972); }
          to { opacity: 1; transform: none; }
        }

        @keyframes liftIn {
          from { opacity: 0; transform: translateY(calc(9 * var(--u))); }
          to { opacity: 1; transform: none; }
        }

        @keyframes logoIn {
          from { opacity: 0; transform: translateY(calc(-2.4 * var(--u))) translateY(calc(9 * var(--u))); }
          to { opacity: 1; transform: translateY(calc(-2.4 * var(--u))); }
        }

        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.985); }
          to { opacity: 1; transform: none; }
        }

        /* Resting State while animating */
        .hologram-hero-scope.anim .ln-i {
          transform: translateY(100%);
        }

        .hologram-hero-scope.anim .logo,
        .hologram-hero-scope.anim .nav-links a,
        .hologram-hero-scope.anim .nav-actions .btn-nav,
        .hologram-hero-scope.anim .burger,
        .hologram-hero-scope.anim .sub,
        .hologram-hero-scope.anim .ctas .btn-lg {
          opacity: 0;
          will-change: transform, opacity;
        }

        /* Active entrance sequence */
        .hologram-hero-scope.anim.go .ln-i {
          animation: lineRise 1.05s var(--e-reveal) both;
        }

        .hologram-hero-scope.anim.go .ln:nth-child(1) .ln-i {
          animation-delay: 0.12s;
        }

        .hologram-hero-scope.anim.go .ln:nth-child(2) .ln-i {
          animation-delay: 0.22s;
        }

        .hologram-hero-scope.anim.go .logo {
          animation: logoIn 0.62s var(--e-soft) 0.46s both;
        }

        .hologram-hero-scope.anim.go .nav-links a {
          animation: liftIn 0.55s var(--e-soft) both;
        }

        .hologram-hero-scope.anim.go .nav-links a:nth-child(1) { animation-delay: 0.540s; }
        .hologram-hero-scope.anim.go .nav-links a:nth-child(2) { animation-delay: 0.585s; }
        .hologram-hero-scope.anim.go .nav-links a:nth-child(3) { animation-delay: 0.630s; }
        .hologram-hero-scope.anim.go .nav-links a:nth-child(4) { animation-delay: 0.675s; }
        .hologram-hero-scope.anim.go .nav-links a:nth-child(5) { animation-delay: 0.720s; }

        .hologram-hero-scope.anim.go .sub {
          animation: subIn 0.85s var(--e-reveal) 0.58s both;
        }

        .hologram-hero-scope.anim.go .btn-login {
          animation: pillIn 0.55s var(--e-soft) 0.68s both;
        }

        .hologram-hero-scope.anim.go .burger {
          animation: pillIn 0.55s var(--e-soft) 0.68s both;
        }

        .hologram-hero-scope.anim.go .btn-nav-start {
          animation: pillIn 0.55s var(--e-soft) 0.73s both;
        }

        .hologram-hero-scope.anim.go .ctas .btn-primary {
          animation: pillIn 0.70s var(--e-reveal) 0.90s both;
        }

        .hologram-hero-scope.anim.go .ctas .btn-ghost {
          animation: pillIn 0.70s var(--e-reveal) 0.97s both;
        }

        /* Mobile Drawer */
        .hero-root .menu {
          display: none;
          position: absolute;
          top: calc(max(58px, calc(67 * var(--u))) - 6px);
          right: max(24px, calc(28 * var(--u)));
          width: min(320px, calc(100vw - 48px));
          background: rgba(16, 31, 61, 0.92);
          -webkit-backdrop-filter: blur(24px);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 10px 8px 12px;
          flex-direction: column;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
          transform-origin: top right;
          z-index: 50;
        }

        .hero-root .menu.open {
          display: flex;
          animation: menuIn 0.18s ease both;
        }

        .hero-root .menu a {
          color: var(--ink-muted);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: calc(-0.15 * var(--u));
          padding: 12px 14px;
          border-radius: 12px;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .hero-root .menu a:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .hero-root .menu .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 14px;
        }

        .hero-root .menu .m-start {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: var(--white-btn);
          color: var(--btn-ink);
          margin: 6px 8px 0;
          padding: 13px 16px;
          border-radius: 14px;
          font-weight: 600;
        }

        .hero-root .menu .m-start:hover {
          background: #ffffff;
          color: var(--btn-ink);
        }

        .hero-root .menu .m-start .arw {
          width: 13px;
          height: 11px;
        }

        /* Tablet Breakpoint (max-width: 1160px) */
        @media (max-width: 1160px) {
          :root {
            --u: min(
              max(0.9px, min(calc(100vw / 1280), calc(100dvh / 760))),
              calc((100vw - 72px) / 575),
              calc(100dvh / 620)
            );
          }
          .hero-root .nav {
            height: max(58px, calc(67 * var(--u)));
            padding-left: max(24px, calc(28 * var(--u)));
            padding-right: max(24px, calc(28 * var(--u)));
          }
          .hero-root .nav-links,
          .hero-root .nav-actions {
            display: none;
          }
          .hero-root .burger {
            display: flex;
            width: max(46px, calc(48 * var(--u)));
            height: max(38px, calc(34 * var(--u)));
            border-radius: 999px;
          }
          .hero-root .hero-inner {
            max-width: calc(100vw - 48px);
          }
          .hero-root .sub {
            font-size: max(16px, calc(17.4 * var(--u)));
            line-height: max(25px, calc(27 * var(--u)));
          }
          .hero-root .ctas {
            margin-top: max(26px, calc(21.8 * var(--u)));
            gap: max(10px, calc(7 * var(--u)));
          }
          .hero-root .btn-lg {
            height: max(44px, calc(39 * var(--u)));
            border-radius: max(22px, calc(19.5 * var(--u)));
            font-size: max(15px, calc(13.3 * var(--u)));
            gap: max(10px, calc(9 * var(--u)));
          }
          .hero-root .btn-primary {
            padding-left: max(21px, calc(18.2 * var(--u)));
            padding-right: max(22px, calc(19.2 * var(--u)));
          }
          .hero-root .btn-ghost {
            padding-left: max(20px, calc(17.4 * var(--u)));
            padding-right: max(21px, calc(18.4 * var(--u)));
          }
          .hero-root .btn-lg .arw {
            width: max(14px, calc(13 * var(--u)));
            height: max(11.6px, calc(10.8 * var(--u)));
          }
        }

        /* Mobile Breakpoint (max-width: 552px) */
        @media (max-width: 552px) {
          :root { --u: 1px; }
          .hero-root .nav {
            height: 56px;
            padding: 0 20px;
          }
          .hero-root .logo {
            font-size: 22px;
            letter-spacing: -0.4px;
          }
          .hero-root .burger {
            width: 42px;
            height: 36px;
          }
          .hero-root .hero-inner {
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            width: auto;
            max-width: none;
            padding: 0 20px;
            transform: translateY(-47%);
          }
          .hero-root h1 {
            font-size: min(72px, calc((100vw - 44px) / 6.9));
            line-height: 1.04;
            letter-spacing: -0.02em;
          }
          .hero-root .sub {
            margin-top: 16px;
            font-size: clamp(15px, 4vw, 16.5px);
            line-height: 1.55;
            letter-spacing: 0;
            max-width: 44ch;
            margin-left: auto;
            margin-right: auto;
          }
          .hero-root .sub br {
            display: none;
          }
          .hero-root .ctas {
            margin-top: 24px;
            gap: 10px;
            transform: none;
            flex-wrap: wrap;
          }
          .hero-root .btn-lg {
            height: 46px;
            border-radius: 23px;
            font-size: 15px;
            gap: 9px;
          }
          .hero-root .btn-primary {
            padding-left: 20px;
            padding-right: 21px;
          }
          .hero-root .btn-ghost {
            padding-left: 19px;
            padding-right: 20px;
          }
          .hero-root .btn-lg .arw {
            width: 13px;
            height: 11px;
          }
          .hero-root .menu {
            top: 50px;
            left: 16px;
            right: 16px;
            width: auto;
          }
          .hero-root .menu a {
            font-size: 15.5px;
            padding: 13px 14px;
          }
          .hero-root .menu .m-start {
            padding: 14px 16px;
          }
          .hologram-hero-scope.anim.go .sub {
            animation-name: subInFlat;
          }
          .hologram-hero-scope.anim.go .ln-i {
            animation-duration: 0.92s;
          }
          .hologram-hero-scope.anim.go .ctas .btn-primary {
            animation-delay: 0.84s;
          }
          .hologram-hero-scope.anim.go .ctas .btn-ghost {
            animation-delay: 0.90s;
          }
        }

        /* Narrow Phones (max-width: 353px) */
        @media (max-width: 353px) {
          .hero-root .ctas {
            flex-direction: column;
            align-items: center;
          }
          .hero-root .btn-lg {
            width: min(100%, 272px);
          }
        }

        /* Short Landscape */
        @media (max-width: 552px) and (max-height: 460px) {
          .hero-root h1 {
            font-size: min(44px, calc((100vw - 44px) / 6.9));
          }
          .hero-root .sub {
            margin-top: 12px;
            font-size: 15px;
            line-height: 1.5;
          }
          .hero-root .ctas {
            margin-top: 18px;
          }
          .hero-root .hero-inner {
            transform: translateY(-44%);
          }
        }

        /* Prefers Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .hologram-hero-scope.anim .ln {
            overflow: visible;
            padding-top: 0;
            margin-top: 0;
          }
          .hologram-hero-scope.anim .ln-i {
            transform: none;
          }
          .hologram-hero-scope.anim .logo,
          .hologram-hero-scope.anim .nav-links a,
          .hologram-hero-scope.anim .nav-actions .btn-nav,
          .hologram-hero-scope.anim .burger,
          .hologram-hero-scope.anim .sub,
          .hologram-hero-scope.anim .ctas .btn-lg {
            opacity: 1;
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <section id="hero" className="hero-root">
        {/* Seamless Cross-fade Background Hologram Videos */}
        <div
          className="bg"
          role="img"
          aria-label="Stylised globe of Earth rendered as a purple dot matrix against a starfield, slowly rotating"
        >
          <video
            ref={vidARef}
            className="bg-video is-active"
            id="bgVideoA"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
            poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4"
              type="video/mp4"
            />
          </video>
          <video
            ref={vidBRef}
            className="bg-video"
            id="bgVideoB"
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
            poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        {/* Floating Header */}
        <header className="nav">
          <Link href="/" className="logo">
            <span className="logo-icon">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span>AgentShield</span>
          </Link>

          <nav className="nav-links" aria-label="Primary Navigation">
            <a href="#hero">Overview</a>
            <a href="#battlefield">Cyber Battlefield</a>
            <a href="#features">Key Benefits</a>
            <Link href={isSignedIn ? '/arena' : '/sign-in?redirect_url=/arena'}>
              Cyber Arena
            </Link>
          </nav>

          <div className="nav-actions">
            {isLoaded && !isSignedIn && (
              <>
                <Link href="/sign-in" className="btn-nav btn-login">
                  Sign In
                </Link>
                <Link href="/sign-up" className="btn-nav btn-nav-start">
                  <span>Get Started</span>
                  <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path
                      d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/dashboard" className="btn-nav btn-nav-start">
                <span>Dashboard</span>
                <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                  <path
                    d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </div>

          {/* Mobile Burger */}
          <button
            className="burger"
            id="burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <span />
          </button>
        </header>

        {/* Mobile Slide-Out Panel */}
        <nav
          className={`menu ${menuOpen ? 'open' : ''}`}
          id="menu"
          aria-label="Mobile Navigation"
          onClick={() => setMenuOpen(false)}
        >
          <a href="#hero">Overview</a>
          <a href="#battlefield">Cyber Battlefield</a>
          <a href="#features">Key Benefits</a>
          <Link href={isSignedIn ? '/arena' : '/sign-in?redirect_url=/arena'}>
            Cyber Arena
          </Link>
          <div className="divider" />
          {isLoaded && !isSignedIn ? (
            <>
              <Link href="/sign-in">Sign In</Link>
              <Link href="/sign-up" className="m-start">
                <span>Get Started</span>
                <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                  <path
                    d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="m-start">
              <span>Enter Dashboard</span>
              <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                <path
                  d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </nav>

        {/* Hero Central Content */}
        <div className="hero-inner">
          <h1>
            <span className="ln">
              <span className="ln-i">Autonomous</span>
            </span>
            <span className="ln">
              <span className="ln-i">Cyber Defense</span>
            </span>
          </h1>

          <p className="sub">
            Simulate real-time multi-agent cyber warfare with Red Team attackers,
            <br />
            deterministic Target AI orchestrators, and Blue Guardian interceptors
            <br />
            in air-gapped sandboxes.
          </p>

          <div className="ctas">
            <Link
              href={isSignedIn ? '/arena' : '/sign-in?redirect_url=/arena'}
              className="btn-lg btn-primary"
            >
              <span>Launch Cyber Arena</span>
              <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                <path
                  d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <a href="#battlefield" className="btn-lg btn-ghost">
              <span>Explore Architecture</span>
              <svg className="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                <path
                  d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

