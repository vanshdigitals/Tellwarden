# Implementation Plan

Product: Tellwarden (provisional name, pending clearance)
Version: 0.1 draft for approval
Date: 25 October 2026
Related: `PRD.md`, `TRD.md`, `TEST_PLAN.md`, `PROJECT_STRUCTURE.md`
Status: not started. No development begins until the approvals in `DECISIONS_AND_ASSUMPTIONS.md` are complete.

## 1. Principles

1. **Security core first.** The URL validator and network guard are built and tested before any code makes a request.
2. **Tests with the code.** Each phase writes its tests in the same phase. A phase is not done until its tests pass.
3. **Small steps.** Each phase ends in a working, demonstrable state.
4. **Reuse.** Shared models, badges and exporters are written once and used by both modules.
5. **No scope creep.** Anything outside `PRD.md` section 16 waits until after the MVP.

## 2. Priorities

| Priority | Items |
|---|---|
| Must | Network guard, URL validator, scanner checks, consent and cooldown, scan reports, IDS engine with seven rules, samples, findings view, Rules Guide, honesty banners, theme and fonts, core tests |
| Should | Manual event form, adjustable rule parameters, Markdown and HTML reports, accessibility manual checks, `pip-audit` |
| Could | Pinned-IP connection (D-10), extra samples, dark mode |
| Later | PDF export, deployment, history, extra checks (see `PRD.md` section 20) |

## 3. Phases

Effort is a rough guide **[Assumption]**: S about 3 hours or less, M about 4 to 8 hours, L about 9 to 16 hours.

| Phase | Name | Effort | Depends on |
|---|---|---|---|
| 0 | Approval and clearance | S | None |
| 1 | Scaffold, theme and navigation | M | 0 |
| 2 | Security core | M | 1 |
| 3 | Scanner engine and checks | L | 2 |
| 4 | Scanner interface and reports | M | 3 |
| 5 | IDS engine and samples | L | 1 |
| 6 | IDS interface and Rules Guide | M | 5 |
| 7 | Hardening and acceptance | M | 4, 6 |
| 8 | Optional: hardening and deployment | M | 7 |

Phase 5 depends only on Phase 1, so the IDS module can be built before or in parallel with the scanner. With one developer, the planned order is 2, 3, 4, then 5, 6, because the scanner carries the highest risk.

### Phase 0: Approval and clearance

**Tasks**

- Review and approve the name, PRD, TRD and design system.
- Do the manual domain and trademark checks (`RESEARCH_AND_NAMING.md` section 7). If the name fails, use the fallback and update all documents.
- Decide the open items in `DECISIONS_AND_ASSUMPTIONS.md` (licence, Python version, D-10).

**Done when:** all approval boxes are ticked and the name status is recorded.

### Phase 1: Scaffold, theme and navigation

**Tasks**

- Create the repository structure from `PROJECT_STRUCTURE.md`.
- Pin dependencies. Record versions in the decision log.
- Add `config.toml` with the four colours, status handling and IBM Plex self-hosting with the OFL licence file.
- Build `app.py` navigation and five placeholder pages with the shared banner and badge components.
- Set up pytest, coverage and the documentation consistency test (TC-DOC-01 to TC-DOC-03).

**Done when:** `streamlit run app.py` shows all five pages with the theme and self-hosted fonts. TC-A11Y-01, TC-DOC-02 and TC-DOC-03 pass. TC-SEC-02 shows no external requests.

### Phase 2: Security core

**Tasks**

- `config.py` with bounded settings and no blocklist switch.
- `url_validator.py` and `net_guard.py` with an injectable resolver.
- Parametrised tests for every case in TC-URL-01 to TC-URL-07 and TC-NET-01 to TC-NET-08, TC-NET-12, TC-NET-13.

**Done when:** all of those tests pass and the code is reviewed against SEC-01 to SEC-04 and SEC-14.

### Phase 3: Scanner engine and checks

**Tasks**

- `http_client.py` with manual redirects, timeouts, request budget, deadline and the User-Agent.
- `checks_https.py`, `checks_headers.py`, `checks_cors.py` as pure functions with table-driven tests.
- `orchestrator.py` and the models.
- Local-server and `respx` integration tests.

**Done when:** TC-NET-09 to TC-NET-11, TC-HTTP-01 to TC-HTTP-07, TC-HTTPS-01 to TC-HTTPS-05, TC-HDR-01 to TC-HDR-11 and TC-CORS-01 to TC-CORS-08 pass. SEC-05 to SEC-08 and SEC-10 are reviewed.

### Phase 4: Scanner interface and reports

**Tasks**

- Web Scanner page: input, consent statement, cooldown, spinner, summary counts, results table, detail panel, banners.
- Session-state handling so reruns do not rescan.
- JSON, Markdown and HTML exporters with autoescape.

**Done when:** TC-SCN-01 to TC-SCN-06, TC-RPT-01 to TC-RPT-05, TC-RPT-02 (hostile values), TC-UI-02, TC-UI-03 and TC-UI-05 pass. SEC-09, SEC-11 and SEC-12 are reviewed.

### Phase 5: IDS engine and samples

**Tasks**

- Synthetic sample CSV files with known expected findings.
- `events.py` (loading, validation, timestamps), `rule_loader.py`, `engine.py`.
- `default_rules.yaml` with the seven rules.
- Boundary fixtures for every rule.

**Done when:** TC-EVT-01 to TC-EVT-07 and TC-RULE-01 to TC-RULE-13 pass. TC-NFR-02 meets the time target.

### Phase 6: IDS interface and Rules Guide

**Tasks**

- IDS Simulator page: sample picker, upload, manual event form, parameter controls, Run, findings table, evidence detail, exports.
- Rules Guide page generated from the rules file.
- Honesty banner on every IDS view.
- CSV export neutralisation.

**Done when:** TC-UI-01, TC-UI-03, TC-UI-04, TC-UI-06 and TC-RPT-06 pass. SEC-15 and SEC-16 are reviewed.

### Phase 7: Hardening and acceptance

**Tasks**

- Run all tests. Meet the coverage target (TC-NFR-03).
- Manual accessibility checks (TC-A11Y-02 to TC-A11Y-05).
- Clean-install check on Windows and one other system (TC-NFR-01).
- `pip-audit` (TC-SEC-03).
- Write the About and Limits page from `SECURITY_AND_ETHICS.md`.
- Update `README.md` with real install and run steps and real screenshots.
- Record the results table (`TEST_PLAN.md` section 4).

**Done when:** the acceptance list in `PRD.md` section 18 is fully met.

### Phase 8: Optional hardening and deployment

**Tasks**

- Pinned-IP connection to close the rebinding window (D-10).
- Decide whether to publish only Module B, or the whole app. The whole app requires every item in `SECURITY_AND_ETHICS.md` section 6.
- Deployment setup and a short runbook.

**Done when:** the chosen deployment passes the public deployment gate, or the decision to stay local-only is recorded.

## 4. Definition of done (every phase)

- Code and tests are committed together.
- All tests mapped to the phase pass. No test is skipped without a written reason.
- No new dependency without a written reason.
- No change to requirements without updating `PRD.md`, `TRD.md` and `TEST_PLAN.md` together.
- The documentation consistency tests pass.
- The phase demo works from a clean start.

## 5. Risks to the schedule

| Risk | Response |
|---|---|
| Scanner testing takes longer than planned | Cut optional items (Could). Never cut security tests |
| Streamlit theme keys differ in the pinned version | Use a small CSS block in `ui/theme.py` |
| Name fails clearance | Switch to the fallback name before Phase 1 so the repository is not renamed later |
| Font files too large | Subset to Latin and 3 or 4 files only |

## 6. After the MVP

See `PRD.md` section 20. Review the list, pick one improvement per release, and keep the same test-first approach.
