# Tellwarden: Web Security Scanner and Offline Rule-Based IDS Simulator

**Student:** Vansh
**Programme:** IBM SkillsBuild Cyber Security 2026, conducted by BharatCares

## Overview

Tellwarden is an educational cybersecurity project with two modules.

* **Module A, Web Security Scanner.** Checks HTTPS, security headers and CORS behaviour of a web response. Each result has a status (pass, warning, fail, info), an explanation and a fix.
* **Module B, Offline IDS Simulator.** Applies seven rule-based detections to log events and reports findings with the evidence events that caused them.

It uses no machine learning and no AI model. Every detection is a readable rule with a threshold. The IDS never reads live traffic.

## Project description

Small teams often have a web server and logs but no security tooling. Tellwarden shows how two basic controls work.

| Module | What it does | Key rules or checks |
|---|---|---|
| A. Scanner | Reads a response snapshot and grades its configuration | HTTPS-01 to 04, HDR-01 to 07, 09, 10, CORS-01, 03, 07 |
| B. IDS | Slides time windows over log events and applies thresholds | AUTH-001 to 004, NET-001, NET-002, WEB-001 |

Main features

* Seven IDS rules with safe threshold ranges, merged windows (one incident gives one finding) and evidence for each finding.
* CSV import with row-level validation (5 MB and 50,000 row limits).
* Scanner with a two-stage SSRF guard (URL text check, then address check). Live fetching is off by default.
* Export to JSON, CSV and Markdown. Spreadsheet formulas in CSV cells are neutralised.
* Self-checks (`assert`) in every part of the notebook.

## Dataset

**No external dataset is used.** All data is synthetic and generated inside the notebook (Part A3), so there is no download link.

Full project repository (FastAPI backend, Streamlit app, React frontend, tests, sample CSV files): https://github.com/vanshdigitals/Tellwarden

Sample event CSV files in the repository: https://github.com/vanshdigitals/Tellwarden/tree/main/data/sample_events

* Six scenarios: brute_force (181 events), password_spraying (177), port_scan (215), request_burst (324), mixed (958), normal (261).
* A fixed random seed per scenario makes every run identical.
* Addresses come from the documentation ranges 192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24, so no real system is involved.
* Scanner inputs are three hand-written response snapshots (weak, typical, strong). They are not measurements of real websites.
* Rule names map to MITRE ATT&CK techniques: https://attack.mitre.org/

You can also load your own CSV. Required columns are `timestamp`, `event_type` (auth_success, auth_failure, conn, http_request) and `src_ip`. Optional columns are `event_id`, `dst_ip`, `dst_port`, `username`, `service`, `status`.

## Technologies used

* Python 3.11 or newer
* pandas, for tables
* matplotlib, for charts
* requests, for the optional live fetch (disabled by default)
* Jupyter Notebook
* Standard library only for the engine: `ipaddress`, `csv`, `dataclasses`, `datetime`, `socket`
* Extra deliverable: a React, TypeScript and Tailwind browser prototype of the same tool (see below)

## Setup and run

```bash
# 1. Create an environment (recommended)
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Open the notebook
jupyter notebook Vansh_Tellwarden.ipynb
```

In Jupyter choose **Run > Run All Cells**. The notebook needs no internet and finishes in a few seconds. It writes charts and reports to an `outputs/` folder.

To run it without opening a browser:

```bash
jupyter nbconvert --to notebook --execute Vansh_Tellwarden.ipynb --output executed.ipynb
```

## Key information

* **Responsible use.** Scan only systems you own or have written permission to test. The live fetch needs `LIVE_SCAN_ENABLED = True` and `I_HAVE_PERMISSION = True` and is disabled in the submitted notebook.
* **Thresholds are teaching values.** They are not tuned for a real network.
* **Limits.** Fixed thresholds can miss slow attacks and flag busy normal periods. The scanner reads headers only. A good result is not a security guarantee.
* **DNS rebinding.** The live fetch checks the resolved address and then lets the HTTP library resolve again. A production tool should pin the connection to the checked address.
* **Verification.** The notebook was run end to end. Its self-checks cover each scenario, threshold bounds, CSV validation, URL and address guards, export content and a fetch test against a local server.

## Files

| File | Purpose |
|---|---|
| `Vansh_Tellwarden.ipynb` | Complete project code and results |
| `requirements.txt` | Python dependencies |
| `Vansh_ProjectReport.docx` | Full project report |
| `README.md` | This file |

## Browser prototype (extra)

The same rules and sample data are also built as an interactive website (React 19, TypeScript, Vite, Tailwind CSS 4) with a Platform Overview, a scanner page, an IDS page, a rules guide and an about page. It has no backend. Scanner results are labelled demonstrations, and the IDS runs in the browser. To run it, unzip `tellwarden-web.zip`, then:

```bash
npm install
npm run dev
```
