# EdgePulse — AI-Powered Internet Incident Investigator

EdgePulse is a specialized, production-grade cybersecurity and SRE backend that investigates website outages, performance bottlenecks, and infrastructure anomalies using controlled LLM triage and strict allowlisted diagnostic tools.

---

## ⚡ Core Architecture

```text
User / Frontend
      │
      ▼
FastAPI API Layer
      │
      ├──── Incident API (POST /api/incidents, GET /api/incidents/{id})
      ├──── Investigation Orchestrator (Triage -> Schedule -> Execute -> Aggregate)
      ├──── Diagnostic Tools Registry (dns, http, latency, security_headers, https)
      ├──── SSRF Protection & URL Validator (RFC 1918 / Cloud Metadata Filter)
      ├──── LLM Provider Abstraction (OpenAI / Cloudflare Workers AI)
      ├──── AI Root-Cause Analysis Engine (Fact vs. Inference Verification)
      ├──── Interactive SRE Copilot (POST /api/incidents/{id}/chat)
      └──── Database (SQLAlchemy 2.x Async — SQLite / PostgreSQL)
```

### Controlled Safety Flow

The LLM is **not** a generic chatbot and **never** executes arbitrary code or arbitrary shell commands.

1. **User input**: Target URL + Problem description.
2. **SSRF Filter**: Verifies target URL scheme, port (80/443), and prevents access to private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254`).
3. **AI Triage**: LLM classifies incident type & severity, and selects tools strictly from the allowlist (`dns`, `http`, `latency`, `security_headers`, `https`).
4. **Diagnostic Execution**: Orchestrator runs probes concurrently with individual error isolation.
5. **AI Root-Cause Analysis**: LLM evaluates collected telemetry, isolates facts from inferences, assigns analytical confidence, and synthesizes remediation steps.
6. **Follow-up Chat**: SRE Copilot answers questions bounded strictly by the incident's telemetry evidence.

---

## 📁 Folder Structure

```text
edgepulse/
│
├── app/
│   ├── main.py                     # FastAPI application entrypoint & error handlers
│   │
│   ├── api/                        # API routes
│   │   ├── incidents.py            # Incident creation, status, timeline, results
│   │   ├── chat.py                 # Follow-up SRE Copilot chat
│   │   ├── diagnostics.py          # Replay & manual tool test
│   │   ├── stats.py                # Platform health & incident metrics
│   │   └── health.py               # Liveness and version endpoint
│   │
│   ├── core/                       # Core configuration
│   │   ├── config.py               # Pydantic v2 Settings (.env)
│   │   ├── logging.py              # Structured JSON logging & secret sanitization
│   │   └── security.py             # Rate limiting & token validation
│   │
│   ├── db/                         # Database layer
│   │   ├── database.py             # SQLAlchemy 2.x async engine & session
│   │   ├── models.py               # ORM Models (Incident, Step, ToolResult, Analysis, Message)
│   │   └── repositories.py         # Data access repositories
│   │
│   ├── schemas/                    # Pydantic data validation schemas
│   │   ├── incident.py             # Incident create & list schemas
│   │   ├── investigation.py        # Triage schema with allowlist validation
│   │   ├── diagnostics.py          # Tool results schemas
│   │   ├── analysis.py             # Root cause analysis schema
│   │   └── chat.py                 # Chat message schemas
│   │
│   ├── services/                   # Application business logic
│   │   ├── llm/                    # LLM Provider Abstraction
│   │   │   ├── base.py             # Abstract LLMProvider interface
│   │   │   ├── openai_provider.py  # OpenAI / OpenAI-compatible provider
│   │   │   ├── cloudflare_provider.py # Cloudflare Workers AI provider
│   │   │   └── factory.py          # LLM provider factory
│   │   │
│   │   ├── investigation_service.py # Core investigation orchestrator
│   │   ├── analysis_service.py     # Analysis & replay engine
│   │   ├── chat_service.py         # Evidence-bounded conversational engine
│   │   └── report_service.py       # Full incident report generator
│   │
│   ├── tools/                      # Diagnostic probes (Strict Allowlist)
│   │   ├── base.py                 # DiagnosticTool base class
│   │   ├── registry.py             # Tool registry & allowlist enforcer
│   │   ├── dns.py                  # DoH via Cloudflare 1.1.1.1
│   │   ├── http.py                 # Safe HTTP response & header inspector
│   │   ├── latency.py              # 5-sample latency benchmark & classifier
│   │   ├── security_headers.py     # 6-header defensive security check
│   │   └── https.py                # HTTPS reachability & redirect validator
│   │
│   ├── prompts/                    # System & User prompt templates
│   │   ├── triage.py               # Triage prompt & schema instructions
│   │   ├── investigation.py        # Investigation sequence prompt
│   │   ├── analysis.py             # Root cause analysis prompt
│   │   └── followup.py             # Follow-up evidence prompt
│   │
│   └── utils/                      # Helper utilities
│       ├── url_validator.py        # SSRF, private IP, and port validator
│       ├── latency.py              # Latency math & classification
│       ├── serialization.py        # Safe JSON serializer
│       └── errors.py               # Domain-specific exceptions
│
├── tests/                          # Automated Pytest Suite
│   ├── conftest.py                 # In-memory async SQLite fixtures
│   ├── test_url_validator.py       # SSRF & private IP blocking tests
│   ├── test_tools.py               # Diagnostic tools unit tests
│   ├── test_llm_schemas.py         # Pydantic schema validation tests
│   ├── test_investigation_workflow.py # Full orchestrator execution test
│   └── test_api_endpoints.py       # API route integration tests
│
├── .env.example                    # Template environment variables
├── requirements.txt                # Python package dependencies
├── Dockerfile                      # Production Docker container
├── docker-compose.yml              # Multi-container orchestration (Backend + Postgres)
└── README.md                       # Documentation
```

---

## 🚀 Quickstart & Local Installation

### 1. Prerequisites
- Python 3.12+
- `pip` and virtual environment support

### 2. Setup Virtual Environment

```bash
cd edgepulse

# Create virtual environment
python -m venv .venv

# Activate on Windows:
.venv\Scripts\activate

# Activate on macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy template
cp .env.example .env
```

Edit `.env`:
```env
DEMO_MODE=false
DATABASE_URL=sqlite+aiosqlite:///./edgepulse.db
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

> **Tip:** If you do not have an API key right now, set `DEMO_MODE=true` to run with deterministic mock diagnostics and analysis without calling external services!

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Automated Tests

Run all unit, integration, and SSRF security tests with `pytest`:

```bash
pytest -v
```

Tests run in-memory without requiring external API keys or live network connections.

---

## 🔒 Security Model & SSRF Protection

EdgePulse implements a zero-trust network boundary for all diagnostic requests:

| Security Rule | Enforcement |
|---|---|
| **Allowed Schemes** | `http://` and `https://` only (blocks `file://`, `ftp://`, `gopher://`, `data://`) |
| **Allowed Ports** | `80` and `443` only (configurable via `ALLOWED_PORTS`) |
| **Private IP Subnets Blocked** | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `100.64.0.0/10` |
| **Cloud Metadata Blocked** | `169.254.169.254` (AWS, GCP, Azure, OpenStack instance metadata) |
| **Prohibited Hostnames** | `localhost`, `0.0.0.0`, `::1`, `*.internal`, `*.local`, `*.corp` |
| **DNS Rebinding Prevention** | Validates resolved IPv4/IPv6 socket addresses prior to every outbound request |
| **Redirect Safety** | Re-validates target address against SSRF rules at every step of HTTP redirects |
| **Secret Sanitization** | Automatic redaction of Authorization tokens, API keys, and passwords in JSON logs |

---

## 📡 API Reference & Example Requests

### 1. Create and Start Investigation
`POST /api/incidents`

```json
{
  "url": "https://example.com",
  "problem": "Users report that the checkout API returns intermittent 504 gateway timeouts."
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "incident_id": "INC-20260919-4821",
  "status": "created",
  "message": "Incident created and investigation queued."
}
```

### 2. Get Incident Status & Report
`GET /api/incidents/{incident_id}`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "incident": {
      "id": "INC-20260919-4821",
      "url": "https://example.com",
      "type": "latency",
      "severity": "high",
      "status": "completed",
      "confidence": 0.84
    },
    "analysis": {
      "summary": "The website is reachable and DNS resolves, but exhibits elevated HTTP response latency.",
      "root_cause": "Possible origin performance degradation or database connection contention",
      "confidence": 0.84,
      "evidence": [
        "DNS resolution completed in 45ms across Cloudflare 1.1.1.1",
        "HTTP response time observed at 1,820ms (P99 spike)",
        "HTTPS TLS 1.3 handshake successful",
        "Security headers score 5/6 (Permissions-Policy omitted)"
      ],
      "recommendations": [
        "Investigate origin server CPU utilization and connection pool limits",
        "Review database query execution plans for slow queries",
        "Deploy temporary Edge Cache-Everything rule (120s TTL) on Cloudflare to shed load"
      ],
      "limitations": [
        "Origin server internals and database query logs were not directly inspected"
      ]
    }
  }
}
```

### 3. Ask Follow-up Questions (AI SRE Copilot)
`POST /api/incidents/{incident_id}/chat`

```json
{
  "message": "Why is the website slow?"
}
```

**Response (`200 OK`):**
```json
{
  "incident_id": "INC-20260919-4821",
  "reply": "Based on the collected evidence, the 1,820ms response time is concentrated at the origin web service. DNS resolution (45ms) and edge routing are healthy, which isolates the issue to backend server processing or database contention.",
  "role": "assistant",
  "created_at": "2026-09-23T15:45:00Z"
}
```

### 4. Replay & Benchmark Comparison
`POST /api/incidents/{incident_id}/replay`

**Response (`200 OK`):**
```json
{
  "incident_id": "INC-20260919-4821",
  "timestamp": "2026-09-23T15:46:00Z",
  "comparisons": [
    {
      "metric": "HTTP Response Time",
      "previous": "1820.0ms",
      "current": "820.0ms",
      "change": "-1000.0ms"
    },
    {
      "metric": "P99 Latency Benchmark",
      "previous": "1820.0ms",
      "current": "820.0ms",
      "change": "-1000.0ms"
    }
  ],
  "new_results": []
}
```

---

## 🐳 Docker Deployment

### Run with Docker Compose (FastAPI + PostgreSQL):

```bash
docker-compose up -d --build
```

Access the service at `http://localhost:8000`.

---

## 📄 License
MIT License. Built for production-ready cybersecurity and SRE incident investigation.
