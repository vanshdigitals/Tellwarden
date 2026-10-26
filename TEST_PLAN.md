# Test Plan

Product: Tellwarden (provisional name, pending clearance)
Version: 0.1 draft for approval
Date: 25 October 2026
Related: `PRD.md`, `TRD.md`, `SECURITY_AND_ETHICS.md`
Status: planned tests. No test has been run, because no code exists yet.

## 1. Approach

- **Tools [Recommendation]:** pytest and pytest-cov for unit and integration tests, `respx` to mock httpx, local servers on 127.0.0.1 for network behaviour, Streamlit `AppTest` for page flows **[Docs, not re-fetched]**, manual checks for accessibility.
- **Rule for network tests:** tests never contact real third-party sites. The scanner tests use mocked responses or local servers. A test-only injected resolver and guard hook exist in test code only. The shipped configuration has no way to relax the guard (SEC-14, TC-NET-13).
- **Table-driven:** URL, address, header, CORS and rule tests are parametrised so each row is one case.
- **Pass rule:** a requirement is accepted when all mapped tests pass, or when its manual check is recorded with date, tester and result.
- **Result values:** Pass, Fail, Blocked, Not run.

## 2. Test cases

### 2.1 URL validation

| ID | Case | Expected |
|---|---|---|
| TC-URL-01 | `http://`, `https://` accepted. `ftp://`, `file://`, `gopher://`, `javascript:`, `data:` rejected | Only http and https pass |
| TC-URL-02 | `example.com` with no scheme | Normalised to `https://example.com` |
| TC-URL-03 | `https://user:pass@example.com` | Rejected, credentials not allowed |
| TC-URL-04 | Ports 22, 8080, 8443, 0, 65536 | Rejected. 80 and 443 accepted |
| TC-URL-05 | URL of 2049 characters | Rejected. 2048 accepted |
| TC-URL-06 | Empty, whitespace, `https://`, host with spaces, host with control characters | Rejected with a reason |
| TC-URL-07 | `http://2130706433`, `http://0177.0.0.1`, `http://0x7f.0.0.1`, mixed-case and IDN hosts | Numeric alternate forms rejected. IDN converted to ASCII before checks |

### 2.2 Network guard (SSRF)

| ID | Case | Expected |
|---|---|---|
| TC-NET-01 | `127.0.0.1`, `127.1.2.3`, `::1`, `0.0.0.0`, `::` | Blocked |
| TC-NET-02 | `10.0.0.1`, `172.16.0.1`, `172.31.255.255`, `192.168.1.1`, `fc00::1`, `fd12::1` | Blocked |
| TC-NET-03 | `169.254.169.254`, `169.254.1.1`, `fe80::1`, `fd00:ec2::254` | Blocked |
| TC-NET-04 | `::ffff:127.0.0.1`, `::ffff:10.0.0.1`, `::ffff:169.254.169.254` | Unwrapped and blocked |
| TC-NET-05 | `100.64.0.1`, `198.18.0.1`, `224.0.0.1`, `ff02::1`, `240.0.0.1`, `64:ff9b::7f00:1` | Blocked |
| TC-NET-06 | Hostname resolving to a private address (injected resolver) | Refused |
| TC-NET-07 | Hostname returning one public and one private address | Refused (any blocked address refuses) |
| TC-NET-08 | `localhost`, `LOCALHOST`, `foo.localhost`, `metadata.google.internal`, names ending `.internal` | Refused |
| TC-NET-09 | Public URL returns 302 to `http://127.0.0.1/` or to a name resolving to a private address | Stopped at that hop and reported |
| TC-NET-10 | Chain of 4 redirects | Stopped after 3 with a message |
| TC-NET-11 | Redirect from https to http | HTTPS-04 shows Warning |
| TC-NET-12 | DNS failure and DNS timeout | Clean error, no crash, no retry loop |
| TC-NET-13 | Search configuration, environment variables and UI for any option that disables the guard. Set each environment variable to extreme values | No option exists. Out-of-range values fall back to defaults. Guard still blocks |

### 2.3 HTTP client behaviour

| ID | Case | Expected |
|---|---|---|
| TC-HTTP-01 | Server never accepts the connection (local server, delayed) | Connect timeout at about 3 s |
| TC-HTTP-02 | Server accepts, sends nothing | Read timeout at about 5 s |
| TC-HTTP-03 | Server streams a very large body | Body not read, or read stops at 1 MB. No memory growth |
| TC-HTTP-04 | Scan across the maximum path (3 redirects, port 80 probe, 3 CORS) | Total requests at most 10. Only GET, HEAD, OPTIONS. No body, no cookies sent |
| TC-HTTP-05 | Inspect client configuration and search code for `verify=False` | TLS verification always on. No match |
| TC-HTTP-06 | Slow target that keeps each request just under the timeouts | Scan ends at the 20 s deadline and is marked incomplete |
| TC-HTTP-07 | Inspect the User-Agent sent | Contains `Tellwarden/<version>` and "educational scanner" |

### 2.4 HTTPS checks

| ID | Case | Expected |
|---|---|---|
| TC-HTTPS-01 | Final URL is https | HTTPS-01 Pass |
| TC-HTTPS-02 | Final URL is http | HTTPS-01 Fail |
| TC-HTTPS-03 | Certificate error (expired, self-signed, wrong host) | HTTPS-02 Fail. Header and CORS checks skipped and marked SKIPPED |
| TC-HTTPS-04 | `http://host/` returns 301 to https on the same host | HTTPS-03 Pass |
| TC-HTTPS-05 | `http://host/` returns 200. Port 80 closed | HTTPS-03 Warning. Info |

### 2.5 Header checks (table-driven, one case per cell of the TRD tables)

| ID | Header | Cases |
|---|---|---|
| TC-HDR-01 | HSTS | max-age 63072000 with includeSubDomains (Pass). max-age 31536000 without includeSubDomains (Warning). max-age 100 (Warning). Missing on https (Fail). Missing on http (Info) |
| TC-HDR-02 | CSP | Strict policy (Pass). `script-src 'unsafe-inline'` (Warning). `script-src *` (Warning). Report-Only only (Warning). Missing (Fail) |
| TC-HDR-03 | X-Content-Type-Options | `nosniff` (Pass). Missing (Fail). `sniff` (Fail) |
| TC-HDR-04 | Framing | `frame-ancestors 'none'` (Pass). XFO DENY (Pass). ALLOW-FROM (Warning). Neither (Fail) |
| TC-HDR-05 | Referrer-Policy | `strict-origin-when-cross-origin` (Pass). Missing (Warning). `unsafe-url` (Fail) |
| TC-HDR-06 | Permissions-Policy | Present (Pass). Missing (Info) |
| TC-HDR-07 | COOP | `same-origin` (Pass). `same-origin-allow-popups` (Warning). Missing (Info) |
| TC-HDR-08 | CORP | `same-origin` (Pass). Missing (Info) |
| TC-HDR-09 | Cache-Control | Response with a cookie and `no-store` (Pass). With `private` only (Warning). With a cookie and no header (Fail). No cookie (check not applied, Info) |
| TC-HDR-10 | Server, X-Powered-By | Absent (Pass). `nginx` (Warning). `nginx/1.18.0` (Warning). Never Fail |
| TC-HDR-11 | X-XSS-Protection | Absent or `0` (Pass). `1; mode=block` (Warning) |

### 2.6 CORS checks

| ID | Case | Expected |
|---|---|---|
| TC-CORS-01 | No ACAO on any request | Pass |
| TC-CORS-02 | `Access-Control-Allow-Origin: *`, no credentials | Info |
| TC-CORS-03 | Test origin reflected, no credentials | Warning |
| TC-CORS-04 | Test origin reflected, credentials true | Fail |
| TC-CORS-05 | `null` allowed, credentials true | Fail |
| TC-CORS-06 | `*` with credentials true | Warning |
| TC-CORS-07 | Reflection without `Vary: Origin` | Warning |
| TC-CORS-08 | Any CORS probe returns a redirect | Info "CORS not assessed". CORS requests never exceed 3 extra requests |

### 2.7 Scanner orchestration and interface

| ID | Case | Expected |
|---|---|---|
| TC-SCN-01 | Authorisation box unticked | Scan button disabled. No request made |
| TC-SCN-02 | After a scan, change an unrelated widget (AppTest) | Result stays. No new request |
| TC-SCN-03 | Two scans within 10 s | Second refused with a polite message. After 10 s allowed |
| TC-SCN-04 | Each error in PRD section 13 (DNS, timeout, TLS, redirect loop, blocked address) | Matching message. No crash. Partial results kept and marked incomplete |
| TC-SCN-05 | Summary counts | Counts of Pass, Warning, Fail and Info equal the per-check totals. No letter grade or score is shown |
| TC-SCN-06 | Scanner page in every state (empty, scanning, result, error) | Scope and limitation banner present |

### 2.8 Reporting

| ID | Case | Expected |
|---|---|---|
| TC-RPT-01 | JSON scan report | Validates against the scan result schema. Every check has observed, explanation, remediation |
| TC-RPT-02 | Target returns a header value containing `<script>alert(1)</script>` and `"><img src=x>` | HTML report shows it as text. No element created |
| TC-RPT-03 | Markdown report | Same checks as JSON. Renders correctly |
| TC-RPT-04 | All reports | Contain tool name and version, UTC timestamp, target host, scope, limitations and the authorisation statement |
| TC-RPT-05 | File names | Follow the pattern. Hostile host text is sanitised |
| TC-RPT-06 | IDS CSV export with usernames `=cmd`, `+1`, `-1`, `@x` | Cells escaped. JSON export valid |

### 2.9 Event loading

| ID | Case | Expected |
|---|---|---|
| TC-EVT-01 | Each bundled sample | Loads without errors |
| TC-EVT-02 | CSV with a missing required column, wrong types, bad IP, bad port, unknown event type | Clear error with row numbers. First 20 shown |
| TC-EVT-03 | File of 5 MB plus 1 byte. File with 50,001 rows | Refused before full parse |
| TC-EVT-04 | File with 3 bad rows among good rows | Good rows load. Skipped count 3 with reasons |
| TC-EVT-05 | Timestamps with Z, +05:30, no offset, malformed | Converted to UTC. Naive treated as UTC with a note. Malformed is an error |
| TC-EVT-06 | Manual event form | Event added and used in the next run. Invalid input refused |
| TC-EVT-07 | Empty file, header only, binary file | Clear message. No crash |

### 2.9b Detection rules

| ID | Case | Expected |
|---|---|---|
| TC-RULE-01 | AUTH-001: 4 failures in window, 5 failures, 5 failures spread over 301 s | No finding, finding, no finding |
| TC-RULE-02 | AUTH-002: 9 users, 10 users, 10 users but one tried 3 times | No finding, finding, no finding for the 3-try user count |
| TC-RULE-03 | AUTH-003: 4 failures then success, 5 failures then success, 5 failures from another IP then success | No finding, finding, no finding |
| TC-RULE-04 | AUTH-004: success at 06:59, 07:00, 20:00, 20:01 UTC | Finding, no finding, no finding, finding |
| TC-RULE-05 | NET-001: 14, 15 distinct ports in 60 s. 15 ports over 61 s | No finding, finding, no finding |
| TC-RULE-06 | NET-002: 9, 10 distinct hosts on one port in 60 s | No finding, finding |
| TC-RULE-07 | WEB-001: 100, 101 requests in 60 s | No finding, finding |
| TC-RULE-08 | Two overlapping windows for the same rule and entity | One merged finding with first and last seen and union of evidence |
| TC-RULE-09 | Parameter values below and above bounds | Refused |
| TC-RULE-10 | Rule file missing, invalid YAML, unknown type, missing field | Clear error. IDS Run disabled. App does not crash |
| TC-RULE-11 | Findings content | All fields in the finding schema present. Evidence IDs exist in the dataset. Truncation flag set above 500 |
| TC-RULE-12 | Rule with `enabled: false` | Not evaluated |
| TC-RULE-13 | Run the same input twice | Identical findings |

### 2.10 Interface

| ID | Case | Expected |
|---|---|---|
| TC-UI-01 | Open every page. Rules Guide has one entry per rule. Overview shows both modules and the honesty statement | All present and reachable |
| TC-UI-02 | Every status badge | Shows icon and text label, not colour only |
| TC-UI-03 | Banners | Scope banner on Web Scanner. "Offline simulation of sample data" on every IDS view |
| TC-UI-04 | Scan all UI strings and documents for banned claims | No "AI-powered", "machine learning", "real-time", "live traffic", "network monitoring" (as a feature), "production-grade", "guaranteed" |
| TC-UI-05 | AppTest scanner flow with mocked scan | Input, consent, result, downloads |
| TC-UI-06 | AppTest IDS flow | Sample load, run, findings, detail, export |
| TC-NAV-01 | Navigation data structure integrity (AppTest) | 5 registered pages grouped under PLATFORM, MODULE A, MODULE B, REFERENCE. Unique keys, valid st.Page objects, and url_paths |
| TC-NAV-02 | Top-right hamburger alignment (Chromium) | Hamburger and drawer close button align at the same top-right screen coordinates across all viewports |
| TC-NAV-03 | Desktop push mode (Chromium >=1101px) | Drawer docked right, push padding-right applied with 240 ms transition, no backdrop, state kept across page switches |
| TC-NAV-04 | Mobile overlay mode (Chromium <=1100px) | Drawer slides in with dark scrim backdrop, closes on hamburger, close button, backdrop tap, Escape, or menu item click |
| TC-NAV-05 | Accessibility & keyboard navigation (Chromium) | Tab trapped in overlay mode, focus returns to hamburger on close, `aria-current="page"`, `aria-expanded` synchronized |
| TC-NAV-06 | Font loading & offline zero-leak test (Chromium) | DM Sans and IBM Plex Mono load locally from static/fonts/; browser network log shows zero external requests |

### 2.11 Accessibility

| ID | Case | Expected |
|---|---|---|
| TC-A11Y-01 | Automated: compute contrast for every text and background pair listed in `DESIGN_SYSTEM.md`, including badge tints and derived nav tokens | Normal text at least 4.5:1. Large text and UI elements at least 3:1. Values match the design system |
| TC-A11Y-02 | Manual: use every page with keyboard only | All controls reachable. Focus ring visible (Signal Teal on light, White on navy) |
| TC-A11Y-03 | Manual: view with a greyscale filter or a colour-blindness simulator | Every status is still clear |
| TC-A11Y-04 | Manual: 200% zoom and 360 px width | No lost content. No horizontal page scroll. Tables scroll in their container |
| TC-A11Y-05 | Manual: forms | Visible labels. Error text beside the field |

### 2.12 Security and privacy

| ID | Case | Expected |
|---|---|---|
| TC-SEC-01 | Capture logs during a scan with a URL containing a path and query, and during an upload | Logs contain host, counts and error types only |
| TC-SEC-02 | Browser network log while using every page, and a search of the code for external URLs | The only outbound requests are to the scan target. No font, script or analytics CDN |
| TC-SEC-03 | Run `pip-audit` (or equivalent) on the pinned dependencies | No known unresolved vulnerabilities, or documented exceptions |
| TC-SEC-04 | Target serves HTML, JavaScript and a large file | Nothing saved to disk. Nothing executed. Body not rendered |
| TC-SEC-05 | Hostile header values in HTML and Markdown reports | Escaped (see TC-RPT-02) |

### 2.13 Non-functional

| ID | Case | Expected |
|---|---|---|
| TC-NFR-01 | Follow the README steps on a clean virtual environment on Windows and one other system | App starts and both modules run |
| TC-NFR-02 | Evaluate 10,000 synthetic events with all rules | At most 3 s on a typical laptop **[Assumption]** |
| TC-NFR-03 | Coverage of scanner, network guard and rule engine | At least 80% |

### 2.14 Documentation consistency

| ID | Case | Expected |
|---|---|---|
| TC-DOC-01 | Search all Markdown files and UI strings for banned claims (see TC-UI-04). Negative statements such as "does not use AI" are allowed | No positive claim of AI, ML, real-time monitoring or production grade |
| TC-DOC-02 | Search all documents for hex colours | Only these values appear: core `#1B365D`, `#475569`, `#0F766E`, `#F8FAFC`, white `#FFFFFF`, status `#166534`, `#B45309`, `#B91C1C`, decorative border tint `#CBD5E1`, and derived nav tokens `#E2E8F0`, `#A9B8CC`, `#27466F`. Brand name and values match everywhere |
| TC-DOC-03 | Search all documents for font names | DM Sans (headings/interface) and IBM Plex Mono (code/technical values) are the active fonts everywhere. Inter, JetBrains Mono and Atkinson appear only as alternatives |
| TC-DOC-04 | Requirement-to-test mapping (section 3) | Every requirement ID has at least one test or manual check |

## 3. Requirement-to-test mapping

| Requirement | Tests |
|---|---|
| SCN-01 | TC-URL-01, TC-URL-02 |
| SCN-02 | TC-SCN-01 |
| SCN-03 | TC-URL-03 to TC-URL-07 |
| SCN-04 | TC-NET-01 to TC-NET-08 |
| SCN-05 | TC-HTTPS-01 to TC-HTTPS-05, TC-NET-11 |
| SCN-06 | TC-HDR-01 to TC-HDR-11 |
| SCN-07 | TC-CORS-01 to TC-CORS-08 |
| SCN-08 | TC-HDR-*, TC-CORS-* |
| SCN-09 | TC-RPT-01 |
| SCN-10 | TC-SCN-05 |
| SCN-11 | TC-NET-09, TC-NET-10 |
| SCN-12 | TC-SCN-02 |
| SCN-13 | TC-SCN-03 |
| SCN-14 | TC-SCN-06 |
| IDS-01 | TC-EVT-01, TC-RULE-01 to TC-RULE-07 |
| IDS-02 | TC-EVT-02, TC-EVT-03 |
| IDS-03 | TC-EVT-06 |
| IDS-04 | TC-RULE-01 to TC-RULE-07, TC-RULE-10 |
| IDS-05 | TC-RULE-09 |
| IDS-06, IDS-07 | TC-RULE-11 |
| IDS-08 | TC-UI-01 |
| IDS-09 | TC-UI-03, TC-UI-04 |
| IDS-10 | TC-EVT-04 |
| IDS-11 | TC-EVT-05 |
| IDS-12 | TC-RPT-06 |
| IDS-13 | TC-RULE-08 |
| RPT-01 | TC-RPT-01 |
| RPT-02 | TC-RPT-02 |
| RPT-03 | TC-RPT-03 |
| RPT-04 | TC-RPT-04 |
| RPT-05 | TC-RPT-06 |
| UI-01 | TC-UI-01, TC-A11Y-02 |
| UI-02 | TC-UI-02, TC-A11Y-03 |
| UI-03 | TC-DOC-02 |
| UI-04 | TC-UI-03 |
| UI-05 | TC-SEC-02, TC-DOC-03 |
| UI-06 | TC-A11Y-04 |
| UI-07 | TC-UI-01 |
| NFR-01 | TC-NFR-01 |
| NFR-02 | TC-NFR-02 |
| NFR-03 | TC-NFR-03 |
| NFR-04 | TC-SCN-02 |
| NFR-05 | Manual: dependency and licence review, recorded in the results table |
| NFR-06 | TC-NFR-01 |
| NFR-07 | TC-SEC-02 |
| NFR-08 | TC-RULE-13 |
| A11Y-01 to A11Y-06 | TC-A11Y-01 to TC-A11Y-05, TC-UI-04 |
| SEC-01 | TC-URL-01 |
| SEC-02 | TC-URL-03 to TC-URL-07 |
| SEC-03 | TC-NET-01 to TC-NET-07 |
| SEC-04 | TC-NET-03, TC-NET-08 |
| SEC-05 | TC-NET-09 to TC-NET-11 |
| SEC-06 | TC-HTTP-01, TC-HTTP-02, TC-HTTP-06 |
| SEC-07 | TC-HTTP-03, TC-SEC-04 |
| SEC-08 | TC-HTTP-05, TC-HTTPS-03 |
| SEC-09 | TC-SCN-01 |
| SEC-10 | TC-HTTP-04 |
| SEC-11 | TC-SCN-03 |
| SEC-12 | TC-RPT-02, TC-SEC-05 |
| SEC-13 | TC-SEC-01 |
| SEC-14 | TC-NET-13 |
| SEC-15 | TC-SEC-02 |
| SEC-16 | TC-EVT-02, TC-EVT-03, TC-RPT-06 |
| SEC-17 | TC-SEC-02 |
| SEC-18 | TC-SEC-03 |

## 4. Acceptance validation

Before the MVP is declared complete:

1. Run the full automated suite. All tests pass. Coverage meets TC-NFR-03.
2. Complete and date the manual checks: TC-A11Y-02 to TC-A11Y-05, TC-NFR-01.
3. Run TC-DOC-01 to TC-DOC-04 on the final repository.
4. Record the results in a table (test ID, date, tester, result, notes) and keep it in the repository.
5. Review open decisions in `DECISIONS_AND_ASSUMPTIONS.md`. None may be unresolved for the MVP.

## 5. Test data

- Bundled synthetic samples: `brute_force.csv`, `password_spraying.csv`, `port_scan.csv`, `mixed_normal.csv`. Each is designed so the expected findings are known. IP addresses come from documentation ranges.
- Fixture files for every rule at threshold minus one, at threshold, and at the window boundary.
- Malformed CSV fixtures for every error in TC-EVT-02 to TC-EVT-07.
- Hostile header fixtures for TC-RPT-02.
- No real personal data is used in any test.
