# Technical Requirements Document (TRD)

## Project: AgentShield AI
**Technical Architecture, Component Design, Data Contracts & Infrastructure Specification**

| Attribute | Specification |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Approved / Production Baseline |
| **Date** | October 2026 |
| **Architecture Style** | Event-Driven Reactive Micro-Orchestration & 3D WebGL Visualization |
| **Primary Languages** | TypeScript (Frontend) / Python 3.12+ (Backend Core & ML) |
| **Reactive Sync** | Convex Cloud (WebSocket Protocol) |
| **Identity Management** | Clerk JWT Auth with RBAC Claims |

---

## 1. Technical Architecture & System Overview

```mermaid
graph TD
    Client["Client Browser (Desktop/Tablet)"]
    Clerk["Clerk Auth Service"]

    subgraph FrontendApp ["Frontend Application (Next.js 14.2+)"]
        UIComponents["React 18 / Tailwind CSS / Hugeicons"]
        WebGLScene["Three.js 3D Battlefield Maze"]
        ConvexClient["Convex Client Provider (WebSockets)"]
        APIClient["Axios REST Client"]
    end

    subgraph CloudLayer ["Convex Cloud Real-Time Engine"]
        ConvexDB[(Convex Cloud Database)]
        ConvexFuncs["Convex Schema & Mutations (catalog, campaigns, events, guardian)"]
    end

    subgraph BackendCore ["FastAPI Backend (Python 3.12+)"]
        APIRouter["FastAPI v1 API Gateway"]
        SecurityGateway["Actor Resolution & RBAC Middleware"]
        
        subgraph Agents ["Autonomous Agent Layer"]
            RedTeam["Red Team Orchestrator (15 Attacks)"]
            TargetAgent["Target Agent Task Orchestrator"]
            BlueGuardian["Blue Team Guardian Interceptor"]
        end

        subgraph CoreDefense ["Defense & Policy Engine"]
            PolicyValidator["Deterministic PolicyValidator"]
            MLAdvisory["N-Gram TF-IDF Classifier (scikit-learn)"]
            AuditLogger["In-Memory Tamper-Resistant Audit Logger"]
        end

        subgraph MockTools ["Simulated Air-Gapped Tool Services"]
            FS["Virtual Filesystem Service"]
            Mail["Mock Mailbox Service"]
            Browser["Air-Gapped Browser Service"]
            Payments["Dual-Auth Payment Service"]
        end
    end

    Client -->|Authenticates| Clerk
    Client -->|Loads App| FrontendApp
    FrontendApp <-->|Real-time Reactive Sync| ConvexFuncs
    ConvexFuncs <--> ConvexDB
    APIClient -->|REST Commands| APIRouter
    APIRouter --> SecurityGateway
    SecurityGateway --> Agents
    RedTeam -->|Dispatches Payload| TargetAgent
    TargetAgent -->|Proposes Action| BlueGuardian
    BlueGuardian --> PolicyValidator
    BlueGuardian --> MLAdvisory
    BlueGuardian --> MockTools
    MockTools --> AuditLogger
    AuditLogger -.->|Syncs| ConvexFuncs
```

---

## 2. Technology Stack & Dependency Baseline

### 2.1 Backend Technology Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Python | `3.12+` | Modern type hints, pattern matching, async IO. |
| **Web Framework** | FastAPI | `^0.111.0` | High-throughput asynchronous REST API endpoints. |
| **Validation Engine** | Pydantic v2 & Pydantic-Settings | `^2.7.0` | Strict data parsing, request/response models, env configuration. |
| **ASGI Server** | Uvicorn | `^0.30.0` | Production ASGI web server with hot reloading. |
| **ML Classifier** | scikit-learn & joblib | `^1.5.0` | N-gram TF-IDF vectorization & logistic classification for prompt injection detection. |
| **HTTP Client** | HTTPX | `^0.27.0` | Asynchronous test harness and inter-service HTTP client. |
| **Testing** | Pytest & pytest-asyncio | `^8.2.0` | Test runner, fixtures, and adversarial benchmark suites. |

### 2.2 Frontend Technology Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `14.2.5` | React Server Components, client routing, optimized builds. |
| **Core Library** | React & React-DOM | `18.3.1` | UI component lifecycle and hooks. |
| **Language** | TypeScript | `^5.4.5` | Static type safety across entire client and schema contracts. |
| **Real-Time Data** | Convex | `^1.48.0` | WebSocket reactive subscriptions, live database, cloud functions. |
| **Authentication** | `@clerk/nextjs` | `^7.9.22` | Turnkey user authentication, token verification, session lifecycle. |
| **3D Engine** | Three.js | `^0.165.0` | WebGL isometric tactical 3D battlefield canvas. |
| **Iconography** | `@hugeicons/react` & `@hugeicons/core-free-icons` | `^1.1.10` / `^4.4.0` | High-performance SVG icons replacing legacy icon sets. |
| **Styling** | Tailwind CSS | `^3.4.3` | Utility-first responsive styling with Cyber Violet design tokens. |
| **Animation** | Framer Motion | `^14.8.0` | Physics-based micro-interactions and scroll reveals. |

---

## 3. Backend Component Specification

### 3.1 Core Architecture & Middleware Pipeline
All incoming HTTP requests pass through the following execution chain:
1. **Timing & Request ID Middleware**: Generates an `X-Request-ID` UUID and injects it into headers; measures execution time and emits `X-Process-Time`.
2. **CORS Middleware**: Allows authenticated origins (`localhost:3000`, client preview domains) with full headers and method access.
3. **Structured JSON Logging**: Every request/response cycle is logged to stdout in structured JSON, automatically redacting credentials matching `/(key|token|auth|secret|password)/i`.
4. **Global Exception Handling**: Converts unhandled exceptions into RFC 7807 problem details with consistent error envelopes.

### 3.2 Mock Actor Directory & Authentication Gateway (`actors.py`)
Actor identities are resolved via the `X-Actor-Key` request header or default to `guest` if omitted:

```python
class MockActor(BaseModel):
    actor_id: str
    role: str
    permissions: List[str]
    api_key: str

    def has_permission(self, permission: str) -> bool:
        if "*" in self.permissions or permission in self.permissions:
            return True
        scope = permission.split(":")[0] + ":*"
        return scope in self.permissions
```

**Pre-configured Actors**:
- `admin-001` (Key: `mock-key-admin-secret-9001`): Holds `*` (superuser).
- `analyst-001` (Key: `mock-key-analyst-secret-4402`): Holds `agent:*`, `tools:read`, `approvals:decide`.
- `employee-001` (Key: `mock-key-employee-secret-3303`): Holds `tools:*`, `files:read_confidential`, `agent:submit`.
- `untrusted-agent` (Key: `mock-key-untrusted-agent-0000`): Holds `files:read_public` only; blocked from autonomous actions.

---

### 3.3 Simulated Cyber Tools (Phase 2 Specifications)

#### 1. Sandboxed Virtual Filesystem (`tools/filesystem/service.py`)
- **Root Confinement**: All file paths are strictly resolved relative to `sandbox/`.
- **Path Sanitization**:
  ```python
  def _canonicalize_path(self, raw_path: str) -> str:
      normalized = os.path.normpath(raw_path.strip()).replace("\\", "/")
      if normalized.startswith("/") or normalized.startswith("../") or "/../" in normalized:
          raise SecurityError(f"Path traversal detected: '{raw_path}'")
      return normalized
  ```
- **Sensitivity Tiering**:
  - `PUBLIC`: Accessible by all actors.
  - `CONFIDENTIAL`: Requires `files:read_confidential` permission.
  - `RESTRICTED`: Requires `files:read_restricted` permission.

#### 2. Mock Mailbox (`tools/email/service.py`)
- **In-Memory Store**: Holds simulated email messages indexed by folder (`inbox`, `sent`).
- **Seeded Adversarial Payloads**:
  - `email-seed-001`: CEO Fraud demanding urgent wire transfer to external account.
  - `email-seed-002`: System Instruction Override demanding confidential password dump.
- **Inert Data Marking**: Returns emails with `inert_content=True` headers to signal Target Agent not to execute contents.

#### 3. Air-Gapped Web Browser (`tools/browser/service.py`)
- **Simulated DNS & Cache**: Resolves simulated URLs (`company-wiki`, `page-mal-002`, `page-mal-003`).
- **Air-Gap Enforcement**: Any request resolving outside the simulated domain registry raises a deterministic `NetworkAirgapError`.

#### 4. Dual-Auth Payment Gateway (`tools/payments/service.py`)
- **Autonomous Limit**: Hard-coded ceiling of $\$10,000.00$. Any request exceeding this limit triggers `PaymentThresholdExceededError`.
- **Authorization Flow**:
  - `create_payment()`: Creates a `PENDING_AUTHORIZATION` transaction.
  - `authorize_payment()`: Prohibited from autonomous agent execution; requires human SecOps dual-authorization.

---

### 3.4 Target AI Agent Orchestrator (`agents/target/orchestrator.py`)
- **Execution Pipeline**:
  $$\text{Task Request} \longrightarrow \text{Plan Steps} \longrightarrow \text{Policy Check} \longrightarrow \text{Guardian Gate} \longrightarrow \text{Execute Tool} \longrightarrow \text{Summarize}$$
- **Loop Ceiling**: Terminates execution with `BLOCKED` status if step count exceeds `MAX_TOOL_CALLS_PER_TASK = 10`.
- **Prohibited Autonomous Actions**:
  `{"authorize_payment", "filesystem:delete", "database:drop_table", "system:execute_code"}`.
  If the agent proposes any tool matching this set, `PolicyValidator` halts execution before tool invocation.

---

### 3.5 Red Team Adversarial Engine (`agents/redteam/`)
- **Master Attack Registry**: 15 preconfigured classes inheriting from `BaseAttack`.
- **Deterministic Sequencing**:
  ```python
  class AttackPlanner:
      @classmethod
      def get_attacks_for_categories(cls, categories: List[AttackCategory]) -> List[BaseAttack]:
          return [a for a in _ATTACK_REGISTRY if a.category in categories][:MAX_ATTACKS_PER_CAMPAIGN]
  ```
- **Outcome Classification**:
  - `DEFENCE_HELD`: PolicyValidator or Blue Guardian successfully intercepted the payload.
  - `BREACH_LANDED`: Prohibited action succeeded (should be 0 in baseline configuration).

---

### 3.6 Blue Team Guardian & ML Threat Advisory (`agents/guardian/`)
- **Scoring Pipeline (`scorer.py`)**:
  Computes risk score $R \in [0.0, 100.0]$:
  $$R = \min\left(100.0, \sum_{i} w_i \cdot S_i\right)$$
  Where $S_i$ represents active binary/weighted signals and $w_i$ represents signal weights.
- **ML Prompt Injection Classifier (`ml-model/`)**:
  - Trained on adversarial corpora using character & word n-grams ($1 \le n \le 4$).
  - Outputs predicted class probability $P(\text{attack})$ and margin score.
  - Generates `ML_PROMPT_INJECTION_WARNING` signal if $P(\text{attack}) > 0.50$.

---

## 4. Convex Cloud Database & Schema Specification

Convex Cloud acts as the real-time persistence and reactive sync backbone.

### 4.1 Schema Definition (`frontend/convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Attack Scenario Catalog
  attack_catalog: defineTable({
    attack_id: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.string(),
    target_tool: v.string(),
    severity: v.string(),
    expected_outcome: v.string(),
  }).index("by_attack_id", ["attack_id"]),

  // 2. Simulation Campaigns
  campaigns: defineTable({
    campaign_id: v.string(),
    campaign_name: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
    total_attacks: v.number(),
    defences_held: v.number(),
    attacks_landed: v.number(),
    failed_to_trigger: v.number(),
    errors: v.number(),
    categories: v.array(v.string()),
    started_at: v.string(),
    completed_at: v.optional(v.string()),
    summary: v.optional(v.string()),
    attack_results: v.array(v.any()),
  })
    .index("by_campaign_id", ["campaign_id"])
    .index("by_status", ["status"]),

  // 3. Immutable Security Audit Ledger
  audit_logs: defineTable({
    event_id: v.string(),
    timestamp: v.string(),
    actor_id: v.string(),
    role: v.string(),
    tool: v.string(),
    action: v.string(),
    status: v.string(), // "ALLOWED" | "DENIED" | "WARNING"
    resource: v.optional(v.string()),
    details: v.optional(v.any()),
  })
    .index("by_event_id", ["event_id"])
    .index("by_actor", ["actor_id"])
    .index("by_status", ["status"]),

  // 4. Blue Guardian Threat Decisions
  guardian_decisions: defineTable({
    decision_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    verdict: v.string(), // "ALLOW" | "REQUIRE_APPROVAL" | "BLOCK"
    risk_score: v.number(),
    explanation: v.string(),
    signals: v.array(v.any()),
    timestamp: v.string(),
  })
    .index("by_decision_id", ["decision_id"])
    .index("by_task_id", ["task_id"])
    .index("by_verdict", ["verdict"]),

  // 5. Human-in-the-Loop Approvals
  approvals: defineTable({
    approval_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    tool: v.string(),
    action: v.string(),
    status: v.string(), // "PENDING" | "APPROVED" | "REJECTED"
    requested_at: v.string(),
    decided_at: v.optional(v.string()),
    decided_by: v.optional(v.string()),
    rationale: v.optional(v.string()),
  })
    .index("by_approval_id", ["approval_id"])
    .index("by_status", ["status"]),
});
```

### 4.2 Convex Function API Reference
- `catalog:list`: Queries all cataloged attacks.
- `catalog:seed`: Seeds or updates the 15 standard cyber attacks.
- `campaigns:list`: Returns campaigns ordered descending by `_creationTime`.
- `campaigns:save`: Inserts or patches a campaign document.
- `events:recordBatch`: Batch inserts audit log events.
- `guardian:recordDecisionBatch`: Batch inserts Guardian evaluations.
- `guardian:decideApproval`: Approves or rejects a human approval request.

---

## 5. Frontend Architecture & WebGL Visualization

### 5.1 Route Tree & Page Structure
```
frontend/src/app/
├── layout.tsx                     # Root layout with ConvexProvider & ClerkProvider
├── page.tsx                       # Landing page with Hologram Hero, Battlefield preview & Footer
├── (app)/                         # Authenticated application shell
│   ├── layout.tsx                 # App layout with Sidebar, Header & Auth protection
│   ├── arena/page.tsx             # 3D Visual Battlefield & Campaign Orchestration
│   ├── dashboard/page.tsx         # Security metrics, active alerts & 3D Threat Sphere
│   ├── scenarios/page.tsx         # 15-Attack Catalog inspection & payload viewer
│   ├── test-runs/page.tsx         # Historical campaigns & replay telemetry
│   ├── events/page.tsx            # Live event stream & CSV export
│   ├── learning/page.tsx          # Adaptive ML model weights & intent analysis
│   ├── reports/page.tsx           # Compliance summaries & PDF/CSV reporting
│   ├── agents/page.tsx            # Red Team, Target AI & Guardian agent cards
│   └── settings/page.tsx          # API keys, reset mocks & threshold controls
├── sign-in/[[...sign-in]]/page.tsx# Clerk sign-in handler
└── sign-up/[[...sign-up]]/page.tsx# Clerk sign-up handler
```

### 5.2 3D WebGL Battlefield Engine (`BattlefieldMaze3D.tsx`)
- **Render Loop**: Three.js WebGLRenderer rendering at 60 FPS with `ACESFilmicToneMapping`.
- **Camera Perspective**: Isometric camera at `position(0, 16.5, 17.5)` with `lookAt(0, -0.6, 0)`.
- **Dynamic Lighting**:
  - Directional primary light: Electric Violet (`0xa855f7`, intensity: 1.4).
  - Center PointLight: Radiant Purple (`0xc084fc`, intensity: 2.5).
  - Ambient base: Deep Obsidian Violet (`0x190d2e`, intensity: 1.8).
- **Procedural Agents**:
  - `Red Team Mesh`: Hostile crimson agent (`0xff2244`) with dotted laser trail.
  - `Target AI Mesh`: Hexagonal pedestal with floating translucent defense shield emblem (`0xa855f7`).
  - `Blue Guardian Mesh`: Electric indigo defender (`0x818cf8`) with animated spherical wireframe shield dome flaring upon `BLOCKED` status.
- **Node Lerp Physics**:
  Agents smoothly interpolate (`lerp(targetPos, alpha)`) across circuit walls depending on active simulation state (`IDLE`, `ATTACKING`, `DEFENDING`, `BLOCKED`, `BREACHED`).

### 5.3 Theme Design Tokens (`globals.css`)
```css
:root {
  --background: 260 45% 4%;        /* #08050e - Obsidian Black */
  --foreground: 0 0% 98%;
  --card: 265 35% 8%;              /* #120b1c - Card Surface */
  --card-foreground: 0 0% 98%;
  --primary: 265 89% 66%;          /* #a855f7 - Cyber Violet Accent */
  --primary-foreground: 0 0% 100%;
  --border: 265 24% 17%;           /* #281938 - Violet Glass Border */
  --muted-foreground: 260 18% 70%;
}
```

---

## 6. API Interface Contracts

### 6.1 Red Team Endpoints
| Method | Endpoint | Request Model | Response Model | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agents/redteam/campaigns` | `CampaignRequest` | `CampaignResponse` | Launches an adversarial campaign. |
| `GET` | `/api/v1/agents/redteam/campaigns` | Query: `limit`, `offset` | `CampaignListResponse` | Retrieves past campaign history. |
| `GET` | `/api/v1/agents/redteam/campaigns/{id}`| Path: `campaign_id` | `CampaignResponse` | Retrieves detail of a campaign. |
| `GET` | `/api/v1/agents/redteam/attacks/catalog`| None | `List[AttackDescriptor]`| Returns the 15 standard attacks. |

### 6.2 Target Agent Endpoints
| Method | Endpoint | Request Model | Response Model | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agents/target/tasks` | `TaskRequest` | `TaskResponse` | Submits a workflow task to the agent. |
| `GET` | `/api/v1/agents/target/tasks/{id}` | Path: `task_id` | `TaskResponse` | Retrieves execution trace of a task. |

### 6.3 Blue Guardian Endpoints
| Method | Endpoint | Request Model | Response Model | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agents/guardian/evaluate` | `EvaluationRequest` | `GuardianDecisionRecord` | Pre-evaluates a proposed tool call. |
| `POST` | `/api/v1/agents/guardian/approvals/{id}/decide` | `ApprovalDecision` | `ApprovalRecord` | Approves or rejects a paused action. |

### 6.4 Mock Tools Endpoints
| Method | Endpoint | Parameters | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tools/files/read` | `path: str` | `FileContent` | Reads file within sandbox boundaries. |
| `POST` | `/api/v1/tools/email/list` | `folder: str` | `List[EmailMessage]`| Lists inbox messages. |
| `POST` | `/api/v1/tools/browser/open` | `url: str` | `WebPage` | Fetches inert simulated web page. |
| `POST` | `/api/v1/tools/payments/create`| `amount`, `recipient`| `PaymentRecord` | Initiates payment request. |
| `POST` | `/api/v1/tools/audit/reset` | None | `{ "status": "RESET" }`| Resets all mock tools and audit states. |

---

## 7. Security Architecture & Threat Vectors

| Threat ID | Threat Vector | OWASP LLM Ref | AgentShield Architectural Defense |
| :--- | :--- | :--- | :--- |
| **TV-01** | Direct System Prompt Override | LLM01 | Inert content isolation: instructions inside file/email bodies are not ingested as top-level planner instructions. |
| **TV-02** | Indirect Web Prompt Injection | LLM01 | Air-gapped browser treats HTML/forum text as untrusted string literals; secondary actions are rejected. |
| **TV-03** | Unauthorized File Exfiltration | LLM02 / LLM06 | Filesystem `_canonicalize_path` enforces `sandbox/` root; sensitivity checks block `CONFIDENTIAL` / `RESTRICTED` access. |
| **TV-04** | Autonomous Payment Fraud | LLM06 | Prohibited autonomous action filter unconditionally blocks `authorize_payment`; gateway ceiling enforces $\$10,000$ limit. |
| **TV-05** | Unknown System Tool Execution | LLM06 | `PolicyValidator` verifies tool names against static whitelist (`AVAILABLE_TOOLS`); unknown tools are rejected with 100 risk score. |
| **TV-06** | Runaway Execution / Resource Depletion| LLM08 | Orchestrator hard-aborts tasks reaching $N > 10$ tool calls; runaway loop detection halts execution cleanly. |

---

## 8. Deployment, Orchestration & Verification

### 8.1 Unified Local Start Script (`start-all.bat` / `start-all.ps1`)
The platform includes dual single-command startup scripts:
```powershell
# Starts FastAPI backend (port 8000), Convex Dev runner, and Next.js frontend (port 3000)
.\start-all.ps1
```

### 8.2 Build & Test Verification Commands
- **Backend Test Suite**:
  ```bash
  .venv\Scripts\pytest -v tests/
  ```
- **Frontend TypeScript Verification**:
  ```bash
  pnpm --prefix frontend exec tsc --noEmit
  ```
- **Convex Schema Deployment**:
  ```bash
  pnpm --prefix frontend exec convex dev --once
  ```
- **Convex Seeder Execution**:
  ```bash
  pnpm --prefix frontend exec convex run seed:seedAll
  ```

