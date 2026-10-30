# AgentShield AI

**Autonomous Multi-Agent Cybersecurity Defence System (Red Team vs Blue Team)**

AgentShield AI is an intelligent cybersecurity simulation platform where autonomous AI agents engage in controlled adversarial scenarios (Red Team offensive attacks vs Blue Team defensive detection and mitigation) within safe, sandboxed mock environments.

---

## Architecture Overview (Phase 1: Backend Foundation)

```
AgentShield-AI/
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules (protects secrets, caches, artifacts)
├── pyproject.toml             # Python packaging and project configuration
├── requirements.txt           # Minimal, pinned Python dependencies
├── README.md                  # Project documentation
├── backend/
│   ├── __init__.py
│   └── app/
│       ├── __init__.py
│       ├── main.py            # FastAPI application entry point & middleware pipeline
│       ├── core/              # Core configuration, logging, and error handling
│       │   ├── __init__.py
│       │   ├── config.py      # Pydantic BaseSettings environment management
│       │   ├── logging.py     # Structured JSON logging & secret redaction
│       │   └── exceptions.py  # Centralized exception handlers & custom errors
│       ├── api/               # API Routing Layer
│       │   ├── __init__.py
│       │   └── v1/            # API Version 1
│       │       ├── __init__.py
│       │       ├── router.py  # Master API v1 router
│       │       └── endpoints/
│       │           ├── __init__.py
│       │           └── health.py # Health check endpoints
│       ├── models/            # Domain models and schemas (Phase 2+)
│       ├── security/          # Guardrails and policy enforcement (Phase 2+)
│       ├── services/          # Business logic and coordination (Phase 2+)
│       ├── tools/             # Mock cyber environment tools (Phase 3+)
│       └── agents/            # Red Team and Blue Team agents (Phase 4+)
├── ml-model/                  # Prompt injection / threat classification models
├── docs/                      # Architectural designs and specs
└── tests/
    ├── __init__.py
    ├── conftest.py            # Pytest fixtures and TestClient configuration
    ├── unit/
    │   ├── __init__.py
    │   ├── test_health.py     # Health endpoint unit tests
    │   ├── test_config.py     # Configuration unit tests
    │   └── test_exceptions.py # Exception handling unit tests
    └── integration/
        ├── __init__.py
        └── test_api_v1.py     # API v1 integration tests
```

---

## Core Features Implemented

1. **Modular FastAPI Architecture**: Scalable application layout separating API endpoints, core configuration, exceptions, models, and services.
2. **Settings & Configuration**: Environment variable management using `pydantic-settings` with validated defaults and `.env` loading.
3. **Structured Application Logging**: High-performance JSON logging with automatic secret masking/redaction (e.g., passwords, API keys, bearer tokens) and latency tracking.
4. **Centralized Exception Handling**: Standardized error responses (`{"success": false, "error": {"code": ..., "message": ...}}`) preventing internal information leakage.
5. **API Versioning**: Scalable `/api/v1` router structure ready for future endpoints.
6. **Health Checks**: Operational verification at `GET /health` and `GET /api/v1/health`.
7. **Security Defaults**: Safe localhost bindings, CORS configuration, no hardcoded secrets, and all future actions confined to isolated mock environments.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Virtual environment (`venv`)

### 1. Clone & Set Up Virtual Environment

```bash
# Clone the repository
git clone <repo-url>
cd AgentShield-AI

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate virtual environment (Linux / macOS)
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy `.env.example` to create your local `.env`:

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Default configuration in `.env.example`:
```env
APP_NAME=AgentShield-AI
APP_ENV=development
DEBUG=false
API_V1_PREFIX=/api/v1

HOST=127.0.0.1
PORT=8000

DATABASE_URL=sqlite:///./agentshield.db
MODEL_PATH=ml-model/artifacts/prompt_injection_model.joblib
LOG_LEVEL=INFO
```

### 4. Running the Backend Server

Start the server using Uvicorn:

```bash
# Using uvicorn directly
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Or using python module
python -m backend.app.main
```

Once running:
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Root Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **API v1 Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## Testing

Run the test suite with `pytest`:

```bash
pytest
```

For verbose output:

```bash
pytest -v
```

---

## Security Principles

- **Zero Secret Exposure**: Secrets and sensitive headers are never logged or returned to clients.
- **Environment Isolation**: All simulations and tools operate strictly in mock environments; no real external credentials, browser sessions, or filesystem mutations outside the sandbox.
- **Fail-Safe Defaults**: Non-debug mode suppresses internal stack traces in client responses.

