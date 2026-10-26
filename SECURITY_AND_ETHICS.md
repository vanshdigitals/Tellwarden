# Security and Ethics

Product: Tellwarden (provisional name, pending clearance)
Date: 25 October 2026
Related: `PRD.md`, `TRD.md`, `TEST_PLAN.md`
Evidence tags: see `README.md`.

## 1. Purpose

This document sets the rules for safe and ethical use. It defines the security requirements (SEC-01 to SEC-18) that the design must meet. Tellwarden is an educational prototype. It is not production security software.

## 2. Authorised-use policy

- Scan only websites you own or have **written permission** to test.
- Do not scan third-party sites, government sites, banks or anyone else's systems without permission.
- Do not use Tellwarden to prepare, support or carry out an attack.
- Upload only event data you are allowed to process. Remove personal data first where possible.
- The user must tick this statement before every scan (SEC-09):

> I own this website or I have permission to test it. I understand that Tellwarden checks only a few settings and does not prove a site is secure.

- The About page states: unauthorised scanning may be illegal in your country. The project owner is not responsible for misuse.

## 3. What the scanner does and does not do

| Does | Does not |
|---|---|
| Sends a small number of ordinary GET, HEAD or OPTIONS requests with no body | Crawl, spider or follow links |
| Reads response headers and the TLS result | Download, save, render or run site content |
| Follows at most 3 validated redirects | Send cookies, credentials or custom auth |
| Identifies itself with a clear User-Agent | Hide its identity or spoof a browser |
| Stops at the request budget and the time limit | Retry in loops or run in the background |
| Tests CORS with 3 or 4 harmless requests | Exploit, fuzz, brute force or port scan |

## 4. Security requirements

| ID | Requirement | Area | Test |
|---|---|---|---|
| SEC-01 | Only `http` and `https` schemes are accepted. All others are rejected | Input | TC-URL-01 |
| SEC-02 | Reject credentials in the URL, ports other than 80 and 443, URLs longer than 2048 characters and malformed hosts | Input | TC-URL-03 to TC-URL-07 |
| SEC-03 | Resolve the host. If any returned address is not a public global address, refuse. Covers IPv4 and IPv6, loopback, private, link-local, reserved, multicast, unspecified, CGNAT, benchmarking and IPv4-mapped forms (unwrapped and rechecked) | SSRF | TC-NET-01 to TC-NET-07 |
| SEC-04 | Block cloud metadata addresses (169.254.169.254, fd00:ec2::254) and names (`localhost`, `metadata.google.internal`) | SSRF | TC-NET-03, TC-NET-08 |
| SEC-05 | Disable automatic redirects. Follow at most 3 manually. Run SEC-01 to SEC-04 on every hop. Flag an https to http downgrade | SSRF | TC-NET-09 to TC-NET-11 |
| SEC-06 | Connect timeout 3 s, read timeout 5 s, overall scan deadline 20 s | Resilience | TC-HTTP-01, TC-HTTP-02, TC-HTTP-06 |
| SEC-07 | Never render, execute or save fetched content. Read no body in the MVP. Hard cap of 1 MB on any body read | Resilience | TC-HTTP-03, TC-SEC-04 |
| SEC-08 | TLS certificate verification is always on. `verify=False` is never used. A certificate error is reported as a Fail | Transport | TC-HTTP-05, TC-HTTPS-03 |
| SEC-09 | Scanning is blocked until the authorisation statement is ticked | Ethics | TC-SCN-01 |
| SEC-10 | At most 10 requests per scan. Methods limited to GET, HEAD and OPTIONS. No request body, cookies or custom auth | Scope | TC-HTTP-04 |
| SEC-11 | A 10-second cooldown between scans per session | Abuse | TC-SCN-03 |
| SEC-12 | HTML reports autoescape all values, including header values reflected from targets | Output | TC-RPT-02, TC-SEC-05 |
| SEC-13 | No scan target or uploaded content is stored beyond the browser session. Logs hold host names only, never full URLs, query strings, headers values or uploaded content | Privacy | TC-SEC-01 |
| SEC-14 | No setting, environment variable or UI option disables or relaxes the address blocklist. Tests use an injected resolver instead | SSRF | TC-NET-13 |
| SEC-15 | The IDS processes only bundled samples or data the user uploads or types. No packet capture, no stealth monitoring, no automatic response, no network connections | IDS | TC-SEC-02 |
| SEC-16 | Uploads are validated for type, size (5 MB) and rows (50,000), parsed as data only. Exported CSV neutralises cells starting with `=`, `+`, `-` or `@` | Input | TC-EVT-02, TC-EVT-03, TC-RPT-06 |
| SEC-17 | Fonts are self-hosted. The UI makes no third-party requests. The only outbound requests are to the scan target | Privacy | TC-SEC-02 |
| SEC-18 | Dependencies are pinned. A dependency audit (for example `pip-audit`) runs before each release | Supply chain | TC-SEC-03 |

## 5. SSRF protections: local prototype and public deployment

**[Docs, not re-fetched]** The OWASP SSRF Prevention Cheat Sheet recommends scheme allowlists, resolving the hostname and checking every returned address, not following redirects automatically, awareness of DNS rebinding and blocking cloud metadata endpoints. SEC-01 to SEC-07 apply that advice.

| Protection | Local prototype | Public deployment |
|---|---|---|
| Scheme allowlist, port allowlist, URL limits | Yes | Yes |
| Resolve and block non-public addresses | Yes | Yes |
| Manual redirects with revalidation | Yes | Yes |
| Timeouts, body cap, request budget | Yes | Yes |
| Connect to the validated IP to prevent DNS rebinding | Documented limitation. Optional hardening (D-10) | Required |
| Network egress filtering (deny private ranges and metadata at firewall or container level) | Not applicable, runs on the user's machine | Required |
| Sandboxed execution (container, minimal privileges) | Not needed | Required |
| Per-IP rate limiting | Per-session cooldown only | Required |
| Authentication or CAPTCHA | Not needed | Required |
| Abuse logging and takedown contact | Not needed | Required |
| Terms of use stating authorised scanning only | Policy text | Required |

**Residual risk in the local prototype:** between address validation and the actual connection, a hostile DNS server could return a different address (DNS rebinding). On a user's own machine, the person who types the URL is also the person at risk, which limits the impact. This is documented in the About page and must be fixed before any public hosting.

## 6. Public deployment gate

Do not deploy Tellwarden publicly until all of the following are done: pinned-IP connection, egress filtering, rate limiting, authentication or CAPTCHA, sandboxed runtime, abuse logging, terms of use and a completed review of this document.

## 7. Privacy

- No accounts, no tracking, no analytics and no third-party requests from the UI (SEC-17).
- Scan results and uploads live in the Streamlit session and disappear when the session ends (SEC-13).
- Application logs contain host names, timestamps and result counts only.
- Downloaded reports contain the target host and findings. The user is responsible for where they store or share them.
- Uploaded event data can contain IP addresses and usernames, which are personal data in many laws. Use sample data or anonymised data. The app does not transmit uploaded data anywhere.

## 8. IDS honesty and limits

- The simulator is an **offline analysis of sample or uploaded data**. It is not real-time monitoring and does not see a network.
- Rules are fixed and documented. There is no AI, no machine learning and no model training.
- Thresholds are illustrative teaching values taken from common conventions. They are not tuned to any environment.
- Rules produce false positives and false negatives. Each rule page lists known false positives.
- The tool recommends responses in text only. It never takes action.
- A clean result does not mean no attack happened.

## 9. Scanner honesty and limits

- Header and CORS checks are **configuration hygiene checks**. A good result does not mean a site is secure.
- Only one URL is tested, without login. Other paths, subdomains or authenticated areas can behave differently.
- A basic CORS check cannot show whether sensitive data is exposed.
- Results depend on the moment of the scan and on the network path (CDN, WAF, geo rules).
- The tool does not find application vulnerabilities such as injection, broken access control or logic flaws.

## 10. Responsible disclosure

If the scanner finds a serious problem on a site you do not own, do not exploit it. Contact the site owner, preferably through a published `security.txt` or security contact, and give them reasonable time to fix it. Do not publish details before they respond.

## 11. Ethics statement

Tellwarden exists to teach. It should make defenders better informed. It must not lower the effort needed to harm others. Features that would do so, such as crawling, exploitation, brute forcing, hiding the scanner's identity or automated attacks, are permanently out of scope.

## 12. Required wording in the UI

| Location | Text |
|---|---|
| Web Scanner banner | "Scan only sites you own or have permission to test. This tool checks a few configuration settings. A good result does not mean a site is secure." |
| IDS Simulator banner | "Offline simulation of sample data. This is not live network monitoring." |
| Report footer | "Generated by Tellwarden (educational prototype). Results show selected configuration checks at the time of the scan and are not a security guarantee." |
| About and Limits | Sections 2, 3, 8 and 9 of this document in plain language |
