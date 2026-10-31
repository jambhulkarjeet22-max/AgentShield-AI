'use client';

import React from 'react';
import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer id="footer" className="site-footer">
      <style jsx>{`
        .site-footer {
          --hero-max-width: 1820px;
          position: relative;
          z-index: 100;
          overflow: hidden;
          background: #000000;
          color: #ffffff;
          font-family: 'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }

        .site-footer a {
          color: inherit;
          text-decoration: none;
        }

        /* Animated Dots Strip */
        .footer-dots {
          position: relative;
          height: 120px;
          overflow: hidden;
          background: #000000;
        }

        .footer-dots__line {
          position: absolute;
          left: 0;
          top: 50%;
          width: 200%;
          height: 70px;
          opacity: 0.75;
          transform: translateY(-50%);
          background-image: radial-gradient(circle, rgb(255 255 255 / 0.55) 1.5px, transparent 2px),
            radial-gradient(circle, rgb(255 255 255 / 0.35) 1px, transparent 1.5px),
            radial-gradient(circle, rgb(255 255 255 / 0.45) 1.2px, transparent 1.8px);
          background-position: 0 8px, 24px 22px, 48px 14px;
          background-size: 72px 38px, 110px 44px, 160px 52px;
          animation: footerDotsMove 18s linear infinite;
          will-change: transform;
        }

        @keyframes footerDotsMove {
          from {
            transform: translate3d(0, -50%, 0);
          }
          to {
            transform: translate3d(-50%, -50%, 0);
          }
        }

        /* Footer Inner */
        .site-footer__inner {
          width: min(100% - 96px, var(--hero-max-width));
          margin: 0 auto;
          padding: clamp(34px, 4vw, 66px) 0 clamp(18px, 2vw, 34px);
        }

        /* Top Grid */
        .site-footer__top {
          display: grid;
          grid-template-columns: minmax(320px, 1.25fr) repeat(3, minmax(150px, 0.42fr));
          gap: clamp(28px, 4vw, 76px);
          min-height: clamp(220px, 24vw, 330px);
        }

        .site-footer__heading {
          max-width: 680px;
          margin: 0;
          color: #ffffff;
          font-size: clamp(34px, 3.5vw, 62px);
          font-weight: 220;
          letter-spacing: 0;
          line-height: 1.06;
        }

        .site-footer__nav {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: clamp(14px, 1.35vw, 22px);
        }

        .site-footer__nav-link {
          color: rgb(255 255 255 / 0.88);
          font-size: 16px;
          font-weight: 650;
          line-height: 1.1;
          transition: color 180ms ease, transform 180ms ease;
          display: inline-block;
        }

        .site-footer__nav-link:hover {
          color: #ffffff;
          transform: translateX(3px);
        }

        /* Brand Row */
        .site-footer__brand-row {
          width: 100%;
          margin-top: clamp(18px, 3vw, 46px);
        }

        .site-footer__brand {
          display: flex;
          align-items: center;
          width: 100%;
          color: #ffffff;
          text-decoration: none;
        }

        .site-footer__mark {
          position: relative;
          flex: 0 0 clamp(58px, 6.1vw, 118px);
          aspect-ratio: 1;
          margin-right: clamp(14px, 1.6vw, 28px);
          overflow: hidden;
          border-radius: 50%;
          background: #ffffff;
        }

        .site-footer__mark::before {
          content: '';
          position: absolute;
          inset: -18%;
          background: #000000;
          clip-path: polygon(
            0 20%,
            100% 8%,
            100% 19%,
            0 31%,
            0 43%,
            100% 31%,
            100% 42%,
            0 54%,
            0 66%,
            100% 54%,
            100% 65%,
            0 77%
          );
        }

        .site-footer__wordmark {
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          font-size: clamp(58px, 11.1vw, 214px);
          font-weight: 760;
          letter-spacing: -0.055em;
          line-height: 0.78;
          white-space: nowrap;
        }

        /* Legal Line */
        .site-footer__legal {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: flex-start;
          gap: 8px 18px;
          margin-top: clamp(14px, 1.4vw, 24px);
          color: rgb(255 255 255 / 0.52);
          font-size: 9px;
          line-height: 1.35;
        }

        .site-footer__legal p {
          margin: 0;
        }

        .site-footer__legal a {
          color: inherit;
          transition: color 180ms ease;
        }

        .site-footer__legal a:hover {
          color: #ffffff;
        }

        /* Breakpoints */
        @media (max-width: 980px) {
          .site-footer__inner {
            width: min(100% - 48px, var(--hero-max-width));
          }

          .site-footer__top {
            grid-template-columns: 1fr 1fr;
          }

          .site-footer__heading {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 560px) {
          .site-footer__inner {
            width: min(100% - 32px, var(--hero-max-width));
          }

          .site-footer__top {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .site-footer__nav-link {
            font-size: 15px;
          }

          .site-footer__mark {
            flex-basis: clamp(38px, 12vw, 58px);
          }

          .site-footer__wordmark {
            font-size: clamp(45px, 18vw, 84px);
          }
        }
      `}</style>

      {/* ANIMATED DOTS STRIP */}
      <div className="footer-dots" aria-hidden="true">
        <div className="footer-dots__line" />
      </div>

      {/* FOOTER INNER */}
      <div className="site-footer__inner">
        {/* TOP GRID */}
        <div className="site-footer__top">
          {/* H2 Heading */}
          <h2 className="site-footer__heading">
            Proven Autonomous Multi-Agent Cyber Defense
          </h2>

          {/* Nav 1 */}
          <nav className="site-footer__nav" aria-label="Architecture navigation">
            <Link href="/agents" className="site-footer__nav-link">
              Red Team Attacker
            </Link>
            <Link href="/agents" className="site-footer__nav-link">
              Target AI Agent
            </Link>
            <Link href="/agents" className="site-footer__nav-link">
              Blue Guardian
            </Link>
            <Link href="/arena" className="site-footer__nav-link">
              Deterministic Arena
            </Link>
            <Link href="/scenarios" className="site-footer__nav-link">
              Threat Scenarios
            </Link>
          </nav>

          {/* Nav 2 */}
          <nav className="site-footer__nav" aria-label="Platform telemetry">
            <Link href="/dashboard" className="site-footer__nav-link">
              Security Dashboard
            </Link>
            <Link href="/events" className="site-footer__nav-link">
              Live Event Ledger
            </Link>
            <Link href="/learning" className="site-footer__nav-link">
              Threat Learning
            </Link>
            <Link href="/test-runs" className="site-footer__nav-link">
              Simulation Runs
            </Link>
            <Link href="/reports" className="site-footer__nav-link">
              Security Reports
            </Link>
          </nav>

          {/* Nav 3 */}
          <nav className="site-footer__nav" aria-label="Ecosystem and links">
            <Link href="/arena" className="site-footer__nav-link">
              Cyber Arena
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="site-footer__nav-link"
            >
              GitHub Repository
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="site-footer__nav-link"
            >
              Follow Us on X
            </a>
            <Link href="/events" className="site-footer__nav-link">
              Security Advisories
            </Link>
          </nav>
        </div>

        {/* BRAND ROW */}
        <div className="site-footer__brand-row">
          <Link href="/" className="site-footer__brand" aria-label="AgentShield AI home">
            <span className="site-footer__mark" aria-hidden="true" />
            <span className="site-footer__wordmark">AgentShield</span>
          </Link>
        </div>

        {/* LEGAL LINE */}
        <div className="site-footer__legal">
          <p>&copy; {new Date().getFullYear()} AgentShield AI. All rights reserved.</p>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

