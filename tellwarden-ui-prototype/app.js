/**
 * Tellwarden - Security Analysis Workspace
 * Vanilla JavaScript Multi-View Application Controller
 */

(function () {
  'use strict';

  // --- Sample Dataset (Strictly using RFC documentation ranges and example.test) ---
  const SAMPLE_FINDINGS = [
    {
      id: 'FIND-001',
      title: 'AUTH-001: SSH Brute Force Detected',
      module: 'ids',
      moduleLabel: 'IDS Simulator',
      status: 'Fail',
      severity: 'High',
      timeUtc: '2026-10-25 21:14:02 UTC',
      entity: '198.51.100.42 (ssh)',
      observed: '18 failed login attempts for username "root" within 120s (threshold: 5 failures / 300s).',
      explanation: 'Repeated authentication failures from a single source indicate an automated credential-guessing attack. Left unmitigated, weak passwords may be compromised.',
      remediation: 'Implement rate-limiting or fail2ban rules on the perimeter SSH port. Enforce SSH key-based authentication and disable direct root login.'
    },
    {
      id: 'FIND-002',
      title: 'HSTS max-age >= 31536000 with subdomains',
      module: 'web',
      moduleLabel: 'Web Scanner',
      status: 'Pass',
      severity: 'None',
      timeUtc: '2026-10-25 21:12:15 UTC',
      entity: 'https://example.test',
      observed: 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
      explanation: 'HTTP Strict Transport Security protects users against protocol downgrade attacks and cookie hijacking by forcing browsers to use HTTPS exclusively.',
      remediation: 'Configuration is optimal. Ensure certificates are renewed automatically before expiry to avoid service lockouts.'
    },
    {
      id: 'FIND-003',
      title: 'Content-Security-Policy contains unsafe-inline',
      module: 'web',
      moduleLabel: 'Web Scanner',
      status: 'Warning',
      severity: 'Medium',
      timeUtc: '2026-10-25 21:12:15 UTC',
      entity: 'https://example.test',
      observed: "script-src 'self' 'unsafe-inline' https://cdn.example.test",
      explanation: "Allowing 'unsafe-inline' in script-src significantly diminishes CSP protection against Cross-Site Scripting (XSS) by allowing inline script execution.",
      remediation: "Refactor inline scripts into external files or use cryptographic nonces/hashes (e.g., 'nonce-...') to authorize specific trusted scripts."
    },
    {
      id: 'FIND-004',
      title: 'NET-001: Vertical Port Scan Pattern',
      module: 'ids',
      moduleLabel: 'IDS Simulator',
      status: 'Fail',
      severity: 'Critical',
      timeUtc: '2026-10-25 21:10:48 UTC',
      entity: '203.0.113.19 -> 192.0.2.10',
      observed: '24 distinct destination ports targeted within 45s (ports 21, 22, 23, 25, 80, 443, 3389, ...).',
      explanation: 'Rapid reconnaissance of multiple ports on a single host is typical of automated scanners (e.g., Nmap) seeking open network services.',
      remediation: 'Inspect firewall logs for anomalous traffic from 203.0.113.19. Block or throttle aggressive inbound reconnaissance probes at the border router.'
    },
    {
      id: 'FIND-005',
      title: 'X-Content-Type-Options: nosniff present',
      module: 'web',
      moduleLabel: 'Web Scanner',
      status: 'Pass',
      severity: 'None',
      timeUtc: '2026-10-25 21:12:15 UTC',
      entity: 'https://example.test',
      observed: 'X-Content-Type-Options: nosniff',
      explanation: 'Prevents MIME-type confusion attacks where browsers might execute untrusted uploads (e.g., images) as HTML or JavaScript.',
      remediation: 'Header is properly set across all responses.'
    },
    {
      id: 'FIND-006',
      title: 'CORS Origin Reflection with Credentials',
      module: 'web',
      moduleLabel: 'Web Scanner',
      status: 'Needs Review',
      severity: 'Medium',
      timeUtc: '2026-10-25 21:12:15 UTC',
      entity: 'https://example.test/api/user',
      observed: 'Access-Control-Allow-Origin: https://cors-check.invalid with Access-Control-Allow-Credentials: true',
      explanation: 'Reflecting arbitrary test origins while permitting credentials can allow malicious third-party websites to extract sensitive user data via cross-origin requests.',
      remediation: 'Validate incoming Origin headers against an explicit, strict allowlist of trusted partner origins before returning CORS headers.'
    },
    {
      id: 'FIND-007',
      title: 'AUTH-004: Off-Hours Admin Login',
      module: 'ids',
      moduleLabel: 'IDS Simulator',
      status: 'Warning',
      severity: 'Low',
      timeUtc: '2026-10-25 21:05:30 UTC',
      entity: '192.0.2.88 (admin)',
      observed: 'Successful auth_success event recorded at 03:45 local time outside standard 07:00-20:00 UTC window.',
      explanation: 'Logins during unusual hours can be noisy, but serve as an early indicator of credential misuse or unauthorized remote worker activity.',
      remediation: 'Correlate with administrator work schedules and multi-factor authentication (MFA) logs to verify employee authorization.'
    }
  ];

  // --- Complete Scanner Checks Catalog (17 Checks: 4 HTTPS, 11 Headers, 2 CORS) ---
  const SCANNER_CHECKS = [
    {
      id: 'HTTPS-01',
      category: 'https',
      title: 'Final URL Scheme Verification',
      status: 'Pass',
      observed: 'https://example.test/',
      expected: 'Scheme must be https://',
      explanation: 'Verifies the connection terminates on a secure HTTPS protocol preventing plaintext eavesdropping.',
      remediation: 'Ensure web server redirects all unencrypted HTTP traffic to HTTPS.'
    },
    {
      id: 'HTTPS-02',
      category: 'https',
      title: 'TLS Certificate Verification',
      status: 'Pass',
      observed: 'Valid (Let\'s Encrypt Authority X3, expires in 284 days, SAN matches host)',
      expected: 'Certificate valid, trusted CA root, unexpired, hostname matches',
      explanation: 'Validates transport security and authenticity of server certificate.',
      remediation: 'Maintain automated ACME cert-renewal pipeline.'
    },
    {
      id: 'HTTPS-03',
      category: 'https',
      title: 'HTTP to HTTPS Port 80 Redirect',
      status: 'Pass',
      observed: 'HTTP/1.1 301 Moved Permanently -> Location: https://example.test/',
      expected: '301/308 redirect from port 80 to port 443 on same host',
      explanation: 'Directs users visiting via plain HTTP to the encrypted equivalent immediately.',
      remediation: 'Configure server to return 301/308 redirects on port 80.'
    },
    {
      id: 'HTTPS-04',
      category: 'https',
      title: 'Redirect Chain Downgrade Check',
      status: 'Pass',
      observed: '1 redirect hop followed: http://example.test -> https://example.test',
      expected: 'No hops downgrade from https to http',
      explanation: 'Guarantees unencrypted hops are not injected into the redirection sequence.',
      remediation: 'Audit reverse proxy or CDN redirection rules.'
    },
    {
      id: 'HDR-01',
      category: 'headers',
      title: 'Strict-Transport-Security (HSTS)',
      status: 'Pass',
      observed: 'max-age=63072000; includeSubDomains; preload',
      expected: 'max-age >= 31536000 with includeSubDomains',
      explanation: 'Instructs browsers to load website over HTTPS exclusively for the next 2 years.',
      remediation: 'Deploy HSTS header with max-age >= 31536000.'
    },
    {
      id: 'HDR-02',
      category: 'headers',
      title: 'Content-Security-Policy (CSP)',
      status: 'Warning',
      observed: "script-src 'self' 'unsafe-inline' https://cdn.example.test; object-src 'none'",
      expected: "Present, no 'unsafe-inline' or '*' in script-src, object-src 'none'",
      explanation: "Allowing 'unsafe-inline' enables inline JavaScript execution, weakening XSS defenses.",
      remediation: "Eliminate 'unsafe-inline' by refactoring inline scripts or supplying cryptographic nonces."
    },
    {
      id: 'HDR-03',
      category: 'headers',
      title: 'X-Content-Type-Options',
      status: 'Pass',
      observed: 'nosniff',
      expected: 'nosniff',
      explanation: 'Disables MIME-sniffing, preventing browsers from executing uploads as scripts.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-04',
      category: 'headers',
      title: 'Framing Protection (Clickjacking)',
      status: 'Pass',
      observed: 'X-Frame-Options: DENY (CSP frame-ancestors \'none\' also present)',
      expected: "X-Frame-Options DENY/SAMEORIGIN or CSP frame-ancestors 'none'/'self'",
      explanation: 'Prevents third-party malicious sites from rendering this site inside an iframe.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-05',
      category: 'headers',
      title: 'Referrer-Policy',
      status: 'Pass',
      observed: 'strict-origin-when-cross-origin',
      expected: 'strict-origin-when-cross-origin, same-origin, or no-referrer',
      explanation: 'Limits referrer data leakage across cross-origin requests.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-06',
      category: 'headers',
      title: 'Permissions-Policy',
      status: 'Warning',
      observed: '(Header absent)',
      expected: 'Permissions-Policy restricting unused browser APIs (geolocation, camera, microphone)',
      explanation: 'Controls which powerful browser features and APIs are enabled in the page context.',
      remediation: 'Define Permissions-Policy: camera=(), microphone=(), geolocation=().'
    },
    {
      id: 'HDR-07',
      category: 'headers',
      title: 'Cross-Origin-Opener-Policy (COOP)',
      status: 'Pass',
      observed: 'same-origin',
      expected: 'same-origin (or not present for non-isolated pages)',
      explanation: 'Isolates top-level browsing context to protect against Spectre-style side-channel attacks.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-08',
      category: 'headers',
      title: 'Cross-Origin-Resource-Policy (CORP)',
      status: 'Pass',
      observed: 'same-origin',
      expected: 'same-origin or same-site',
      explanation: 'Blocks unauthorized cross-origin no-cors reads of static assets.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-09',
      category: 'headers',
      title: 'Cache-Control for Sensitive Responses',
      status: 'Pass',
      observed: 'no-store, max-age=0',
      expected: 'no-store when response sets session cookies',
      explanation: 'Prevents shared caches and browser histories from caching sensitive session responses.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'HDR-10',
      category: 'headers',
      title: 'Server & Tech Stack Information Disclosure',
      status: 'Warning',
      observed: 'Server: nginx/1.24.0 (Ubuntu)',
      expected: 'Server absent or generic; no version numbers disclosed',
      explanation: 'Disclosing precise web server version numbers assists attackers in CVE vulnerability targeting.',
      remediation: 'Set server_tokens off; in nginx configuration to omit version numbers.'
    },
    {
      id: 'HDR-11',
      category: 'headers',
      title: 'X-XSS-Protection (Legacy)',
      status: 'Pass',
      observed: '0',
      expected: 'Absent or 0 (deprecated auditor disabled to prevent side-channel leaks)',
      explanation: 'Modern browsers recommend setting to 0 or omitting in favor of CSP.',
      remediation: 'Header is set properly.'
    },
    {
      id: 'CORS-01',
      category: 'cors',
      title: 'CORS Baseline Origin Probe',
      status: 'Pass',
      observed: 'No Access-Control-Allow-Origin header returned on anonymous GET request',
      expected: 'No wildcard or reflection on standard endpoints',
      explanation: 'Confirms endpoint does not expose permissive cross-origin data by default.',
      remediation: 'Configuration is optimal.'
    },
    {
      id: 'CORS-03',
      category: 'cors',
      title: 'Arbitrary Test Origin Reflection',
      status: 'Warning',
      observed: 'Access-Control-Allow-Origin: https://cors-check.invalid (without credentials)',
      expected: 'Refuse unverified test origin or return explicit allowlist',
      explanation: 'Reflecting test origins indicates dynamic header reflection without strict origin checking.',
      remediation: 'Validate incoming Origin header against an explicit allowlist.'
    }
  ];

  // --- Complete Detection Rules Catalog (7 Documented Rules) ---
  const RULES_CATALOG = [
    {
      id: 'AUTH-001',
      name: 'Authentication Brute Force',
      type: 'count_in_window',
      severity: 'High',
      attackId: 'T1110.001',
      attackName: 'Password Guessing',
      logic: 'At least 5 auth_failure events from a single src_ip targeting one service within 300 seconds.',
      defaultParams: 'Threshold: 5 failures &middot; Window: 300s',
      bounds: 'Threshold: 2 to 50 &middot; Window: 30 to 3,600s',
      falsePositives: 'Users with outdated saved passwords or batch connection attempts from misconfigured internal client machines.',
      playbook: 'Correlate with source geolocation. Temporarily rate-limit or ban the offending IP at perimeter firewall or fail2ban jail.'
    },
    {
      id: 'AUTH-002',
      name: 'Password Spraying Attack',
      type: 'distinct_in_window',
      severity: 'High',
      attackId: 'T1110.003',
      attackName: 'Password Spraying',
      logic: 'One src_ip attempts auth_failure against at least 10 distinct usernames within 600s, with each user tried <= 2 times.',
      defaultParams: 'Distinct Users: 10 &middot; Window: 600s &middot; Per-User Max: 2',
      bounds: 'Distinct Users: 3 to 100 &middot; Window: 60 to 3,600s',
      falsePositives: 'External single-sign-on sync jobs or vulnerability assessment scanners performing authorized baseline checks.',
      playbook: 'Enforce MFA across all affected accounts immediately. Verify if any authentication succeeded from the same source IP.'
    },
    {
      id: 'AUTH-003',
      name: 'Successful Login After Failures',
      type: 'failures_then_success',
      severity: 'Critical',
      attackId: 'T1110, T1078',
      attackName: 'Valid Accounts via Brute Force',
      logic: 'An auth_success event occurs for a username/IP that logged at least 5 consecutive auth_failure events in the prior 600 seconds.',
      defaultParams: 'Preceding Failures: 5 &middot; Window: 600s',
      bounds: 'Preceding Failures: 2 to 50 &middot; Window: 60 to 3,600s',
      falsePositives: 'Legitimate user who forgot their password and recalled it after several unsuccessful attempts.',
      playbook: 'High priority. Reach out to the user to confirm legitimate access. Audit subsequent actions performed in the authenticated session.'
    },
    {
      id: 'AUTH-004',
      name: 'Unusual Hour Administrator Login',
      type: 'time_of_day',
      severity: 'Low',
      attackId: 'T1078',
      attackName: 'Valid Accounts',
      logic: 'An auth_success event occurs outside standard configured business hours (07:00 to 20:00 UTC) for privileged roles.',
      defaultParams: 'Active Business Window: 07:00 to 20:00 UTC',
      bounds: 'Start/End Hour: 00:00 to 23:59',
      falsePositives: 'Legitimate on-call engineers resolving off-hours operational incidents or international staff working in different time zones.',
      playbook: 'Cross-reference with on-call roster and ticket management system. Low urgency alert designed for audit trail correlation.'
    },
    {
      id: 'NET-001',
      name: 'Vertical Port Reconnaissance',
      type: 'distinct_in_window',
      severity: 'Medium',
      attackId: 'T1046',
      attackName: 'Network Service Discovery',
      logic: 'A single src_ip probes at least 15 distinct dst_port values on a single dst_ip within 60 seconds.',
      defaultParams: 'Distinct Ports: 15 &middot; Window: 60s',
      bounds: 'Distinct Ports: 5 to 200 &middot; Window: 10 to 600s',
      falsePositives: 'Internal vulnerability scanners (e.g., Nessus, OpenVAS) or diagnostic network troubleshooting commands.',
      playbook: 'Inspect connection logs to identify targeted ports. Block inbound scanning IPs at edge perimeter router.'
    },
    {
      id: 'NET-002',
      name: 'Horizontal Subnet Scan',
      type: 'distinct_in_window',
      severity: 'Medium',
      attackId: 'T1046',
      attackName: 'Network Service Discovery',
      logic: 'One src_ip contacts at least 10 distinct dst_ip addresses on the same dst_port within 60 seconds.',
      defaultParams: 'Distinct Hosts: 10 &middot; Window: 60s',
      bounds: 'Distinct Hosts: 3 to 200 &middot; Window: 10 to 600s',
      falsePositives: 'P2P applications, cluster broadcast protocols, or centralized monitoring agents polling server health.',
      playbook: 'Verify whether the source is an internal device compromised by lateral movement malware.'
    },
    {
      id: 'WEB-001',
      name: 'High-Frequency Request Burst',
      type: 'count_in_window',
      severity: 'Medium',
      attackId: 'T1499',
      attackName: 'Endpoint Denial of Service',
      logic: 'More than 100 http_request events recorded from a single src_ip within 60 seconds.',
      defaultParams: 'Threshold: 100 requests &middot; Window: 60s',
      bounds: 'Threshold: 20 to 5,000 &middot; Window: 10 to 600s',
      falsePositives: 'Search engine web crawlers, CDN edge proxies, or heavily dynamic SPA applications loading many assets concurrently.',
      playbook: 'Examine requested URI endpoints and User-Agent strings. Implement application-level token-bucket rate limiting.'
    }
  ];

  // --- Complete IDS Sample Findings (with MITRE ATT&CK & Evidence counts) ---
  const IDS_FINDINGS = [
    {
      id: 'IDS-001',
      ruleId: 'AUTH-001',
      ruleName: 'SSH Brute Force',
      severity: 'High',
      attackTechnique: 'T1110.001',
      entity: '198.51.100.42 (ssh)',
      evidenceCount: 18,
      windowText: '120s (Threshold: 5)',
      timeUtc: '2026-10-25 21:14:02 UTC'
    },
    {
      id: 'IDS-002',
      ruleId: 'NET-001',
      ruleName: 'Vertical Port Scan',
      severity: 'Critical',
      attackTechnique: 'T1046',
      entity: '203.0.113.19 -> 192.0.2.10',
      evidenceCount: 24,
      windowText: '45s (Threshold: 15)',
      timeUtc: '2026-10-25 21:10:48 UTC'
    },
    {
      id: 'IDS-003',
      ruleId: 'AUTH-002',
      ruleName: 'Password Spraying',
      severity: 'High',
      attackTechnique: 'T1110.003',
      entity: '198.51.100.99 (web-auth)',
      evidenceCount: 15,
      windowText: '380s (Threshold: 10)',
      timeUtc: '2026-10-25 21:08:12 UTC'
    },
    {
      id: 'IDS-004',
      ruleId: 'WEB-001',
      ruleName: 'Request Burst Anomaly',
      severity: 'Medium',
      attackTechnique: 'T1499',
      entity: '203.0.113.84 (/api/v1)',
      evidenceCount: 142,
      windowText: '60s (Threshold: 100)',
      timeUtc: '2026-10-25 21:06:50 UTC'
    },
    {
      id: 'IDS-005',
      ruleId: 'AUTH-004',
      ruleName: 'Unusual Hour Admin Login',
      severity: 'Medium',
      attackTechnique: 'T1078',
      entity: '192.0.2.88 (admin)',
      evidenceCount: 1,
      windowText: 'Off-hours (03:45 UTC)',
      timeUtc: '2026-10-25 21:05:30 UTC'
    }
  ];

  // --- DOM Elements ---
  const sidebar = document.getElementById('app-sidebar');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const drawerScrim = document.getElementById('drawer-scrim');
  const breadcrumbRoot = document.getElementById('breadcrumb-root');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');

  // Overview elements
  const tableBody = document.getElementById('findings-table-body');
  const tableEmptyState = document.getElementById('table-empty-state');
  const searchInput = document.getElementById('findings-search');
  const clearFiltersBtn = document.getElementById('btn-clear-filters');
  const filterChips = document.querySelectorAll('.filter-chips-wrapper .chip');
  const resetDemoBtn = document.getElementById('btn-reset-demo');
  const exportReportBtn = document.getElementById('btn-export-report');
  const toastContainer = document.getElementById('toast-container');

  // Scanner elements
  const scannerUrlInput = document.getElementById('scanner-url-input');
  const scannerConsentCheckbox = document.getElementById('scanner-consent-checkbox');
  const btnRunScan = document.getElementById('btn-run-scan');
  const btnQuickTarget = document.getElementById('btn-quick-target');
  const scannerChecksList = document.getElementById('scanner-checks-list');
  const btnExportScannerReport = document.getElementById('btn-export-scanner-report');

  // IDS elements
  const btnRunIds = document.getElementById('btn-run-ids');
  const btnExportIdsCsv = document.getElementById('btn-export-ids-csv');
  const idsFindingsTableBody = document.getElementById('ids-findings-table-body');
  const rulesCatalogContainer = document.getElementById('rules-catalog-container');

  // Modal Elements
  const modalDialog = document.getElementById('finding-dialog');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalStatusBadge = document.getElementById('modal-status-badge');
  const modalSeverityBadge = document.getElementById('modal-severity-badge');
  const modalTime = document.getElementById('modal-time');
  const modalEntity = document.getElementById('modal-entity');
  const modalObservation = document.getElementById('modal-observation');
  const modalExplanation = document.getElementById('modal-explanation');
  const modalRemediation = document.getElementById('modal-remediation');

  // --- State Variables ---
  let activeView = 'overview';
  let activeModuleFilter = 'all';
  let searchQuery = '';
  let activeCheckFilter = 'all';

  // --- Toast Notification Helper ---
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Navigation & Sidebar Control ---
  function isDesktop() {
    return window.innerWidth > 1100;
  }

  function toggleSidebar() {
    if (isDesktop()) {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      hamburgerBtn.setAttribute('aria-expanded', !isCollapsed);
    } else {
      const isOpen = document.body.classList.toggle('sidebar-open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  function closeMobileSidebar() {
    if (!isDesktop() && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // --- Multi-View Routing ---
  function switchView(viewId) {
    activeView = viewId;

    // Update active view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.style.display = 'none';
    });

    const targetPanel = document.getElementById(`view-${viewId}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.style.display = 'block';
    }

    // Update sidebar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      const isCurrent = item.getAttribute('data-view') === viewId;
      item.classList.toggle('active', isCurrent);
      if (isCurrent) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    // Update breadcrumbs
    if (breadcrumbRoot && breadcrumbCurrent) {
      switch (viewId) {
        case 'overview':
          breadcrumbRoot.textContent = 'Platform';
          breadcrumbCurrent.textContent = 'Overview';
          break;
        case 'web-scanner':
          breadcrumbRoot.textContent = 'Module A';
          breadcrumbCurrent.textContent = 'Web Security Scanner';
          break;
        case 'ids-simulator':
          breadcrumbRoot.textContent = 'Module B';
          breadcrumbCurrent.textContent = 'Offline IDS Simulator';
          break;
        case 'rules-guide':
          breadcrumbRoot.textContent = 'Reference';
          breadcrumbCurrent.textContent = 'Detection Rules Guide';
          break;
        case 'about':
          breadcrumbRoot.textContent = 'Reference';
          breadcrumbCurrent.textContent = 'About & Limitations';
          break;
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileSidebar();
  }

  // --- Status & Severity Badge Renderers ---
  function renderStatusBadge(status) {
    let icon = '';
    let badgeClass = 'review';
    let text = status.toUpperCase();

    switch (status) {
      case 'Pass':
        badgeClass = 'pass';
        icon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        break;
      case 'Warning':
        badgeClass = 'warning';
        icon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        break;
      case 'Fail':
        badgeClass = 'fail';
        icon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        break;
      default:
        badgeClass = 'review';
        icon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        text = 'REVIEW';
        break;
    }

    return `<span class="badge-status ${badgeClass}">${icon}<span>${text}</span></span>`;
  }

  function renderSeverityBadge(severity) {
    const sev = severity.toLowerCase();
    return `<span class="badge-severity ${sev}"><span>${escapeHtml(severity)}</span></span>`;
  }

  // --- Render Overview Findings Table ---
  function renderOverviewTable() {
    if (!tableBody) return;

    const filtered = SAMPLE_FINDINGS.filter(item => {
      const matchesModule = (activeModuleFilter === 'all') || (item.module === activeModuleFilter);
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.entity.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.severity.toLowerCase().includes(q);

      return matchesModule && matchesSearch;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      if (tableEmptyState) tableEmptyState.style.display = 'flex';
      return;
    }

    if (tableEmptyState) tableEmptyState.style.display = 'none';

    tableBody.innerHTML = filtered.map(item => `
      <tr data-id="${item.id}">
        <td>
          <button type="button" class="finding-title-btn" data-action="view-finding" data-id="${item.id}">
            <span>${escapeHtml(item.title)}</span>
            <span class="finding-entity-subtext">${escapeHtml(item.entity)}</span>
          </button>
        </td>
        <td>${renderStatusBadge(item.status)}</td>
        <td>${renderSeverityBadge(item.severity)}</td>
        <td><span class="time-mono">${escapeHtml(item.timeUtc.replace(' UTC', ''))}</span></td>
      </tr>
    `).join('');
  }

  // --- Render Scanner Checks Catalog ---
  function renderScannerChecks() {
    if (!scannerChecksList) return;

    const filtered = SCANNER_CHECKS.filter(c => {
      if (activeCheckFilter === 'all') return true;
      return c.category === activeCheckFilter;
    });

    scannerChecksList.innerHTML = filtered.map(check => `
      <div class="check-item-row">
        <div class="check-item-top">
          <div class="check-title-group">
            <span class="check-id-tag">${check.id}</span>
            <span class="check-name">${escapeHtml(check.title)}</span>
          </div>
          <div>${renderStatusBadge(check.status)}</div>
        </div>
        <div class="check-details-grid">
          <div class="check-detail-col">
            <span class="check-label">Observed Value:</span>
            <code class="check-observed-code">${escapeHtml(check.observed)}</code>
            <span class="check-label" style="margin-top: 6px;">Expected Standard:</span>
            <span style="font-size: 12px; color: var(--color-slate);">${escapeHtml(check.expected)}</span>
          </div>
          <div class="check-detail-col">
            <span class="check-label">Why It Matters:</span>
            <p class="check-remediation-text">${escapeHtml(check.explanation)}</p>
            <span class="check-label" style="margin-top: 6px;">Remediation Advice:</span>
            <p class="check-remediation-text" style="color: var(--color-rampart-navy); font-weight: 500;">${escapeHtml(check.remediation)}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --- Render IDS Findings Table ---
  function renderIdsFindings() {
    if (!idsFindingsTableBody) return;

    idsFindingsTableBody.innerHTML = IDS_FINDINGS.map(item => `
      <tr>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <strong style="color: var(--color-rampart-navy); font-size: 14px;">${escapeHtml(item.ruleId)}: ${escapeHtml(item.ruleName)}</strong>
            <span style="font-size: 12px; color: var(--color-slate);">${escapeHtml(item.timeUtc)}</span>
          </div>
        </td>
        <td>${renderSeverityBadge(item.severity)}</td>
        <td>
          <span class="badge-module" style="background-color: #EEF2F6; color: var(--color-rampart-navy); border-color: var(--border-strong);">
            ${escapeHtml(item.attackTechnique)}
          </span>
        </td>
        <td><code class="modal-code">${escapeHtml(item.entity)}</code></td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-signal-teal);">
            ${item.evidenceCount} events
          </span>
        </td>
        <td><span style="font-size: 13px; color: var(--color-slate);">${escapeHtml(item.windowText)}</span></td>
      </tr>
    `).join('');
  }

  // --- Render Rules Catalog ---
  function renderRulesCatalog() {
    if (!rulesCatalogContainer) return;

    rulesCatalogContainer.innerHTML = RULES_CATALOG.map(rule => `
      <article class="rule-card">
        <div class="rule-card-header">
          <div class="rule-header-left">
            <span class="rule-id-badge">${rule.id}</span>
            <h3 class="rule-title">${escapeHtml(rule.name)}</h3>
          </div>
          <div>${renderSeverityBadge(rule.severity)}</div>
        </div>
        <div class="rule-body">
          <div class="rule-meta-row">
            <span class="rule-meta-tag"><strong>Engine Type:</strong> <code>${escapeHtml(rule.type)}</code></span>
            <span class="rule-meta-tag"><strong>ATT&amp;CK Technique:</strong> <span class="badge-module">${escapeHtml(rule.attackId)}</span> ${escapeHtml(rule.attackName)}</span>
          </div>
          <p class="rule-desc"><strong>Detection Logic:</strong> ${escapeHtml(rule.logic)}</p>
          <div class="rule-specs-grid">
            <div class="rule-spec-box">
              <span class="rule-spec-title">Parameter Defaults &amp; Allowed Bounds</span>
              <span class="rule-spec-text"><strong>Default:</strong> ${rule.defaultParams}</span>
              <span class="rule-spec-text"><strong>Allowed Bounds:</strong> ${rule.bounds}</span>
            </div>
            <div class="rule-spec-box">
              <span class="rule-spec-title">Known False Positives</span>
              <p class="rule-spec-text">${escapeHtml(rule.falsePositives)}</p>
            </div>
          </div>
          <div class="modal-remediation-box">
            <span class="rule-spec-title" style="color: var(--status-pass-text); margin-bottom: 4px; display: block;">Recommended SOC Response Playbook</span>
            <p class="rule-spec-text">${escapeHtml(rule.playbook)}</p>
          </div>
        </div>
      </article>
    `).join('');
  }

  // --- Scanner State Switcher ---
  function setScannerState(state) {
    const emptyBox = document.getElementById('scanner-empty-state');
    const loadingBox = document.getElementById('scanner-loading-state');
    const refusedBox = document.getElementById('scanner-refused-state');
    const resultsBox = document.getElementById('scanner-results-state');

    if (emptyBox) emptyBox.style.display = 'none';
    if (loadingBox) loadingBox.style.display = 'none';
    if (refusedBox) refusedBox.style.display = 'none';
    if (resultsBox) resultsBox.style.display = 'none';

    document.querySelectorAll('.sim-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-scanner-state') === state);
    });

    switch (state) {
      case 'empty':
        if (emptyBox) emptyBox.style.display = 'block';
        break;
      case 'loading':
        if (loadingBox) loadingBox.style.display = 'block';
        break;
      case 'refused':
        if (refusedBox) refusedBox.style.display = 'block';
        break;
      case 'success':
      default:
        if (resultsBox) resultsBox.style.display = 'block';
        break;
    }
  }

  // --- Open Finding Detail Modal ---
  function openFindingModal(findingId) {
    const finding = SAMPLE_FINDINGS.find(f => f.id === findingId);
    if (!finding || !modalDialog) return;

    modalCategory.textContent = finding.moduleLabel.toUpperCase();
    modalTitle.textContent = finding.title;
    modalStatusBadge.innerHTML = renderStatusBadge(finding.status);
    modalSeverityBadge.innerHTML = renderSeverityBadge(finding.severity);
    modalTime.textContent = finding.timeUtc;
    modalEntity.textContent = finding.entity;
    modalObservation.textContent = finding.observed;
    modalExplanation.textContent = finding.explanation;
    modalRemediation.textContent = finding.remediation;

    modalDialog.showModal();
  }

  function closeFindingModal() {
    if (modalDialog && modalDialog.open) {
      modalDialog.close();
    }
  }

  // --- Export Reports Handlers ---
  function exportSampleReport() {
    const reportData = {
      tool: 'Tellwarden',
      environment: 'Educational prototype (sample data)',
      generated_at: new Date().toISOString(),
      disclaimer: 'Offline analysis of sample configurations and detection events. Not a security guarantee.',
      summary: {
        scanner_checks: { total: 17, pass: 12, warning: 3, fail: 2 },
        ids_findings: { total: 5, critical: 1, high: 2, medium: 2 }
      },
      sample_findings: SAMPLE_FINDINGS
    };

    downloadJson(reportData, `tellwarden-sample-report-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Sample JSON report downloaded.');
  }

  function exportScannerReport() {
    const scanData = {
      tool: 'Tellwarden',
      version: '0.1.0 (educational prototype)',
      scan_id: 'scan-demo-' + Math.floor(Math.random() * 10000),
      timestamp_utc: new Date().toISOString(),
      target_url: 'https://example.test',
      final_url: 'https://example.test/',
      resolved_ip: '198.51.100.25 (RFC 5737 Documentation)',
      tls_verified: true,
      request_count: 4,
      summary: { pass: 12, warning: 3, fail: 2, info: 0 },
      checks: SCANNER_CHECKS
    };

    downloadJson(scanData, `tellwarden-scan-example.test-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Scan report JSON downloaded.');
  }

  function exportIdsCsv() {
    // Escaping cells starting with =, +, -, @ to neutralize CSV formula injection (RPT-05, SEC-16)
    const headers = ['finding_id', 'rule_id', 'rule_name', 'severity', 'attack_technique', 'entity', 'evidence_count', 'detection_window', 'timestamp_utc'];
    const rows = IDS_FINDINGS.map(f => {
      return [
        f.id,
        f.ruleId,
        `"${f.ruleName}"`,
        f.severity,
        f.attackTechnique,
        `"${f.entity.replace(/^[=+\-@]/, "'$&")}"`,
        f.evidenceCount,
        `"${f.windowText}"`,
        `"${f.timeUtc}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tellwarden-ids-findings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Sanitized CSV findings exported.');
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Reset Demo Functionality ---
  function resetDemo() {
    searchQuery = '';
    activeModuleFilter = 'all';
    activeCheckFilter = 'all';
    if (searchInput) searchInput.value = '';

    filterChips.forEach(chip => {
      const isAll = chip.getAttribute('data-filter') === 'all';
      chip.classList.toggle('active', isAll);
      chip.setAttribute('aria-selected', isAll);
    });

    setScannerState('success');
    renderOverviewTable();
    renderScannerChecks();
    showToast('Demo reset to default sample state.');
  }

  // --- Event Listeners Initialization ---
  function initEventListeners() {
    // Hamburger Button Toggle
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', toggleSidebar);
    }

    // Drawer Scrim Click
    if (drawerScrim) {
      drawerScrim.addEventListener('click', closeMobileSidebar);
    }

    // Escape Key Handler
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
        closeFindingModal();
      }
    });

    // Resize Handler for Responsive Transitions
    window.addEventListener('resize', () => {
      if (isDesktop()) {
        document.body.classList.remove('sidebar-open');
        document.body.style.overflow = '';
      }
    });

    // Hash change router
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'web-scanner', 'ids-simulator', 'rules-guide', 'about'].includes(hash)) {
        switchView(hash);
      }
    });

    // Sidebar Nav Item Clicks
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const view = link.getAttribute('data-view');
        if (view) {
          e.preventDefault();
          window.location.hash = view;
          switchView(view);
        }
      });
    });

    // Filter Chips (Overview Table)
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        activeModuleFilter = chip.getAttribute('data-filter');
        renderOverviewTable();
      });
    });

    // Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderOverviewTable();
      });
    }

    // Clear Filters Button in Empty State
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        resetDemo();
      });
    }

    // Table Clicks (Delegation for Finding Detail Buttons)
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="view-finding"]');
        if (btn) {
          const findingId = btn.getAttribute('data-id');
          openFindingModal(findingId);
        }
      });
    }

    // Modal Close Buttons
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeFindingModal);
    if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeFindingModal);
    if (modalDialog) {
      modalDialog.addEventListener('click', (e) => {
        const rect = modalDialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          closeFindingModal();
        }
      });
    }

    // Export Report Button
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', exportSampleReport);
    }

    if (btnExportScannerReport) {
      btnExportScannerReport.addEventListener('click', exportScannerReport);
    }

    if (btnExportIdsCsv) {
      btnExportIdsCsv.addEventListener('click', exportIdsCsv);
    }

    // Reset Demo Button
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', resetDemo);
    }

    // Action buttons inside Tool Cards
    document.querySelectorAll('[data-action="goto-scanner"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = 'web-scanner';
        switchView('web-scanner');
      });
    });

    document.querySelectorAll('[data-action="filter-scanner"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const webChip = document.querySelector('.chip[data-filter="web"]');
        if (webChip) webChip.click();
        document.querySelector('.findings-card').scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-action="goto-ids"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = 'ids-simulator';
        switchView('ids-simulator');
      });
    });

    document.querySelectorAll('[data-action="goto-rules"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = 'rules-guide';
        switchView('rules-guide');
      });
    });

    // Scanner Controls
    if (btnQuickTarget && scannerUrlInput) {
      btnQuickTarget.addEventListener('click', () => {
        scannerUrlInput.value = 'https://example.test';
        showToast('Safe sample target https://example.test loaded.');
      });
    }

    if (btnRunScan) {
      btnRunScan.addEventListener('click', () => {
        if (!scannerConsentCheckbox || !scannerConsentCheckbox.checked) {
          showToast('Please confirm the ethical authorization checkbox before scanning.');
          return;
        }

        const url = scannerUrlInput ? scannerUrlInput.value.trim() : '';
        if (!url) {
          showToast('Please enter a target URL.');
          return;
        }

        // Simulate scanning state
        setScannerState('loading');
        showToast('Guarded scan initiated against ' + url);

        setTimeout(() => {
          setScannerState('success');
          showToast('Sample scan completed cleanly.');
        }, 1800);
      });
    }

    // Scanner Consent Checkbox disables button when unticked (SEC-09)
    if (scannerConsentCheckbox && btnRunScan) {
      scannerConsentCheckbox.addEventListener('change', (e) => {
        btnRunScan.disabled = !e.target.checked;
        if (!e.target.checked) {
          btnRunScan.style.opacity = '0.5';
          btnRunScan.style.cursor = 'not-allowed';
        } else {
          btnRunScan.style.opacity = '1';
          btnRunScan.style.cursor = 'pointer';
        }
      });
    }

    // Scanner Demo State Switcher Pills
    document.querySelectorAll('[data-scanner-state]').forEach(pill => {
      pill.addEventListener('click', () => {
        const state = pill.getAttribute('data-scanner-state');
        setScannerState(state);
      });
    });

    // Scanner Category Tabs
    document.querySelectorAll('[data-check-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-check-filter]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCheckFilter = tab.getAttribute('data-check-filter');
        renderScannerChecks();
      });
    });

    // IDS Slider Controls
    const sliders = [
      { id: 'slider-auth-001', valId: 'val-auth-001', format: v => `${v} failures / 300s` },
      { id: 'slider-auth-002', valId: 'val-auth-002', format: v => `${v} accounts / 600s` },
      { id: 'slider-net-001', valId: 'val-net-001', format: v => `${v} ports / 60s` },
      { id: 'slider-web-001', valId: 'val-web-001', format: v => `${v} reqs / 60s` }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const valEl = document.getElementById(s.valId);
      if (el && valEl) {
        el.addEventListener('input', () => {
          valEl.innerHTML = s.format(el.value);
        });
      }
    });

    // IDS Run Button
    if (btnRunIds) {
      btnRunIds.addEventListener('click', () => {
        showToast('Evaluating 1,200 events across 7 rules...');
        btnRunIds.disabled = true;
        btnRunIds.innerHTML = `<span>Evaluating...</span>`;
        setTimeout(() => {
          btnRunIds.disabled = false;
          btnRunIds.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Run Analysis</span>`;
          renderIdsFindings();
          showToast('Rule evaluation complete: 5 findings identified in 0.24s.');
        }, 500);
      });
    }

    // Preset Card Selection
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        showToast(`Dataset "${card.querySelector('.preset-name').textContent}" selected.`);
      });
    });
  }

  // --- Initial Mount ---
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    renderOverviewTable();
    renderScannerChecks();
    renderIdsFindings();
    renderRulesCatalog();

    // Check initial hash
    const initialHash = window.location.hash.replace('#', '');
    if (['overview', 'web-scanner', 'ids-simulator', 'rules-guide', 'about'].includes(initialHash)) {
      switchView(initialHash);
    } else {
      switchView('overview');
    }
  });

})();
