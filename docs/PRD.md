# Product Requirements Document (PRD)

Product: Tellwarden (provisional name, pending clearance)
Version: 0.1 draft for approval
Date: 25 October 2026
Related: `TRD.md`, `DESIGN_SYSTEM.md`, `SECURITY_AND_ETHICS.md`, `TEST_PLAN.md`
Evidence tags: see `README.md`. Test IDs (TC-...) are defined in `TEST_PLAN.md`. Security IDs (SEC-...) are defined in `SECURITY_AND_ETHICS.md`.

## 1. Product overview

Tellwarden is a Python and Streamlit web application for learning and demonstrating two security-analysis ideas in one place.

- **Module A, Web Security Scanner:** checks the HTTPS setup, selected HTTP security headers and basic CORS behaviour of a site the user is authorised to test.
- **Module B, Rule-Based IDS Simulator:** applies documented detection rules to sample or user-supplied event data and shows what each rule flagged and why.

Both modules explain their results in plain language and suggest a fix or a response. The two modules are independent. Neither needs the other to work.

## 2. Problem statement

- Beginners learn about security headers, CORS and intrusion detection from long documents. They rarely see a small tool that shows the idea and explains the reasoning.
- Existing header graders give a score with little explanation of why a header matters.
- Existing detection tools (SIEMs, fail2ban, Wazuh) are built for operations. Their rule logic is hard for a learner to read.
- A student portfolio needs a project that is small enough to finish, honest about its limits and visibly careful about safety, especially the risks of a tool that fetches user-supplied URLs.

## 3. Product vision

A clear, honest teaching tool. Every result shows what was checked, what was seen, why it matters and what to do next. The tool never overstates what it knows. Its design shows that safe handling of untrusted input was planned from the start.

## 4. Goals and measurable success criteria

| ID | Goal | Measure of success |
|---|---|---|
| G-1 | Scanner is safe against SSRF in its intended local use | 100% of SSRF test cases (TC-NET-01 to TC-NET-13) pass |
| G-2 | Scanner results are useful and explained | Every check result includes an observed value, an explanation and a remediation (TC-RPT-01) |
| G-3 | IDS rules are transparent | Every rule has a written explanation page and a fixture test that fires exactly at its threshold (TC-RULE-01 to TC-RULE-07) |
| G-4 | The tool is honest about scope | No document or UI text claims AI, ML, real-time or production use (TC-DOC-01, TC-UI-04) |
| G-5 | Usable on first try | A new user completes a first scan or IDS run within 2 minutes (informal test with 3 people) **[Assumption]** |
| G-6 | Responsive enough for local use | Scan finishes within 20 s worst case (TC-HTTP-06). IDS evaluates 10,000 events within 3 s (TC-NFR-02) |
| G-7 | Accessible | Colour tokens meet contrast targets and status never relies on colour alone (TC-A11Y-01, TC-A11Y-03) |
| G-8 | Maintainable | Core modules have at least 80% test coverage (TC-NFR-03) |

## 5. Target users and personas

| Persona | Description | Needs |
|---|---|---|
| **P1 Student analyst** | Cybersecurity student learning web security and detection basics | Plain explanations, safe sample data, repeatable results |
| **P2 Small-site owner or junior developer** | Owns or builds a small website and wants a quick hygiene check | Clear Pass, Warning, Fail results and copy-ready fixes |
| **P3 Reviewer** | Instructor or recruiter reading the portfolio | Clear scope, honest limits, visible safety design, easy local run |

## 6. Primary user journeys

| ID | Journey | Steps |
|---|---|---|
| J-1 | Scan a site | Open Web Scanner, enter URL, tick authorisation, press Scan, read summary and per-check results, download report |
| J-2 | Run the IDS demo | Open IDS Simulator, pick a sample scenario, press Run, read findings, open one finding to see evidence events |
| J-3 | Tune a rule | In IDS Simulator, change a threshold or window within allowed bounds, rerun, compare findings |
| J-4 | Learn a rule | Open Rules Guide, read how a rule works, its false positives and the response advice |
| J-5 | Use own data | Upload a CSV that matches the event schema, fix any reported row errors, run rules, export findings |

## 7. Functional requirements

Requirement IDs are unique. Module and group detail follow in sections 9 to 12.

| Group | IDs |
|---|---|
| Scanner | SCN-01 to SCN-14 |
| IDS simulator | IDS-01 to IDS-13 |
| Reporting | RPT-01 to RPT-05 |
| Interface | UI-01 to UI-07 |
| Non-functional | NFR-01 to NFR-08 |

## 8. Non-functional requirements

| ID | Requirement | Verified by |
|---|---|---|
| NFR-01 | Runs locally with `pip install -r requirements.txt` then `streamlit run app.py` on a clean virtual environment | TC-NFR-01 |
| NFR-02 | IDS evaluates 10,000 events within 3 seconds on a typical laptop **[Assumption]** | TC-NFR-02 |
| NFR-03 | Core modules (scanner, network guard, rule engine) have at least 80% test coverage | TC-NFR-03 |
| NFR-04 | No database is required. State lives in the Streamlit session | TC-SCN-02 |
| NFR-05 | All dependencies are free and open source. No paid API | Dependency review |
| NFR-06 | Python 3.10 or newer **[Assumption, confirm against the pinned Streamlit version]** | TC-NFR-01 |
| NFR-07 | Fonts are self-hosted. The UI makes no third-party requests | TC-SEC-02 |
| NFR-08 | Behaviour is deterministic. The same input gives the same findings | TC-RULE-13 |

## 9. Module A requirements: Web Security Scanner

| ID | Requirement | Acceptance criteria |
|---|---|---|
| SCN-01 | The user enters one URL. If no scheme is given, `https://` is assumed. Only `http` and `https` are accepted | Given `example.com`, the scan target is `https://example.com`. Given `ftp://x`, the app shows a clear rejection (TC-URL-01, TC-URL-02) |
| SCN-02 | The Scan button is disabled until the user ticks the authorisation statement | With the box unticked, no request is made (TC-SCN-01) |
| SCN-03 | The URL is validated: no credentials, port 80 or 443 only, length at most 2048, valid host | Invalid inputs are rejected with a reason (TC-URL-03 to TC-URL-07) |
| SCN-04 | The host is resolved. If any resolved address is non-public, the scan is refused | Loopback, private, link-local, metadata, reserved and mapped addresses are refused (TC-NET-01 to TC-NET-08) |
| SCN-05 | HTTPS checks: final URL scheme, certificate validity, HTTP to HTTPS redirect behaviour, downgrade on redirect | Each yields a Pass, Warning or Fail (TC-HTTPS-01 to TC-HTTPS-05, TC-NET-11) |
| SCN-06 | Header checks for HSTS, CSP, X-Content-Type-Options, framing protection, Referrer-Policy, Permissions-Policy, COOP, CORP, Cache-Control (conditional), server information disclosure, X-XSS-Protection | Each header follows the criteria table in `TRD.md` section 7 (TC-HDR-01 to TC-HDR-11) |
| SCN-07 | Limited CORS check using at most 4 requests (baseline, test origin, `null` origin, optional preflight) | Results follow the CORS table in `TRD.md` section 8 (TC-CORS-01 to TC-CORS-08) |
| SCN-08 | Every check returns a status of Pass, Warning or Fail, or Info where a check is informational or not applicable. Info is not counted as a failure | Statuses match the criteria tables (TC-HDR-*, TC-CORS-*) |
| SCN-09 | Every check shows the observed value, why it matters and how to fix it | All check results contain `observed`, `explanation`, `remediation` (TC-RPT-01) |
| SCN-10 | The summary shows counts of Pass, Warning, Fail and Info. No letter grade or numeric score is shown | Summary counts equal the per-check totals (TC-SCN-05) |
| SCN-11 | The redirect chain is shown, with each hop validated. At most 3 redirects are followed | Fourth redirect is refused with a message (TC-NET-09, TC-NET-10) |
| SCN-12 | Results stay visible across Streamlit reruns. A scan runs only when the button is pressed | Changing an unrelated widget does not rescan (TC-SCN-02) |
| SCN-13 | A cooldown of 10 seconds between scans per session | A second scan inside 10 s is refused politely (TC-SCN-03) |
| SCN-14 | The scanner page always shows scope, limitations and the responsible-use notice | Notice is present in every state (TC-SCN-06) |

## 10. Module B requirements: Rule-Based IDS Simulator

| ID | Requirement | Acceptance criteria |
|---|---|---|
| IDS-01 | At least 4 bundled sample datasets: brute force, password spraying, port scan, mixed normal traffic | Each loads without error and triggers the expected rules (TC-EVT-01, TC-RULE-01 to TC-RULE-07) |
| IDS-02 | CSV upload with schema validation. Maximum 5 MB and 50,000 rows | Over-limit files are refused with a reason (TC-EVT-02, TC-EVT-03) |
| IDS-03 | A form to add a single event manually to the working table | Added event appears and is used in the next run (TC-EVT-06) |
| IDS-04 | Seven documented default rules: AUTH-001, AUTH-002, AUTH-003, AUTH-004, NET-001, NET-002, WEB-001. Rules are read from a YAML file | Each rule exists and matches the definition in `TRD.md` section 9 (TC-RULE-01 to TC-RULE-07, TC-RULE-10) |
| IDS-05 | Thresholds and windows are adjustable in the UI within fixed bounds | Out-of-range values are refused (TC-RULE-09) |
| IDS-06 | Each finding shows rule ID and name, severity, ATT&CK reference, entity, first and last seen, event count, threshold, window, explanation and recommended response | All fields present (TC-RULE-11) |
| IDS-07 | A finding can be opened to show the exact evidence events | Evidence IDs match the events used (TC-RULE-11) |
| IDS-08 | A Rules Guide page explains every rule: logic, defaults, false positives, response | One entry per rule (TC-UI-01) |
| IDS-09 | Every IDS view is labelled "Offline simulation of sample data". The words "real-time", "live traffic" and "monitoring" are not used for the simulator | Label present, banned phrases absent (TC-UI-03, TC-UI-04) |
| IDS-10 | Malformed rows are skipped. The count and reasons are shown | Counts match the number of bad rows (TC-EVT-04) |
| IDS-11 | Timestamps are ISO 8601 and treated as UTC | Non-UTC offsets are converted. Unparseable values are errors (TC-EVT-05) |
| IDS-12 | Findings export as JSON and CSV | Files open and match the table (TC-RPT-06) |
| IDS-13 | Overlapping windows for the same rule and entity merge into one finding | Merge test passes (TC-RULE-08) |

## 11. Dashboard and navigation requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| UI-01 | Right-side drawer navigation with top-right hamburger toggle across all viewports, grouping five pages under PLATFORM, MODULE A, MODULE B, REFERENCE (Overview, Web Scanner, IDS Simulator, Rules Guide, About & Limitations) | All pages reachable by keyboard with push/overlay responsive behavior (TC-UI-01, TC-A11Y-02) |
| UI-02 | Status badges always show an icon and a text label as well as colour | Pass tick, Warning triangle, Fail cross, Info circle (TC-UI-02, TC-A11Y-03) |
| UI-03 | The theme uses the four core colours and three status tokens from `DESIGN_SYSTEM.md` | Hex values match the design system (TC-DOC-02) |
| UI-04 | Scope and limitation banners on Web Scanner and IDS Simulator pages | Banner present (TC-UI-03) |
| UI-05 | DM Sans and IBM Plex Mono fonts are self-hosted with system fallbacks | No third-party font request (TC-SEC-02, TC-DOC-03) |
| UI-06 | Tables scroll horizontally on narrow screens. No horizontal page scroll at 360 px width **[Assumption]** | Manual check (TC-A11Y-04) |
| UI-07 | Overview page shows the two modules, the honesty statement and the authorised-use rule | Content present (TC-UI-01) |

## 12. Findings, severity and reporting requirements

**Scanner status values:** Pass, Warning, Fail, Info. **IDS severity values:** Low, Medium, High, Critical. Scanner results and IDS findings use separate vocabularies and are never mixed in one table.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| RPT-01 | Scan report in JSON, following the scan result schema in `TRD.md` section 11 | Validates against the schema (TC-RPT-01) |
| RPT-02 | Self-contained HTML report with autoescaped content | A header value containing `<script>` is displayed as text (TC-RPT-02) |
| RPT-03 | Markdown report | File renders and has the same checks as the JSON (TC-RPT-03) |
| RPT-04 | Every report states tool name and version, UTC timestamp, target host, scope, limitations and the authorisation statement | Fields present (TC-RPT-04) |
| RPT-05 | CSV exports neutralise cells that start with `=`, `+`, `-` or `@` | Dangerous prefixes are escaped (TC-RPT-06) |

PDF export is out of scope for the MVP. Users can print the HTML report to PDF from the browser.

## 13. Error handling and edge cases

| Situation | Required behaviour |
|---|---|
| Empty or whitespace URL | Inline message. No request |
| Unsupported scheme, credentials in URL, bad port | Rejected with the reason |
| DNS failure | "Host could not be resolved". No retry loop |
| Resolved to a non-public address | "Target is not a public address, scan refused". The address is shown |
| Connection timeout or read timeout | Check marked Fail or skipped with a timeout message. Scan ends cleanly |
| Invalid TLS certificate | HTTPS-02 is Fail. Header and CORS checks are skipped. Certificate verification is never turned off |
| Redirect loop or more than 3 redirects | Stop and report |
| Redirect to a blocked address | Stop and report the blocked hop |
| Response without headers of interest | Missing-header results, not an error |
| Non-HTML or error status (404, 500) | Still checked. Status code is shown. Note that headers can differ by path |
| Streamlit rerun during a scan | Result kept in session state. No duplicate request |
| CSV with wrong columns, bad timestamps or empty file | Clear message with row numbers (first 20 shown) |
| CSV over size or row limit | Refused before parsing in full |
| Rule file missing or invalid | App shows a clear error and disables IDS runs. It does not crash |
| Uploaded text with formula-like cells | Treated as data. Escaped on export |

## 14. Accessibility and usability requirements

| ID | Requirement |
|---|---|
| A11Y-01 | Normal text has a contrast ratio of at least 4.5:1 against its background. The tokens in `DESIGN_SYSTEM.md` meet this (TC-A11Y-01) |
| A11Y-02 | The interface is usable by keyboard alone (TC-A11Y-02) |
| A11Y-03 | Status is never conveyed by colour alone. Each status has an icon shape and a text label (TC-A11Y-03) |
| A11Y-04 | Page works at 200% zoom without losing content (TC-A11Y-04) |
| A11Y-05 | Form fields have visible labels. Error messages are text, next to the field (TC-A11Y-05) |
| A11Y-06 | Plain language. Short sentences. Technical terms are explained on first use |

## 15. Security, privacy and responsible-use requirements

The full list is SEC-01 to SEC-18 in `SECURITY_AND_ETHICS.md`. The requirements below are the ones users see.

- Scanning requires an explicit authorisation statement (SEC-09).
- The scanner refuses private, local, reserved and metadata addresses (SEC-03, SEC-04).
- The scanner never reads, renders, stores or runs website content (SEC-07).
- Scan targets and uploaded files are not stored beyond the browser session (SEC-13).
- The IDS uses only sample or explicitly uploaded data. No packet capture, no stealth monitoring and no automatic response (SEC-15).

## 16. MVP scope

- Scanner: SCN-01 to SCN-14.
- IDS: IDS-01 to IDS-13.
- Reporting: JSON, HTML and Markdown scan reports. JSON and CSV IDS exports.
- Interface: five pages, themed, self-hosted fonts.
- Local run only. Deployment is optional and happens after the MVP.
- Automated tests for all requirements. Manual accessibility checks.

## 17. Explicit out of scope

- Any machine learning, AI features, model training or AI branding.
- Real-time monitoring, packet capture, network sniffing, agents or live log streaming.
- Active exploitation, fuzzing, crawling, brute forcing, port scanning of targets, vulnerability scanning beyond headers, HTTPS and CORS.
- Authenticated scanning, scanning behind login, cookies or custom headers sent to targets.
- Letter grades or a single security score.
- User accounts, database storage, multi-user history or scheduled scans.
- Automatic blocking, firewall changes or any response action.
- PDF export, email, chat or webhook integrations.
- Public multi-user hosting in the MVP.
- Claims of compliance (PCI, ISO, SOC) or certification.

## 18. Acceptance criteria summary

The MVP is accepted when all of the following hold. Details are in `TEST_PLAN.md`.

1. Every requirement ID in sections 8 to 14 has at least one passing test or a recorded manual check.
2. All SSRF test cases pass and no setting or input disables the network guard.
3. All seven rules fire at their exact threshold and not below it.
4. Reports contain the required fields and escape hostile content.
5. No document or screen text claims AI, ML, real-time monitoring or production-grade use.
6. Colour tokens and fonts match `DESIGN_SYSTEM.md` everywhere.
7. A clean install runs from the README steps.

## 19. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SSRF through the URL field | Medium | High | Defence design in `TRD.md` section 6. Parametrised SSRF tests. No public deployment in the MVP |
| DNS rebinding between check and connect | Low locally | Medium | Documented limitation. Optional hardening to connect to the validated IP (see `DECISIONS_AND_ASSUMPTIONS.md`, D-10) |
| User scans a site without permission | Medium | High | Authorisation statement, cooldown, request budget, clear policy, no crawling |
| Users read a good result as "secure" | High | Medium | Counts only, no grade, repeated disclaimer, About page |
| Name conflict or trademark claim | Unknown | Medium | Name is provisional. Manual checks listed. Fallback names ready |
| Rule thresholds look arbitrary | Medium | Low | Defaults sourced from common conventions. Everything adjustable and labelled illustrative |
| Streamlit config keys change between versions | Medium | Low | Pin the version. Check config against the pinned docs |
| Scope creep | High | Medium | Out-of-scope list. Phase gates in `IMPLEMENTATION_PLAN.md` |
| HTML report becomes an XSS vector | Low | Medium | Autoescape on. Test TC-RPT-02 |

## 20. Future improvements

- Pinned-IP connection to remove the rebinding window.
- PDF export.
- More rules, rule import in a Sigma-like format, and rule testing in the UI.
- Compare two scans of the same site over time.
- Optional deployment with rate limiting, egress filtering and authentication (see `SECURITY_AND_ETHICS.md` section 6).
- Multiple language support for the explanations.
- Additional scanner checks such as cookie flags and `security.txt` presence.
