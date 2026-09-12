# StorSight

## Storage Incident Root-Cause & Operations Intelligence Platform

StorSight is a full-stack portfolio project that demonstrates how a modern web platform connects infrastructure signals — metrics, events, alerts, and incidents — into a unified operational intelligence workflow. Engineers can investigate incidents, correlate events, analyze root causes, assess risk, generate recommendations, record engineer actions, and maintain a complete audit trail.

> **Disclaimer:** StorSight is an independent portfolio and learning project. It is inspired by concepts commonly encountered in enterprise storage operations, infrastructure monitoring, incident management, and troubleshooting. It is not an internal, proprietary, official, or affiliated NetApp product and does not contain proprietary NetApp source code, confidential information, or internal systems. The project is intended to demonstrate software engineering, system design, backend development, database design, operational intelligence concepts, testing, and deployment skills.

---

## Technology Stack

### Backend
| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.x | Application language |
| Flask | 3.1.3 | Web framework / REST API |
| Flask-SQLAlchemy | 3.1.1 | ORM |
| Flask-Migrate | 4.1.0 | Database migrations (Alembic) |
| Flask-CORS | 6.0.5 | Cross-origin resource sharing |
| SQLAlchemy | 2.0.52 | Database abstraction |
| psycopg | 3.3.4 | PostgreSQL adapter |
| python-dotenv | 1.2.3 | Environment configuration |
| Werkzeug | 3.1.8 | Password hashing, WSGI utilities |
| pytest | 8.4.2 | Backend test runner |

**Database:** SQLite for local development — PostgreSQL-ready for production (psycopg included).

### Frontend
| Technology | Version | Role |
|-----------|---------|------|
| Angular | 19.2 | SPA framework |
| TypeScript | 5.7 | Application language |
| RxJS | 7.8 | Reactive programming |
| Karma + Jasmine | 6.4 / 5.6 | Frontend test runner |

---

## Features

### Authentication & Security
- Session-based authentication with secure Flask session cookies
- Password hashing via Werkzeug
- Role-based authorization (ENGINEER, ADMIN, etc.)
- Auth guard protecting all routes — redirects unauthenticated users to `/login`
- HTTP interceptor attaching credentials to every API request and handling 401 session expiry

### Storage Resource Management
- Create, view, update, and delete storage resources
- Resource types (SAN, NAS, etc.) with health and capacity tracking
- Filter resources by status and type

### Metrics
- Record and browse infrastructure performance metrics per resource
- Filter by resource or metric name

### Events
- Record infrastructure events with severity classification (info / warning / error / critical)
- Filter by resource, severity, or event type
- Link events to storage resources

### Alerts
- Create and manage operational alerts
- Severity levels: info / warning / critical
- Status lifecycle: active → resolved
- Inline resolve from the alerts list

### Incident Management
- Create incidents with severity (low / medium / high / critical) and status tracking (open / in\_progress / resolved)
- Assign incidents to users
- Resolve incidents with confirmation
- Correlate related infrastructure events with incidents

### Incident Intelligence (per-incident detail page)
- **Risk Score** — deterministic score (0–100) with classification and contributing factors
- **Root Cause Analysis** — rule-based engine produces categorized explanations with confidence scores
- **Recommendations** — generated recommendations with priority and reason, create new recommendations inline
- **Engineer Actions** — record investigation, diagnosis, remediation, escalation, monitoring, and note actions with optional recommendation links
- **Audit Trail** — full per-incident audit history with action formatting

### Global Audit Logs
- Paginated, filterable view of all audit activity across the platform
- Filter by entity type and action keyword
- Client-side pagination (20 entries per page)

### Dashboard
- Operational overview: resource health distribution, open incident count, active alert count, critical incident count
- Alert severity breakdown, incident severity breakdown
- Recent events, recent incidents, recent audit activity
- Health percentage indicator

---

## Architecture

```
Browser (Angular 19 SPA)
         ↓ HTTP (session cookie, JSON)
Flask REST API  ←→  Flask-SQLAlchemy ORM
         ↓
SQLite (dev) / PostgreSQL (production)
```

### Backend layers
```
app/routes/      ← Flask blueprints, HTTP request/response
app/services/    ← Application logic, validation, business rules
app/models/      ← SQLAlchemy ORM models
app/repositories/ ← Data access layer
app/auth/        ← Authentication decorators
```

### Frontend layers
```
features/        ← Page components (one directory per feature)
core/services/   ← HTTP service layer (one service per API resource)
core/auth/       ← AuthService, AuthGuard, AuthInterceptor
shared/          ← Reusable components and pipes
```

---

## Project Structure

```
storsight/
├── app/
│   ├── auth/               # Auth decorators
│   ├── models/             # SQLAlchemy models
│   ├── repositories/       # Data access layer
│   ├── routes/             # Flask blueprints (REST endpoints)
│   └── services/           # Application services + business rules
├── migrations/             # Alembic database migrations
├── tests/                  # pytest backend tests (279 tests)
├── instance/               # SQLite database files (gitignored)
├── .env.example            # Environment variable template
├── requirements.txt        # Python dependencies
└── storsight-frontend/
    └── src/app/
        ├── core/
        │   ├── auth/       # AuthService, AuthGuard, AuthInterceptor
        │   ├── models/     # TypeScript interfaces
        │   └── services/   # HTTP services
        ├── features/       # Page components
        │   ├── auth/       # Login
        │   ├── dashboard/
        │   ├── storage-resources/
        │   ├── metrics/
        │   ├── events/
        │   ├── alerts/
        │   ├── incidents/  # List + detail with intelligence sections
        │   └── audit-logs/
        ├── layout/         # App shell, sidebar, topbar
        └── shared/         # Reusable components and pipes
```

---

## Local Development

### Prerequisites

- Python 3.x
- Node.js 18+
- npm 9+

### Backend setup

```bash
# Clone the repository
git clone <repository-url>
cd storsight

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Apply database migrations
flask db upgrade

# Start the Flask development server
flask run
```

The API runs at `http://localhost:5000`.

### Environment variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_ORIGIN` | `http://localhost:4200` | Angular dev server origin for CORS |
| `LOG_LEVEL` | `INFO` | Application log level |
| `SESSION_COOKIE_SECURE` | `false` | Set `true` in production (HTTPS only) |
| `SESSION_COOKIE_HTTPONLY` | `true` | Prevent JS access to session cookie |
| `SESSION_COOKIE_SAMESITE` | `Lax` | CSRF protection mode |

### Frontend setup

```bash
cd storsight-frontend

# Install dependencies
npm install

# Start the Angular development server
npm start
```

The frontend runs at `http://localhost:4200`.

---

## Production Deployment

The backend is deployable as a WSGI application through `wsgi.py` and the
included `Procfile`. Use a managed PostgreSQL database, HTTPS, and a managed
SMTP provider in production. Do not run Flask's development server publicly.

### Backend (Render or another Gunicorn host)

1. Configure these environment variables in the hosting provider:

    - `APP_ENV=production`
    - `SECRET_KEY` with a randomly generated value of at least 32 characters
    - `DATABASE_URL=postgresql+psycopg2://...`
    - `FRONTEND_ORIGIN=https://<your-frontend-domain>`
    - `SESSION_COOKIE_SECURE=true`
    - `RATE_LIMIT_STORAGE_URI` using Redis for multi-instance deployments
    - SMTP variables: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_USE_TLS`

2. Deploy with the included start command:

    ```text
    gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app
    ```

3. Run migrations once after deployment:

    ```bash
    flask --app wsgi:app db upgrade
    ```

4. Run the monitoring worker as a separate process. It requires a supported
    adapter configuration and a reachable Redis instance:

    ```bash
    python monitor.py --loop
    ```

     Use `python monitor.py --once` for a deployment smoke test. The current
     supported live adapter is `http_json`, which requires an HTTPS endpoint
     returning validated `total_bytes` and `used_bytes` values. Vendor-specific
     adapters must be added only when the target storage API and credentials
     are available.

5. Bootstrap the first admin once, using environment variables rather than a
    hardcoded password:

    ```bash
    python seed.py
    ```

    Remove or rotate the bootstrap password after the first login.

### Frontend (Vercel or another static host)

Set the production API URL in
`storsight-frontend/src/environments/environment.prod.ts` before building.
Then deploy from `storsight-frontend`:

```bash
npm ci
npm run build
```

Publish `dist/storsight-frontend/browser` and configure SPA fallback to
`index.html`. The deployed frontend origin must exactly match the backend's
`FRONTEND_ORIGIN` value.

### Production checks

- Confirm `GET /health` returns `{"status":"ok"}` for process liveness.
- Confirm `GET /health/ready` returns HTTP `200` with both `database` and
    `redis` marked `ok` before routing traffic to the instance. It returns
    HTTP `503` when either dependency is unavailable.
- Confirm the worker process is running and that monitored resources expose
    `monitoring_state=online`, `last_seen`, and `last_metric_at`. An
    `unconfigured`, `stale`, or `error` state is not healthy telemetry.
- Configure the email provider with valid SMTP credentials and verify the
    sender domain. Publish the provider's SPF and DKIM records, then publish a
    DMARC record (start with `p=none` monitoring and enforce it after observing
    reports).
- Store `SECRET_KEY`, `DATABASE_URL`, SMTP credentials, and
    `RATE_LIMIT_STORAGE_URI` only in the hosting provider's encrypted secret
    store. Rotate them without committing them to the repository.
- Confirm HTTPS is active and session cookies have the `Secure` attribute.
- Confirm login rate limiting uses shared Redis storage when scaled out.
- Confirm SMTP reset emails are delivered without logging reset URLs.
- Confirm the default/bootstrap admin password has been rotated.

---

## Running Tests

### Backend tests

```bash
# From the storsight/ root with virtual environment active
pytest tests/ -q
```

Expected: **279 passed**

### Frontend tests

```bash
cd storsight-frontend

# Single-run (CI mode)
ng test --watch=false --browsers=ChromeHeadless

# Or via npm
npm test -- --watch=false --browsers=ChromeHeadless
```

Expected: **552 passed**

### Frontend build

```bash
cd storsight-frontend
npm run build
```

Expected: **0 errors, 0 warnings**

---

## API Overview

All endpoints require authentication (`@login_required`) except `/api/auth/login`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate and create session |
| `POST` | `/api/auth/logout` | End session |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/health` | Health check |
| `GET/POST` | `/api/storage-resources/` | List / create storage resources |
| `GET/PATCH/DELETE` | `/api/storage-resources/:id` | Get / update / delete resource |
| `GET/POST` | `/api/metrics/` | List / create metrics |
| `GET` | `/api/metrics/:id` | Get metric |
| `GET/POST` | `/api/events/` | List / create events |
| `GET` | `/api/events/:id` | Get event |
| `GET/POST` | `/api/alerts/` | List / create alerts |
| `GET` | `/api/alerts/:id` | Get alert |
| `PATCH` | `/api/alerts/:id/resolve` | Resolve alert |
| `GET/POST` | `/api/incidents/` | List / create incidents |
| `GET` | `/api/incidents/:id` | Get incident |
| `PATCH` | `/api/incidents/:id/resolve` | Resolve incident |
| `PATCH` | `/api/incidents/:id/assign` | Assign incident |
| `GET/POST` | `/api/incidents/:id/events` | List / link correlated events |
| `GET/POST` | `/api/incidents/:id/rca` | List / create root cause analyses |
| `GET` | `/api/incidents/:id/risk` | Get risk score |
| `GET/POST` | `/api/incidents/:id/recommendations` | List / create recommendations |
| `GET/POST` | `/api/incidents/:id/actions` | List / create engineer actions |
| `GET` | `/api/audit-logs/` | List all audit log entries |
| `GET` | `/api/audit-logs/incidents/:id` | List audit logs for an incident |
| `GET/POST` | `/api/roles/` | List / create roles |
| `GET/POST` | `/api/users/` | List / create users |

---

## Test Coverage

### Backend — 279 tests

| Test file | Coverage area |
|-----------|--------------|
| `test_auth.py` | Login, logout, session, authorization |
| `test_storage_resources.py` | CRUD, validation, health |
| `test_metrics.py` | Record and retrieve metrics |
| `test_events.py` | Event lifecycle, filtering |
| `test_alerts.py` | Alert management, resolve workflow |
| `test_incidents.py` | Incident lifecycle, assign, resolve |
| `test_incident_events.py` | Event correlation |
| `test_rca.py` | Root cause analysis rules |
| `test_risk.py` | Risk scoring logic |
| `test_recommendations.py` | Recommendation generation |
| `test_actions.py` | Engineer action recording |
| `test_audit.py` | Audit log recording |
| `test_cors.py` | CORS configuration |
| `test_health.py` | Health endpoint |
| `test_database.py` | Database connectivity |

### Frontend — 552 tests

| Area | Files with specs |
|------|-----------------|
| Auth layer | `auth.service`, `auth.guard`, `auth.interceptor`, `login.component` |
| Core services | `alert`, `audit-log`, `event`, `incident`, `metric`, `storage-resource` |
| Shared pipes | `relative-time`, `severity-color` |
| Dashboard | `dashboard.component` |
| Storage resources | `list`, `detail`, `form` |
| Metrics | `list`, `detail` |
| Events | `list`, `detail` |
| Alerts | `list`, `detail` |
| Incidents | `list`, `detail`, `risk-score-section`, `rca-section`, `recommendations-section`, `engineer-actions-section`, `audit-trail-section` |
| Audit logs | `audit-logs.component` |

---

## Disclaimer

StorSight is an independent portfolio and learning project.

It is inspired by concepts commonly encountered in enterprise storage operations, infrastructure monitoring, incident management, and troubleshooting.

The project is intended to demonstrate software engineering, system design, backend development, database design, operational intelligence concepts, testing, and deployment skills.
