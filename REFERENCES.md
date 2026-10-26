# References

Product: Tellwarden (provisional name, pending clearance)
Date: 25 October 2026

## How to read this file

Access status is stated honestly for each source.

- **Seen in research:** the page or its search extract was seen during the research on 25 October 2026.
- **Seen, extract only:** only a search snippet was available. The direct page could not be fetched.
- **Official page, not opened:** the research relied on well-known official documentation but did not reopen it. The link is the page to confirm against before relying on the claim. The URL was not checked in this session.
- **Reported in research, source not listed:** the research report stated the fact but did not list the page among its sources. Confirm independently.
- **Prepared here:** computed or checked by the author of these documents on 25 October 2026.

## 1. Name research sources (all accessed 25 Oct 2026, seen in research)

| Source | URL | Supports |
|---|---|---|
| Wardline Technologies | https://www.wardline.co/ | Wardline is an Indian web security testing company |
| Crunchbase, Wardline | https://www.crunchbase.com/organization/wardline-technologies-private-limited | Company record |
| GitHub, wardline repos | https://github.com/SagnikBhowmik77/wardline ; https://github.com/Andrei-Barwood/wardline | Same-scope repositories |
| Postern | https://www.amazon.com/Postern-Software/dp/B01ANBNPO8 ; https://trypostern.com/about ; https://posternlabs.com/products ; https://getpostern.vercel.app/ | Existing Postern products |
| Ravelin | https://www.cbinsights.com/company/ravelin ; http://www.ravelin-security.com/about.html | Ravelin fraud platform and security consulting |
| Bartizan | https://bartizansecurity.net/ | Bartizan Security |
| Glacis | https://www.crunchbase.com/organization/glacis ; https://www.glacis.io/ ; https://docs.glacislabs.com/ | Glacis companies and products |
| Merlon | https://securitydelta.nl/news/overview/merlon-security-joins-security-delta-hsd-as-a-premium-partner ; https://merlon-security.eu/ ; https://merlon.ch/ ; https://www.businesswire.com/news/home/20170321005620/en/XYPRO-Technology-Corporation-Acquires-Merlon-Software-Corporation | Merlon companies |
| Gatewarden repos | https://github.com/limitcool/gatewarden ; https://github.com/Michael-A-Kuykendall/gatewarden ; https://github.com/TomCruiseTorpedo/gatewarden | Security repositories with the same name |
| HeaderHawk | https://headerhawk.com/ ; https://github.com/Priya-Saini-1/HeaderHawk ; https://libraries.io/pypi/headerhawk | Product, same-scope repos, PyPI package |
| Embrasure | https://github.com/embrasure-secrets/embrasure ; https://embrasure.dev/ | Secrets manager |
| Redan | https://www.finmag.cz/obchodni-rejstrik/29751551-redan-cybersecurity-laboratory-s-r-o ; https://redanllc.com/information-technology/ | Redan companies |
| Cresset | https://www.cresset-group.com/about/commitment-cybersecurity/ ; https://www.fa-mag.com/news/nearly-2-000-cresset-clients-had-their-data-breached-87194.html | Cresset companies, 2026 breach coverage |
| Gorget | https://github.com/Perruer/gorget | Same-category scanner |
| Ruleskein | https://ruleskein.com/features | Live product |
| Vedette | https://github.com/eyry-security/vedette ; https://ischool.uw.edu/capstone/projects/2024/vedette-streamlining-bug-report-deduplication-googles-android-security | HTTP prober and capstone |
| Tenaille | https://find-and-update.company-information.service.gov.uk/company/07927052 ; https://github.com/Dashy476/tenaille-samples | UK company and CVE tool |
| CyberShield | https://cloud.google.com/security/solutions/secops-cybershield ; https://wizardcyber.com/cybershield-ai/ ; https://cybershield-x.vercel.app/ ; https://cybershieldsec.com/ ; https://cybershield-consulting.com/en/ | Many existing CyberShield names |
| Arpwatch | https://en.wikipedia.org/wiki/Arpwatch | Established network-monitoring tool |
| Warden uses | https://blog.gridinsoft.com/warden-stealer-malware/ ; https://cra.mr/finding-vulnerabilities-with-warden/ | "Warden" suffix is common in security |
| Signal | https://denmark.dealroom.co/companies/signal_sciences ; https://en.wikipedia.org/wiki/Signal_(software) | "Signal" brand proximity |
| Signalkeep | https://signalkeep.com/ | **Seen, extract only.** Appears registered and parked |
| Vantry | https://github.com/pandeivictor7-beep/Vantry | Empty same-name repository |
| Horne Cyber | https://www.crunchbase.com/organization/horne-cyber | Nearby name for Hornwork |

## 2. Trademark and domain process sources

| Source | URL | Supports | Status |
|---|---|---|---|
| IP India public search portal | https://tmrsearch.ipindia.gov.in/tmrpublicsearch | The official search to run manually | **Not searched.** Fetch refused by the research tool |
| Global Trademark Company | https://globaltrademarkcompany.com/blog/india-trademark-search-tmr-database | Background on the TMR database | Seen in research |
| Taxaj | https://www.taxaj.com/learn/trademark-search-india-how-to/ | Basic search without login (secondary) | Seen in research |
| TrademarkIndia | https://www.trademarkindia.pro/trademark-search-india.html | Basic search without login (secondary) | Seen in research |
| Rivalegal | https://rivalegal.in/blog/free-trademark-public-search-before-you-file/ | Portal may ask for one-time verification (secondary, updated Sep 2026) | Seen in research |
| ICANN lookup | https://lookup.icann.org | Manual domain lookup | Not opened. A RDAP request for tellwarden.com from the preparation environment failed to connect, so no domain result exists |

## 3. Spot checks made when preparing these documents (Prepared here, 25 Oct 2026)

| Check | Result |
|---|---|
| Web search for the exact term "Tellwarden" | No relevant result. Not proof that none exists |
| Web search "tellwarden github security scanner" | No relevant result |
| RDAP request for tellwarden.com | No connection from this environment. No domain result |
| WCAG contrast ratios for all colour tokens | Recomputed with the WCAG 2.x relative-luminance formula. All match the research values. Success on Paper is 6.81:1 (the research report gave 6.82:1, a rounding difference) |

## 4. Technical and security sources

| Source | URL | Supports | Status |
|---|---|---|---|
| OWASP HTTP Headers Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html | `no-store` for sensitive responses, `no-cache` does not prevent storage, `X-XSS-Protection: 0`, remove leaking headers | Seen in research |
| OWASP Secure Headers Project, best practices | https://owasp.github.io/www-project-secure-headers/best-practices/ | Proposed values: HSTS `max-age=63072000; includeSubDomains`, `X-Frame-Options: deny`, `nosniff`, `Referrer-Policy: no-referrer`, strict preflight origin validation | **Seen, extract only.** Direct fetch returned 404 |
| SSL.org security headers | https://www.ssl.org/security-headers | COOP, COEP, CORP are situational | Seen in research (secondary) |
| Nikto | https://en.wikipedia.org/wiki/Nikto_(vulnerability_scanner) | GPLv2 command-line scanner, release 2.6.0 (Feb 2026, as reported) | Seen in research |
| GitHub topic: security-scanner | https://github.com/topics/security-scanner | ZAP is listed as "ZAP by Checkmarx" | Seen in research |
| Streamlit documentation | https://docs.streamlit.io/ | Rerun model, session state, caching, threads, file uploader limits, theming keys, static serving, navigation | **Official page, not opened** |
| OWASP SSRF Prevention Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html | Scheme allowlist, resolve and check addresses, redirects, DNS rebinding, metadata endpoints | **Official page, not opened** |
| OWASP Web Security Testing Guide, CORS testing | https://owasp.org/www-project-web-security-testing-guide/ | CORS misconfiguration testing (WSTG-CLNT-07) | **Official page, not opened** |
| MDN, CORS | https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS | Wildcard with credentials is refused by browsers, reflected and `null` origins | **Official page, not opened** |
| MDN, HTTP headers | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers | Header semantics | **Official page, not opened** |
| httpx | https://www.python-httpx.org/ | Timeouts by default, no redirects by default, certificate verification, BSD licence | **Official page, not opened** |
| Python `ipaddress` module | https://docs.python.org/3/library/ipaddress.html | `is_global`, `is_private` and related attributes | **Official page, not opened** |
| MITRE ATT&CK | https://attack.mitre.org/ | T1110 (.001 .003), T1078, T1046, T1499 | **Official page, not opened** |
| NIST SP 800-63B | https://pages.nist.gov/800-63-4/sp800-63b.html | Limit on consecutive failed attempts (no more than 100 per account) | **Reported in research, source not listed.** Confirm on the NIST page |
| fail2ban | https://github.com/fail2ban/fail2ban | Defaults `bantime` 10m, `findtime` 10m, `maxretry` 5 | **Reported in research via a secondary reproduction.** Confirm in `jail.conf` |
| Mozilla HTTP Observatory, securityheaders.com, ZAP baseline, Wazuh, Sigma | https://developer.mozilla.org/en-US/observatory ; https://securityheaders.com ; https://www.zaproxy.org ; https://wazuh.com ; https://sigmahq.io | Comparable tools | **Official pages, not opened** |
| pytest, respx, Streamlit AppTest | https://docs.pytest.org ; https://lundberg.github.io/respx/ ; https://docs.streamlit.io/develop/api-reference/app-testing | Testing approach | **Official pages, not opened** |

## 5. Design and font sources

| Source | URL | Supports | Status |
|---|---|---|---|
| IBM Carbon Design System | https://carbondesignsystem.com/ | Status indicators use shape and text, IBM Plex is its type system | **Official page, not opened** |
| GitHub Primer | https://primer.style/ | Sober dashboard patterns, table density | **Official page, not opened** |
| Atlassian Design System | https://atlassian.design/ | Dashboard patterns | **Official page, not opened** |
| WCAG 2.x | https://www.w3.org/TR/WCAG22/ | Contrast formula and thresholds (4.5:1 text, 3:1 large text and UI) | **Official page, not opened.** The formula was implemented and run (see section 3) |
| IBM Plex | https://github.com/IBM/plex ; https://fonts.google.com/specimen/IBM+Plex+Sans | Licence (SIL OFL 1.1) and files | **Official pages, not opened** |
| Inter, JetBrains Mono, Atkinson Hyperlegible | https://fonts.google.com/specimen/Inter ; https://fonts.google.com/specimen/JetBrains+Mono ; https://fonts.google.com/specimen/Atkinson+Hyperlegible | Alternatives and licences | **Official pages, not opened** |
| LG Muenchen I, 20 Jan 2022, case 3 O 17493/20 | Not linked | Court awarded damages over Google Fonts loaded from Google's servers | **Reported in research, source not listed.** Confirm independently. Not legal advice |

## 6. Claims that are not supported by any source here

- That Tellwarden is legally available, unique or free of conflicts. **No source supports this.**
- That tellwarden.com or tellwarden.in is available or taken. **Not checked.**
- That the detection thresholds are right for any real environment. They are teaching values.
