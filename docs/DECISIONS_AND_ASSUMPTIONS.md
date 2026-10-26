# Decisions and Assumptions

Product: Tellwarden (provisional name, pending clearance)
Date: 25 October 2026
Related: all documents
Evidence tags: see `README.md`.

## 1. Constraints given by the project owner

These are fixed inputs, not decisions to revisit.

| ID | Constraint |
|---|---|
| C-1 | Python and Streamlit |
| C-2 | Two independent modules: Web Security Scanner and Rule-Based IDS Simulator |
| C-3 | No AI, no machine learning, no model training, and no claim of them |
| C-4 | Offline simulation only for Module B. No live network monitoring and no real-time claims |
| C-5 | No paid API. Free open-source dependencies |
| C-6 | No mandatory database in the first version |
| C-7 | Deployment optional in the first phase |
| C-8 | Four core colours. DM Sans (interface) and IBM Plex Mono (code) fonts. Name pending domain and trademark checks |
| C-9 | No application source code in the documentation phase |

## 2. Decision log

Status values: **Given** (from the owner), **Proposed** (recommended here, needs approval), **Open** (needs a decision), **Approved** (confirmed by owner).

| ID | Decision | Rationale and evidence | Status |
|---|---|---|---|
| D-01 | Provisional name **Tellwarden**, fallback Scarpwatch then Hornwork | Highest rubric score (17 of 25). No exact-name hit found. Domain and trademark not checked. See `RESEARCH_AND_NAMING.md` | Proposed, pending clearance |
| D-02 | Use Streamlit with engines kept free of Streamlit imports | Fits a synchronous tool of this size **[Docs, not re-fetched]**. Keeps code testable | Given (C-1), structure Proposed |
| D-03 | Use httpx as the HTTP client | Enforces timeouts by default and does not follow redirects by default, which matches the SSRF design **[Docs, not re-fetched]** | Proposed |
| D-04 | Palette: Rampart Navy `#1B365D`, Slate `#475569`, Signal Teal `#0F766E`, Paper `#F8FAFC`. Status tokens `#166534`, `#B45309`, `#B91C1C` | Contrast computed in research and rechecked: all meet AA. See `DESIGN_SYSTEM.md` | Proposed |
| D-05 | **DM Sans** for headings and body; **IBM Plex Mono** for technical values; self-hosted | Revised 25 October 2026 (Owner override O-1). Modern geometric clarity paired with unmistakable mono character shapes. Self-hosted in `static/fonts/` | Approved (O-1) |
| D-06 | Show counts only. No letter grade and no single score | A grade invites the reading "this site is secure", which the tool cannot support | Proposed |
| D-07 | Scanner statuses are Pass, Warning, Fail, plus Info for informational or not-applicable checks | Some checks (COOP, CORP, wildcard CORS on public assets) should not count as failures | Proposed |
| D-08 | Rules are data in a YAML file, with four built-in rule types | Makes rules readable and editable without code changes | Proposed |
| D-09 | Label Module B everywhere as "Offline simulation of sample data" | Honesty requirement (C-4) | Given, wording Proposed |
| D-10 | DNS rebinding: accept the documented limitation in the local MVP. Implement a pinned-IP connection before any public hosting. Alternatively implement it in Phase 8 or earlier | Local risk is limited to the user's own machine. Public hosting needs the fix | Open |
| D-11 | Allow only ports 80 and 443 | Keeps the scanner from being used as a port scanner | Proposed |
| D-12 | Reports: JSON, Markdown and HTML. No PDF in the MVP | PDF libraries add dependency and deployment cost. The browser can print HTML to PDF | Proposed |
| D-13 | Licence for the repository: MIT License | Standard permissive open-source license for portfolio projects | Approved |
| D-14 | No persistent storage. Logs hold host names and counts only | Privacy and simplicity (SEC-13) | Proposed |
| D-15 | Python 3.10 or newer | Baseline standard across current dependencies | Approved |
| D-16 | Request budget 10, redirect limit 3, timeouts 3 s and 5 s, deadline 20 s, cooldown 10 s, body cap 1 MB | Keeps each scan small and bounded | Proposed |
| D-17 | Rule defaults: 5 failures in 300 s, 10 users in 600 s, 15 ports in 60 s and so on (see `TRD.md` section 9) | Taken from common conventions such as fail2ban defaults **[Docs, not re-fetched]**. Labelled illustrative | Proposed |
| D-18 | Right-side drawer navigation with top-right hamburger toggle | Revised 25 October 2026 (Owner overrides O-2 & O-6). Push mode on desktop (>=1101px), overlay drawer with backdrop on tablet/mobile (<=1100px). Pages grouped under PLATFORM, MODULE A, MODULE B, REFERENCE | Approved (O-2, O-6) |
| D-19 | Documentation files live at the repository root | Small project. A `docs/` folder can come later | Proposed |
| D-20 | Active nav item is a filled white pill with navy text; no one-sided borders | Approved 25 October 2026 (Owner override O-3). No decorative left/top borders anywhere | Approved (O-3) |
| D-21 | Border radius: cards 14 px, controls 10 px, pills 999 px; `baseRadius = "10px"` | Approved 25 October 2026 (Owner override O-4). Standardises modern rounded contours | Approved (O-4) |
| D-22 | Shield-outline mark + wordmark "Tellwarden" + subtitle "Security analysis workspace" | Approved 25 October 2026 (Owner override O-5). Unifies desktop and mobile branding | Approved (O-5) |
| D-23 | Derived tokens on navy: `nav-text` (#E2E8F0), `nav-label` (#A9B8CC), `nav-hover` (#27466F), `nav-active-bg` (#FFFFFF), `focus-on-navy` (#FFFFFF) | Approved 25 October 2026. All pairs pass WCAG AA contrast (TC-A11Y-01) | Approved |
| D-24 | React + TypeScript + Vite + Tailwind CSS v4 frontend (`frontend/`) talking to a FastAPI backend (`src/tellwarden/api.py`). Supersedes the Streamlit UI from D-02; engines stay framework-free | Owner request 26 October 2026: real frontend-backend integration with a modern React app. FastAPI reuses the existing Python config, exceptions and rules | Proposed |
| D-25 | D-10 implemented: `netguard.GuardedBackend` resolves and validates addresses at connect time and connects only to validated IPs (SNI/cert verification still use the host name) | Closes the check-then-connect rebinding gap. Covered by `test_guarded_transport_blocks_rebinding_at_connect_time`. Still review before any public hosting | Proposed |

## 3. Assumptions requiring confirmation

| ID | Assumption | Effect if wrong |
|---|---|---|
| A-01 | Python 3.10 or newer is acceptable | Raise or lower the minimum and recheck dependencies |
| A-02 | A new user can complete a first run in 2 minutes | Simplify the interface or add a guided example |
| A-03 | 10,000 events evaluate in 3 seconds on a typical laptop | Optimise the engine or lower the row limit |
| A-04 | The layout works at 360 px width | Adjust tables and sidebar behaviour |
| A-05 | IBM Plex, Inter, JetBrains Mono and Atkinson Hyperlegible are under SIL OFL 1.1 and free to self-host | Confirm on the foundry or Google Fonts page before shipping the files |
| A-06 | Streamlit theme keys (`font`, `headingFont`, `codeFont`, `[[theme.fontFaces]]`, `baseRadius`, sidebar theme) exist in the pinned version | Use a CSS block instead |
| A-07 | Self-hosted font files total 150 to 250 KB after subsetting | Reduce weights or subset further |
| A-08 | AUTH-004 uses UTC by default and 07:00 to 20:00 as normal hours | Make the timezone and hours part of the sample data description |
| A-09 | No real personal data is used for samples or tests | Replace data with synthetic data |
| A-10 | Rule thresholds are teaching values, not tuned values | State this in the UI and the Rules Guide |
| A-11 | The tool is used for learning and portfolio demonstration, in English, by one developer | Plan localisation or team workflow if needed |
| A-12 | `#CBD5E1` is acceptable as a decorative border tint of Slate. It is not a fifth brand colour | Replace with a Slate tint chosen by the owner |

## 4. Open questions

| ID | Question | Needed before |
|---|---|---|
| Q-1 | Do the domain and trademark checks for Tellwarden pass? | Any public use of the name |
| Q-2 | Which licence should the repository use? | Phase 1 |
| Q-3 | Should the pinned-IP connection be in the MVP (D-10)? | Phase 3 |
| Q-4 | Is a Module B only public demo wanted? | Phase 8 |
| Q-5 | Which Python version and Streamlit version to pin? | Phase 1 |
| Q-6 | Should the About page show the owner's name and links? | Phase 7 |
| Q-7 | Is a dark mode wanted later? It would need a second set of contrast checks | After the MVP |

## 5. Verified findings versus recommendations

- **Verified in research:** the name conflicts listed in `RESEARCH_AND_NAMING.md`, the absence of an exact "Tellwarden" match in the searches run, the OWASP header values and criteria quoted in `TRD.md`, and the colour contrast numbers (computed twice).
- **Documentation not reopened:** Streamlit behaviour and configuration keys, OWASP SSRF and CORS guidance, httpx defaults, ATT&CK IDs, NIST text, font licences. Each is tagged and must be confirmed against the official page during Phase 0 or Phase 1.
- **Not checked at all:** domain status, trademark status, social handles.
- **Recommendations:** everything tagged [Recommendation], including thresholds, check criteria and the architecture.

## 6. Approval checklist before development starts

- [ ] I approve the provisional name Tellwarden, understanding that domain and trademark checks are pending.
- [ ] I have done, or will do before publishing, the manual domain and trademark checks.
- [ ] I approve the PRD, including the MVP scope and the out-of-scope list.
- [ ] I approve the TRD, including the architecture and the SSRF design.
- [ ] I approve the four-colour palette, the status tokens and the border tint (A-12).
- [ ] I approve IBM Plex as the font pairing.
- [ ] I approve the scanner statuses (D-07) and the no-grade rule (D-06).
- [ ] I have decided on D-10 (DNS rebinding), D-13 (licence) and D-15 (Python version).
- [ ] I accept the authorised-use policy and the required UI wording in `SECURITY_AND_ETHICS.md`.
- [ ] I understand that the app will not be deployed publicly until the gate in `SECURITY_AND_ETHICS.md` section 6 is met.

## 7. Change rule

A change to a requirement, a threshold, a colour, a font or the name must be made in every affected document at once, and recorded here with the date.
