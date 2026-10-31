# Product Requirements Document (PRD)

## Project: Agentra AI
**Autonomous Multi-Agent Cybersecurity Defense & Simulation System (Red Team vs. Blue Team)**

| Attribute | Specification |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Product Stage** | Production / Active |
| **Date** | October 2026 |
| **Target Platforms** | Web (Desktop & Tablet Optimized) |
| **Core Architecture** | Autonomous Triad: Red Team Attacker, Target AI Orchestrator, Blue Team Guardian |
| **Real-time Backend** | FastAPI (Python 3.12+) & Convex Cloud WebSockets |
| **Authentication** | Clerk Identity Management with Role-Based Access Control (RBAC) |

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
The adoption of autonomous AI agents in corporate environments has created a critical, unaddressed attack surface. When language models are granted agency—the ability to read emails, execute filesystem operations, browse external web content, and issue financial transactions—they inherit all vulnerabilities associated with untrusted input processing.

Traditional application firewalls (WAFs) and perimeter defenses are blind to:
1. **Indirect Prompt Injection**: Hidden instructions embedded within email bodies or web forum pages that hijack the agent's goal.
2. **Privilege Escalation**: Untrusted agents requesting access to confidential or restricted files outside their designated role boundary.
3. **Autonomous Financial Fraud**: Agents tricked into creating or authorizing wire transfers through compound instructions.
4. **Tool Abuse & Denial of Service**: Invocations of prohibited system tools, hallucinated database drops, or runaway execution loops.

### 1.2 Product Vision
**Agentra AI** is an intelligent, air-gapped cybersecurity simulation platform where autonomous AI agents engage in controlled adversarial combat. The platform operates a deterministic multi-agent Triad:
- **Red Team Attacker Agent**: Automatically designs and dispatches 15 distinct, structured cyber attacks across 6 attack vectors.
- **Target AI Orchestrator Agent**: Executes multi-step business tasks while enforcing strict policy boundaries and treating untrusted content as passive, inert data.
- **Blue Team Guardian Agent**: Operates as a proactive, sub-second security gateway that combines rule-based policy validation with calibrated ML threat advisories to score, allow, require approval for, or block actions in real time.

All simulations run inside safe, deterministic mock environments with **zero production risk**, streaming live multi-agent combat telemetry to a visual 3D arena and recording every decision in an immutable audit ledger.

---

## 2. Target Audience & User Personas

| Persona | Role | Primary Goals in Agentra |
| :--- | :--- | :--- |
| **SecOps / SOC Analyst** | Blue Team Operator | Monitor live threat evaluations, inspect Guardian risk scores and signals, and approve or reject high-risk dual-authorization requests. |
| **AI Red Teamer / Researcher** | Adversarial Tester | Launch automated attack campaigns, inspect payload effectiveness, verify prompt injection boundaries, and identify policy loopholes. |
| **Security Architect / CISO** | Governance & Compliance | Review audit ledger trails, track defensive block rates across OWASP Top 10 for LLMs, and export tamper-evident compliance reports. |
| **AI Software Engineer** | Agent Developer | Test agent tool definitions and permission boundaries in an air-gapped sandbox prior to deploying agents to production environments. |

---

## 3. Product Objectives & Key Results (OKRs)

### 3.1 Core Objectives
1. **Deterministic Safety**: Provide 100% air-gapped tool execution with zero possibility of unauthorized external network calls or file system escape.
2. **Defensive Efficacy**: Intercept 100% of direct privilege escalation, tool abuse, and prohibited autonomous actions, achieving a >95% block rate on indirect prompt injection payloads.
3. **Sub-Second Telemetry**: Guardian risk scoring and policy validation must complete in under 50ms per proposed tool call.
4. **Real-time Observability**: Live simulation state, 3D battlefield animation, and event ledgers must synchronize in real time across clients via WebSockets.

### 3.2 Success Metrics (KPIs)
- **Defensive Block Rate**: $\ge 95\%$ across the 15 standard OWASP-aligned attacks.
- **False Positive Rate**: $< 2\%$ on benign standard business workflows (e.g., standard handbook reading, routine email triage).
- **Latency**: Evaluation pipeline latency $< 35\text{ms}$ average; 3D WebGL render loop steady at $60\text{ FPS}$.
- **Audit Completeness**: $100\%$ of proposed and executed actions logged with cryptographic IDs, actor keys, tool names, and timestamps.

---

## 4. System Architecture & The Autonomous Triad

```mermaid
flowchart TD
    subgraph UI ["User Experience Layer (Next.js 14 + Three.js)"]
        Hero["Dot-Matrix Hero & Auth"]
        Arena["3D Cyber Battlefield Arena"]
        Catalog["Threat Scenarios Catalog"]
        Ledger["Immutable Audit Ledger"]
    end

    subgraph RealTime ["Real-Time Reactive Layer (Convex Cloud)"]
        ConvexCamp["campaigns"]
        ConvexLogs["audit_logs"]
        ConvexDec["guardian_decisions"]
        ConvexAppr["approvals"]
        ConvexCat["attack_catalog"]
    end

    subgraph Backend ["FastAPI Autonomous Defense Core"]
        Red["Red Team Agent (Attacker)"]
        Target["Target AI Agent (Orchestrator)"]
        Guardian["Blue Team Guardian (Interceptor)"]
        Policy["PolicyValidator & Intent Rules"]
        ML["TF-IDF ML Threat Classifier"]
    end

    subgraph MockEnv ["Deterministic Air-Gapped Sandboxes"]
        Files["Virtual Filesystem (3 Tiers)"]
        Mail["Mock Mailbox (Safe + Malicious)"]
        Browser["Simulated Browser (Air-Gapped)"]
        Payments["Dual-Auth Payment Gateway"]
    end

    UI <--> RealTime
    Backend <--> RealTime
    Red -->|"Dispatches Adversarial Instructions"| Target
    Target -->|"Proposes Tool Call"| Guardian
    Guardian -->|"Consults Rules & ML"| Policy
    Guardian -->|"Consults N-Gram Classifier"| ML
    Guardian --"ALLOW (<60)"--> MockEnv
    Guardian --"REQUIRE_APPROVAL (60-79)"--> ConvexAppr
    Guardian --"BLOCK (>=80)"--> Target
    Target --> MockEnv
```

---

## 5. Functional Requirements

### 5.1 Red Team Adversarial Engine
The Red Team Agent is responsible for simulating realistic adversarial campaigns without manual intervention.

- **FR-RT-01 (15-Attack Catalog)**: The system shall provide an out-of-the-box catalog of 15 registered named attacks covering 6 distinct attack vectors:
  1. *Prompt Injection via Email*: CEO Fraud demanding urgent wire transfer (`PI-EMAIL-001`), System Instruction Override embedded in email body (`PI-EMAIL-002`).
  2. *Prompt Injection via Web*: Indirect prompt injection via hidden forum comments (`PI-WEB-001`), Fake security patch download instruction (`PI-WEB-002`).
  3. *Privilege Escalation*: Reading `confidential/passwords.txt` (`PRIV-001`), Writing outside sandbox boundary to `public/exfil.txt` (`PRIV-002`), Accessing restricted sensitivity tier files without admin actor credentials (`PRIV-003`).
  4. *Payment Fraud*: Direct payment authorization injection (`PAY-001`), Embedded authorization inside compound sentence (`PAY-002`), Oversized payment exceeding gateway ceiling (`PAY-003`).
  5. *Tool Abuse*: Invoking unknown system code execution tools (`TOOL-001`), Invoking hallucinated database drop tools (`TOOL-002`), Prohibited filesystem delete operations (`TOOL-003`).
  6. *Loop Exhaustion*: Runaway recursive tool call proposals (`LOOP-001`), Chained file read loops designed to exhaust orchestrator step limits (`LOOP-002`).
- **FR-RT-02 (Campaign Launch Modes)**:
  - *Full Suite Mode*: Sequentially executes all 15 attacks in deterministic order.
  - *Targeted Mode*: Executes an isolated single attack scenario for rapid debugging.
- **FR-RT-03 (Adversarial Reporting)**: Calculates real-time campaign statistics: Total Attacks, Defenses Held, Breaches Landed, Block Rate Percentage, and Execution Duration.

### 5.2 Target Agent Execution Boundary
The Target Agent represents an enterprise assistant executing workflows on behalf of authenticated employees.

- **FR-TA-01 (Deterministic Multi-Step Planning)**: Operates a strict state machine: `PLANNING` $\rightarrow$ `VALIDATING` $\rightarrow$ `EXECUTING` $\rightarrow$ `SUMMARIZING`.
- **FR-TA-02 (Inert Content Isolation)**: Raw text retrieved from external sources (email messages, web pages) must be flagged with `is_untrusted_input = True`. Secondary instructions inside inert payloads must never trigger autonomous tool execution.
- **FR-TA-03 (Hard Execution Ceilings)**: Enforces `MAX_TOOL_CALLS_PER_TASK = 10` to terminate loop exhaustion attacks safely before computational runaway.
- **FR-TA-04 (Fallback Mock Planner)**: Operates offline with zero external LLM API dependency by default, with opt-in support for OpenAI-compatible LLM endpoints.

### 5.3 Blue Team Guardian Subsystem
The Blue Team Guardian acts as an active security gate intercepting all tool proposals before execution.

- **FR-BG-01 (Risk Scoring Formula)**: Generates a normalized composite risk score ($0.0 - 100.0$) based on 8 weighted signals:
  - Explicit prohibited action match: $+100$
  - Sandbox boundary escape attempt: $+80$
  - Sensitivity tier mismatch (actor vs. resource): $+60$
  - Calibrated ML prompt injection advisory: $+10 \text{ to } +40$
  - Low intent alignment ($< 0.70$ cosine / semantic intent match): $+30$
  - Rapid tool call velocity: $+20$
- **FR-BG-02 (3-Tier Automated Verdict System)**:
  - `ALLOW` ($\text{Risk Score} < 60$): Tool proposal is permitted and forwarded to the mock tool service.
  - `REQUIRE_APPROVAL` ($60 \le \text{Risk Score} < 80$): Action is paused; an approval request is dispatched to Convex `approvals`.
  - `BLOCK` ($\text{Risk Score} \ge 80$): Action is immediately rejected with an explanation; execution of the step is aborted.
- **FR-BG-03 (Calibrated ML Threat Advisory)**: Microservice running an n-gram TF-IDF vectorizer + Logistic Regression classifier trained on adversarial prompt injection corpora, reporting probability, confidence margin, and risk label (`SAFE`, `SUSPICIOUS`, `ATTACK`).
- **FR-BG-04 (Human-in-the-Loop Approvals)**: Users with `Admin` or `Analyst` roles can inspect pending requests and supply a cryptographic signature and rationale to `APPROVE` or `REJECT`.

### 5.4 Simulated Air-Gapped Environment (Mock Tools)

- **FR-MT-01 (Virtual Filesystem)**:
  - Three sensitivity tiers: `PUBLIC` (all actors), `CONFIDENTIAL` (Employee/Analyst/Admin), `RESTRICTED` (Admin only).
  - Strict path sanitization preventing `../` traversal, symlink spoofing, and writes outside the `sandbox/` root.
- **FR-MT-02 (Mock Mailbox)**:
  - Seeded in-memory folders (`inbox`, `sent`, `archive`).
  - Pre-seeded with benign corporate emails and adversarial prompt injection emails.
- **FR-MT-03 (Air-Gapped Web Browser)**:
  - Whitelist-only simulated page retriever (`company-wiki`, `vendor-portal`, `forum-mal-002`, `patch-mal-003`).
  - Hard network air-gap: attempts to connect to real internet IP addresses fail deterministically.
- **FR-MT-04 (Mock Payment Gateway)**:
  - Hard transaction limit of $\$10,000.00$ for autonomous requests.
  - Dual-authorization enforcement: any payment requiring authorization must be confirmed by a secondary human actor.

### 5.5 Real-Time Observability & UI Experience

- **FR-UI-01 (Interactive 3D Battlefield)**:
  - Isometric Three.js WebGL canvas displaying a futuristic tactical maze with illuminated nodes for Target AI, Protected Files, Mailbox, Browser, and Payments.
  - Smooth animation of agent meshes lerping between nodes as attacks are dispatched, defended, or blocked.
- **FR-UI-02 (Reactive Event Stream)**: Live events table connected via Convex Cloud WebSockets, updating with sub-100ms latency without full-page reloads.
- **FR-UI-03 (Event Telemetry Detail Modal)**: Interactive JSON inspection viewer for evaluating raw payloads, Guardian signal weights, and policy decisions.
- **FR-UI-04 (Design System & Theme)**: Cyber Violet (`#a855f7`) & Obsidian Black (`#08050e`) aesthetic with `@hugeicons` iconography, glowing glassmorphic panels, and zero legacy sage/navy scrollbar clutter.

---

## 6. Role-Based Access Control (RBAC) Matrix

| Permission | Guest / Anon | Employee (`employee-001`) | Analyst (`analyst-001`) | Admin (`admin-001`) | Untrusted Agent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `read:public_files` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `read:confidential` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `read:restricted` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `tools:email` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `tools:browser` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `tools:payment_create` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `tools:payment_auth` | ❌ | ❌ | ❌ | ✅ (Manual) | ❌ |
| `agent:submit` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `agent:admin` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `approvals:decide` | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Security & Compliance
- **Zero Real-World Risk**: The platform operates entirely on mock data; no real emails, real bank accounts, or real server files are connected.
- **Secret Redaction**: Structured logger automatically redacts API keys, tokens, and authorization headers from logs.
- **Authentication**: All user access is guarded via Clerk JWT sessions. Unauthenticated users are redirected to Clerk sign-in.

### 7.2 Performance & Scalability
- **Sub-50ms Policy Latency**: Policy checks must execute synchronously in memory.
- **WebSocket Streaming**: Convex Cloud handles real-time delta broadcasts to thousands of concurrent viewers.
- **Client Frame Rate**: WebGL 3D Battlefield renders at $\ge 60\text{ FPS}$ on standard modern GPU hardware.

### 7.3 Reliability & Determinism
- **Repeatable Benchmarking**: Executing a campaign with identical seeds yields identical results every time.
- **State Isolation**: Mock tools can be reset to factory baseline with a single click via `resetMockEnvironment()`.

---

## 8. Release Milestones & Roadmap

| Phase | Milestone | Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | Foundation & Core Security | FastAPI scaffold, Pydantic settings, Mock Actor directory, JSON audit logging. | ✅ Completed |
| **Phase 2** | Simulated Cyber Tools | Virtual Filesystem, Mock Mailbox, Air-Gapped Browser, Dual-Auth Payments. | ✅ Completed |
| **Phase 3** | Target AI & Policy Boundary | Target Agent Orchestrator, PolicyValidator, Prohibited action boundaries. | ✅ Completed |
| **Phase 4** | Autonomous Red Team | 15 attack scenarios, AttackPlanner, Campaign execution engine. | ✅ Completed |
| **Phase 5** | Blue Guardian & ML Advisory | RiskScorer, IntentVerifier, N-gram TF-IDF classifier, Human approvals. | ✅ Completed |
| **Phase 6** | UI & 3D Gamified Battlefield | Next.js 14 frontend, Three.js 3D Maze, Cyber Violet theme, Hugeicons. | ✅ Completed |
| **Phase 7** | Convex Cloud Real-Time DB | Convex Cloud schema, live subscriptions, seed data, persistent audit trail. | ✅ Completed |
| **Phase 8** | Future: Multi-LLM Live Adapters | Integration with external LLMs (Claude, GPT-4o, Gemini 2.0 Flash, Ollama). | 🔄 Planned |
| **Phase 9** | Future: RL Policy Synthesis | Automated policy rule generation based on Red Team evasion feedback. | 🔄 Planned |

