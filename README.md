# Tellwarden

Educational cybersecurity web application: Web Security Scanner & Offline Rule-Based IDS Simulator.

- **Status:** Active development prototype. Implements modular security scanning tools, an offline rule-based IDS simulator, a responsive Streamlit interface with a custom right-side drawer shell, an alternative FastAPI backend and React frontend prototype, sample datasets, and automated test suites.
- **Name status:** `Tellwarden` is a **provisional name, pending clearance**. Domain (.com, .in) and Indian trademark checks are **not done**. The name is not claimed to be legally available or unique. See [`docs/RESEARCH_AND_NAMING.md`](docs/RESEARCH_AND_NAMING.md).
- **Last updated:** 26 October 2026

## What it is

| Module | What it does |
|---|---|
| **A. Web Security Scanner** | Takes a URL you are authorised to test. Checks HTTPS, selected HTTP security headers and basic CORS behaviour with SSRF-safe protections. Shows Pass, Warning or Fail with an explanation, remediation advice and a downloadable report. |
| **B. Rule-Based IDS Simulator** | Reads sample or user-supplied event data (CSV). Applies documented detection rules (brute force, port scan, password spraying). Shows the triggering rule, evidence, severity and recommended response. |

## What it is not

- It is **not** a production security product and **not** a replacement for tools such as OWASP ZAP, Mozilla Observatory or an enterprise SIEM.
- It does **not** use artificial intelligence or machine learning. All detection is fixed, readable rules and simple deterministic checks. There is no model training.
- Module B is an **offline simulation of sample data**. It does not capture packets, does not monitor a network and does not process real-time traffic.
- A passing scan result does **not** mean a website is secure. It means the specific checked settings look correct.
- It uses no paid API and no mandatory database.

## Technology Stack

- **Core & Backend:** Python 3.10+, FastAPI, httpx, PyYAML, pandas, pydantic.
- **Streamlit Application:** Streamlit 1.66+, custom Streamlit Components v2 responsive shell, self-hosted typography.
- **Frontend Prototype:** React, TypeScript, Vite, TailwindCSS (for standalone SPA prototype).
- **Typography:** Self-hosted **DM Sans** (headings and interface) and **IBM Plex Mono** (technical values).

## Design System

- **Palette:** Four core colours: Rampart Navy `#1B365D`, Slate `#475569`, Signal Teal `#0F766E`, Paper `#F8FAFC`. Three status colours: Pass `#166534`, Warning `#B45309`, Fail `#B91C1C`.
- **Navigation:** Top custom header with top-right hamburger toggle; right-side drawer (push on desktop $\ge 1101\text{px}$, overlay with backdrop on $\le 1100\text{px}$); active filled white pill.
- **Style Rules:** No gradients, no drop-shadow glow, no emojis, no AI-themed visuals. All icons are 20px monochrome SVG line icons. WCAG AA accessible contrast across all surfaces.

## Documentation index

| File | Purpose |
|---|---|
| `README.md` | This overview and index |
| [`docs/RESEARCH_AND_NAMING.md`](docs/RESEARCH_AND_NAMING.md) | Name candidates, evidence, scoring, what could not be verified |
| [`docs/PRD.md`](docs/PRD.md) | Product requirements with IDs and acceptance criteria |
| [`docs/TRD.md`](docs/TRD.md) | Architecture, data flow, schemas, SSRF-safe design, diagrams |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Palette, typography, layout and component rules |
| [`docs/SECURITY_AND_ETHICS.md`](docs/SECURITY_AND_ETHICS.md) | Authorised-use policy, scanner safety controls, privacy, limits |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Test cases mapped to requirements |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | Phased build plan and definition of done |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | Planned folder and file tree with the purpose of each file |
| [`docs/DECISIONS_AND_ASSUMPTIONS.md`](docs/DECISIONS_AND_ASSUMPTIONS.md) | Decisions, assumptions, open questions, approval checklist |
| [`docs/REFERENCES.md`](docs/REFERENCES.md) | Sources, access dates and the claims each supports |

## Evidence tags used across the documents

- **[Verified]** seen in a source during research on 25 Oct 2026.
- **[Docs, not re-fetched]** standard official documentation that the research could not reopen. Confirm against the official page before relying on it.
- **[Recommendation]** a design choice proposed in these documents.
- **[Assumption]** needs your confirmation.

## Run locally

### 1. Streamlit Application

```bash
pip install -r requirements.txt
streamlit run app.py
```
This launches the Tellwarden interface at `http://localhost:8501` featuring the custom header, right-side drawer navigation, and self-hosted typography.

### 2. Standalone FastAPI Backend & React Frontend (Prototype)

Backend (FastAPI, port 8000):
```bash
pip install -r requirements-dev.txt
uvicorn tellwarden.api:app --app-dir src --port 8000
```

Frontend (React + Vite, port 5173):
```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

API endpoints: `GET /api/health`, `GET /api/rules`, `GET /api/ids/samples`, `POST /api/scan`, `POST /api/ids/run`. Interactive OpenAPI docs at `http://localhost:8000/api/docs`.

### 3. Automated Tests

```bash
pytest
```
Runs the full test suite including unit tests, contrast validation (WCAG AA), documentation consistency checks, and Playwright Chromium E2E tests.

## Security & Ethical Note

Tellwarden is an educational simulation workspace. Scan only targets you own or have explicit authorization to test. SSRF protection controls are active locally in `NetGuard`. Results do not represent a commercial security guarantee.
