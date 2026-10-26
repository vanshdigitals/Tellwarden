# Project Structure

Product: Tellwarden (provisional name, pending clearance)
Date: 25 October 2026
Related: `TRD.md` sections 3 and 4

**Status legend:** `exists` means the file is present in this repository now. `planned` means it will be created during development. **No application source file exists yet.**

## 1. Planned tree

```
tellwarden/
├── README.md                          exists
├── RESEARCH_AND_NAMING.md             exists
├── PRD.md                             exists
├── TRD.md                             exists
├── DESIGN_SYSTEM.md                   exists
├── SECURITY_AND_ETHICS.md             exists
├── TEST_PLAN.md                       exists
├── IMPLEMENTATION_PLAN.md             exists
├── PROJECT_STRUCTURE.md               exists
├── DECISIONS_AND_ASSUMPTIONS.md       exists
├── REFERENCES.md                      exists
│
├── app.py                             planned
├── requirements.txt                   planned
├── requirements-dev.txt               planned
├── pyproject.toml                     planned
├── LICENSE                            planned
├── .gitignore                         planned
│
├── .streamlit/
│   └── config.toml                    planned
│
├── static/
│   ├── favicon.svg                    planned
│   ├── favicon.png                    planned
│   └── fonts/
│       ├── DMSans-Regular.woff2       planned
│       ├── DMSans-Medium.woff2        planned
│       ├── DMSans-SemiBold.woff2      planned
│       ├── IBMPlexMono-Regular.woff2  planned
│       └── OFL.txt                    planned
│
├── rules/
│   └── default_rules.yaml             planned
│
├── data/
│   └── sample_events/
│       ├── brute_force.csv            planned
│       ├── password_spraying.csv      planned
│       ├── port_scan.csv              planned
│       └── mixed_normal.csv           planned
│
├── src/
│   └── tellwarden/
│       ├── __init__.py                planned
│       ├── config.py                  planned
│       ├── scanner/
│       │   ├── __init__.py            planned
│       │   ├── url_validator.py       planned
│       │   ├── net_guard.py           planned
│       │   ├── http_client.py         planned
│       │   ├── checks_https.py        planned
│       │   ├── checks_headers.py      planned
│       │   ├── checks_cors.py         planned
│       │   └── orchestrator.py        planned
│       ├── ids/
│       │   ├── __init__.py            planned
│       │   ├── events.py              planned
│       │   ├── rule_loader.py         planned
│       │   └── engine.py              planned
│       ├── reporting/
│       │   ├── __init__.py            planned
│       │   ├── models.py              planned
│       │   ├── exporters.py           planned
│       │   └── templates/
│       │       ├── report.html.j2     planned
│       │       └── report.md.j2       planned
│       └── ui/
│           ├── __init__.py            planned
│           ├── nav.py                 planned
│           ├── shell.py               planned
│           ├── theme.py               planned
│           ├── components.py          planned
│           ├── styles/
│           │   ├── shell.css          planned
│           │   └── shell.js           planned
│           └── views/
│               ├── overview.py        planned
│               ├── web_scanner.py     planned
│               ├── ids_simulator.py   planned
│               ├── rules_guide.py     planned
│               └── about.py           planned
│
└── tests/
    ├── unit/
    │   ├── test_url_validator.py      planned
    │   ├── test_net_guard.py          planned
    │   ├── test_checks_https.py       planned
    │   ├── test_checks_headers.py     planned
    │   ├── test_checks_cors.py        planned
    │   ├── test_rule_engine.py        planned
    │   ├── test_events.py             planned
    │   ├── test_rule_loader.py        planned
    │   ├── test_exporters.py          planned
    │   └── test_contrast.py           planned
    ├── integration/
    │   ├── test_scanner_local_server.py   planned
    │   ├── test_http_limits.py            planned
    │   ├── test_ui_scanner_flow.py        planned
    │   └── test_ui_ids_flow.py            planned
    ├── docs/
    │   └── test_doc_consistency.py    planned
    └── fixtures/
        ├── csv/                       planned
        └── responses/                 planned
```

## 2. Purpose of each file

### Documentation (exists)

| File | Purpose |
|---|---|
| `README.md` | Overview, scope, honest limits, status and documentation index |
| `RESEARCH_AND_NAMING.md` | Name candidates, evidence, scoring, what could not be verified |
| `PRD.md` | What to build and why, with requirement IDs and acceptance criteria |
| `TRD.md` | How to build it, with architecture, schemas and the SSRF-safe design |
| `DESIGN_SYSTEM.md` | Colours, fonts, spacing and component rules |
| `SECURITY_AND_ETHICS.md` | Authorised-use policy and security requirements SEC-01 to SEC-18 |
| `TEST_PLAN.md` | Test cases and the requirement-to-test mapping |
| `IMPLEMENTATION_PLAN.md` | Phased plan and definition of done |
| `PROJECT_STRUCTURE.md` | This file |
| `DECISIONS_AND_ASSUMPTIONS.md` | Decisions, assumptions, open questions, approval checklist |
| `REFERENCES.md` | Sources and the claims they support |

### Root and configuration (planned)

| File | Purpose |
|---|---|
| `app.py` | Streamlit entry point. Sets up navigation and loads the theme. No business logic |
| `requirements.txt` | Exact pinned runtime dependencies |
| `requirements-dev.txt` | Test and audit tools (pytest, pytest-cov, respx, pip-audit, ruff) |
| `pyproject.toml` | Package metadata and tool settings (pytest, ruff, coverage) |
| `LICENSE` | Open-source licence. Choice pending (decision D-13) |
| `.gitignore` | Ignores virtual environments, caches, coverage output |
| `.streamlit/config.toml` | Theme colours and fonts, upload limit, static serving |
| `static/fonts/*` | Self-hosted DM Sans and IBM Plex Mono WOFF2 files and the OFL licence text |
| `rules/default_rules.yaml` | The seven default detection rules as data |
| `data/sample_events/*.csv` | Synthetic demo data with documentation-range IP addresses |

### Source modules (planned)

| File | Purpose |
|---|---|
| `config.py` | Read and bound the environment variables. No switch for the address blocklist |
| `scanner/url_validator.py` | Normalise and validate URLs (SEC-01, SEC-02) |
| `scanner/net_guard.py` | Resolve names and classify addresses. Injectable resolver for tests (SEC-03, SEC-04) |
| `scanner/http_client.py` | Guarded httpx requests, manual redirects, timeouts, request budget (SEC-05 to SEC-10) |
| `scanner/checks_https.py` | HTTPS-01 to HTTPS-04 |
| `scanner/checks_headers.py` | HDR-01 to HDR-11 |
| `scanner/checks_cors.py` | CORS-01 to CORS-07 |
| `scanner/orchestrator.py` | Runs the scan sequence, enforces budget and deadline, builds the scan result |
| `ids/events.py` | Load and validate CSV and manual events, parse timestamps |
| `ids/rule_loader.py` | Parse and validate the YAML rules and bounds |
| `ids/engine.py` | Evaluate the four rule types, merge windows, build findings |
| `reporting/models.py` | Data classes for the schemas in `TRD.md` section 11 |
| `reporting/exporters.py` | JSON, Markdown, HTML and CSV export with autoescape and CSV neutralisation |
| `reporting/templates/*` | Jinja2 templates for HTML and Markdown reports |
| `ui/theme.py` | Apply theme values that `config.toml` cannot express |
| `ui/components.py` | Status badge, banner, summary row, evidence table |
| `ui/views/*` | One file per page: Overview, Web Scanner, IDS Simulator, Rules Guide, About and Limits |

### Tests (planned)

| Path | Purpose |
|---|---|
| `tests/unit/*` | Fast tests for each module, table-driven where possible |
| `tests/integration/*` | Local-server scanner tests, HTTP limit tests, Streamlit AppTest flows |
| `tests/docs/test_doc_consistency.py` | TC-DOC-01 to TC-DOC-03: banned claims, colours and fonts |
| `tests/fixtures/*` | CSV and response fixtures for rules, errors and hostile content |

## 3. Layout rules

- Security-critical code stays in `scanner/url_validator.py` and `scanner/net_guard.py`. Nothing else may make an outbound request.
- Engines (`scanner`, `ids`, `reporting`) never import Streamlit. Only `ui` and `app.py` do.
- One new dependency needs a written reason in `DECISIONS_AND_ASSUMPTIONS.md`.
- No application code is written until the approvals in `DECISIONS_AND_ASSUMPTIONS.md` are complete.
- Documentation stays at the repository root while the project is small. A `docs/` folder can be introduced later if needed.
