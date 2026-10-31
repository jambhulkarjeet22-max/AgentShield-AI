# Agentra AI — Frontend Application

Production-quality Next.js App Router frontend for **Agentra — An Adaptive AI Security Testing Platform featuring a Futuristic 3D Cyber Battlefield**.

---

## 1. Technology Stack

* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript (Strict typing)
* **Styling**: Tailwind CSS & shadcn/ui design tokens
* **3D Cyber Arena**: Three.js WebGL interactive 3D battlefield
* **Icons**: Lucide React
* **Charts**: Recharts
* **State & Authentication**: React Context with LocalStorage session persistence & dynamic `X-API-Key` headers

---

## 2. Directory Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (app)/                       # Authenticated shell layout
│   │   │   ├── layout.tsx               # App layout with Sidebar & Header
│   │   │   ├── dashboard/page.tsx       # Defense overview & metrics
│   │   │   ├── arena/page.tsx           # 3D Cyber Arena battlefield & simulation
│   │   │   ├── agents/page.tsx          # Agent Lab (Target, Red, Blue)
│   │   │   ├── scenarios/page.tsx       # Attack catalog explorer & single-runner
│   │   │   ├── test-runs/page.tsx       # Campaign history & timeline
│   │   │   ├── learning/page.tsx        # Adaptive benchmarks & ML metrics
│   │   │   ├── events/page.tsx          # Audit ledger & security events
│   │   │   ├── reports/page.tsx         # Analytical reports & CSV exporter
│   │   │   └── settings/page.tsx        # Theme, API key & simulation reset
│   │   ├── login/page.tsx               # Sign in with actor presets or API key
│   │   ├── register/page.tsx            # Operator profile registration
│   │   ├── forgot-password/page.tsx     # Mock credentials reference
│   │   ├── layout.tsx                   # Root HTML & Providers layout
│   │   ├── globals.css                  # Tailwind styles & theme variables
│   │   └── page.tsx                     # Public product landing page
│   ├── components/
│   │   ├── arena/
│   │   │   └── Battlefield3D.tsx        # Three.js 3D Cyber Battlefield
│   │   ├── layout/
│   │   │   ├── Header.tsx               # Search, notifications, theme, actor switcher
│   │   │   └── Sidebar.tsx              # Responsive navigation & collapse
│   │   └── ui/                          # Button, Badge, Card, Modal, JSONViewer
│   ├── context/
│   │   ├── AuthContext.tsx              # Mock actor session & API key management
│   │   └── ThemeContext.tsx             # Dark / Light theme toggle
│   ├── services/
│   │   ├── api-client.ts                # Typed HTTP client with X-API-Key
│   │   ├── auth-service.ts              # Preconfigured actors & validation
│   │   ├── agent-service.ts             # Target Agent task API calls
│   │   ├── scenario-service.ts          # Attack catalog API calls
│   │   ├── test-run-service.ts          # Campaign launch & history
│   │   ├── guardian-service.ts          # Blue Guardian decisions & approvals
│   │   ├── event-service.ts             # Audit logs querying
│   │   ├── tool-service.ts              # Mock tools & environment reset
│   │   ├── learning-service.ts          # ML metrics integration
│   │   └── report-service.ts            # CSV export utility
│   ├── types/
│   │   └── index.ts                     # Mirror of all FastAPI backend schemas
│   └── lib/
│       └── utils.ts                     # Tailwind class merge & date formatters
├── next.config.mjs                      # Rewrites proxying /api and /health to port 8000
├── tailwind.config.ts                   # Cyber theme & shadcn palette
├── tsconfig.json                        # Strict TypeScript configuration
└── package.json                         # Dependencies & scripts
```

---

## 3. Running the Frontend

### Development Mode
```powershell
cd frontend
pnpm run dev
```
*(Runs on [http://localhost:3000](http://localhost:3000))*.

### Production Build
```powershell
cd frontend
pnpm run build
pnpm run start
```

---

## 4. Backend Integration & Configuration

By default, `next.config.mjs` proxies `/api/:path*` and `/health` to `http://127.0.0.1:8000`.

To point to a different backend server, create a `.env.local` file inside `frontend/`:
```env
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

---

## 5. Mock Actor Directory & Authentication

In the top-right header dropdown or on the login page:

| Actor | Role | Mock Key | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `ADMIN` | `mock-key-admin-secret-7701` | Full universal access, approvals, resets |
| **Security Analyst** | `SECURITY_ANALYST` | `mock-key-analyst-secret-5502` | Red Team campaigns, audit review |
| **Enterprise Employee** | `EMPLOYEE` | `mock-key-employee-secret-3303` | Target agent tasks, mock tool creation |
| **Guest** | `GUEST` | `mock-key-guest-secret-1104` | Public sandbox assets only |
| **Untrusted Agent** | `UNTRUSTED_AGENT` | `mock-key-untrusted-agent-0000` | Simulation sandbox |

