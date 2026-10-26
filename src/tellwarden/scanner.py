"""
Web security scanner engine (TRD sections 6 to 8).
Passive configuration-hygiene checks only: GET/OPTIONS, no body, no cookies, bounded budget.
"""

import logging
import re
import ssl
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit

import httpx

from tellwarden import __version__, config
from tellwarden.exceptions import ScanBudgetExceededError, TellwardenError, ValidationError
from tellwarden.models import CheckResult, RedirectHop, ScanResult, TlsInfo
from tellwarden.netguard import Resolver, guarded_transport, resolve_public, system_resolver, validate_url

logger = logging.getLogger("tellwarden.scanner")

REDIRECT_CODES = {301, 302, 303, 307, 308}
CORS_TEST_ORIGIN = "https://cors-check.invalid"
OWASP_HEADERS = "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html"
OWASP_HSTS = "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html"
OWASP_TLS = "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html"
OWASP_CSP = "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html"
OWASP_CORS = ("https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/"
              "11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing")

LIMITATIONS = [
    "Only one URL was tested, without logging in. Other paths can behave differently.",
    "Checks inspect response headers only; no content, forms or application logic were tested.",
    "Results are configuration hygiene observations, not a security grade. A Pass is not proof of safety.",
    "Only scan sites you own or have written permission to test.",
]

# check_id -> (category, title, expected, explanation, remediation, reference)
CHECKS: dict[str, tuple[str, str, str, str, str, str]] = {
    "HTTPS-01": ("https", "Final URL uses HTTPS", "Final URL scheme is https",
                 "Plain HTTP traffic can be read and modified by anyone on the network path.",
                 "Serve the site over HTTPS and redirect all HTTP requests to HTTPS.", OWASP_TLS),
    "HTTPS-02": ("https", "TLS certificate verification", "Certificate chain verifies for the host name",
                 "A certificate that does not verify means visitors cannot confirm they reached the real server.",
                 "Install a valid certificate from a trusted CA that covers this host name, including intermediates.",
                 OWASP_TLS),
    "HTTPS-03": ("https", "HTTP redirects to HTTPS", "http:// responds with 301/302/307/308 to https on the same host",
                 "If port 80 serves content directly, users who type the bare domain stay on unencrypted HTTP.",
                 "Configure port 80 to return a permanent (301 or 308) redirect to the https URL.", OWASP_HSTS),
    "HTTPS-04": ("https", "No HTTPS to HTTP downgrade in redirects", "Every redirect hop stays on https",
                 "A redirect from https to http exposes the next request to interception.",
                 "Make every redirect target an https URL.", OWASP_TLS),
    "HDR-01": ("header", "Strict-Transport-Security", "max-age >= 31536000; includeSubDomains",
               "HSTS tells browsers to use HTTPS only, preventing SSL-stripping downgrade attacks.",
               "Send 'Strict-Transport-Security: max-age=63072000; includeSubDomains' on https responses.", OWASP_HSTS),
    "HDR-02": ("header", "Content-Security-Policy", "Enforced policy without unsafe-inline/unsafe-eval/*, "
               "with object-src 'none' and frame-ancestors",
               "CSP limits where scripts and other resources load from, reducing the impact of XSS.",
               "Define a restrictive policy, e.g. \"default-src 'self'; object-src 'none'; frame-ancestors 'self'\", "
               "and remove unsafe-inline/unsafe-eval from script sources.", OWASP_CSP),
    "HDR-03": ("header", "X-Content-Type-Options", "nosniff",
               "Without nosniff, browsers may guess content types and execute uploaded files as scripts.",
               "Send 'X-Content-Type-Options: nosniff'.", OWASP_HEADERS),
    "HDR-04": ("header", "Framing protection", "CSP frame-ancestors, or X-Frame-Options DENY/SAMEORIGIN",
               "Pages that can be framed by any site are exposed to clickjacking.",
               "Send \"Content-Security-Policy: frame-ancestors 'self'\" (and optionally X-Frame-Options: DENY).",
               OWASP_HEADERS),
    "HDR-05": ("header", "Referrer-Policy", "no-referrer, same-origin, strict-origin or strict-origin-when-cross-origin",
               "A loose referrer policy can leak full URLs, including tokens in query strings, to other sites.",
               "Send 'Referrer-Policy: strict-origin-when-cross-origin' or stricter.", OWASP_HEADERS),
    "HDR-06": ("header", "Permissions-Policy", "Present and restricting unused browser features",
               "Permissions-Policy disables powerful features (camera, geolocation) the site does not use.",
               "Send e.g. 'Permissions-Policy: camera=(), microphone=(), geolocation=()'.", OWASP_HEADERS),
    "HDR-07": ("header", "Cross-Origin-Opener-Policy", "same-origin",
               "COOP isolates the browsing context from cross-origin windows. Situational, so missing is Info.",
               "If the site does not need cross-origin popups, send 'Cross-Origin-Opener-Policy: same-origin'.",
               OWASP_HEADERS),
    "HDR-08": ("header", "Cross-Origin-Resource-Policy", "same-origin or same-site",
               "CORP stops other origins from embedding this resource. Situational, so missing is Info.",
               "For private resources send 'Cross-Origin-Resource-Policy: same-origin'.", OWASP_HEADERS),
    "HDR-09": ("header", "Cache-Control on responses that set cookies", "no-store",
               "Responses that set cookies may contain session data that shared caches should not store.",
               "Send 'Cache-Control: no-store' on responses that set session cookies.", OWASP_HEADERS),
    "HDR-10": ("header", "Server / X-Powered-By disclosure", "Absent or generic, with no version numbers",
               "Version numbers help attackers match the server to known vulnerabilities.",
               "Remove X-Powered-By and strip version numbers from the Server header.", OWASP_HEADERS),
    "HDR-11": ("header", "X-XSS-Protection", "Absent or 0",
               "The legacy XSS auditor is removed from modern browsers and could introduce issues; CSP replaces it.",
               "Remove the header or set 'X-XSS-Protection: 0', and rely on Content-Security-Policy.", OWASP_HEADERS),
    "CORS-01": ("cors", "No cross-origin access granted", "No Access-Control-Allow-Origin for untrusted origins",
                "The endpoint did not grant cross-origin read access to the test origins.",
                "No action needed for this URL.", OWASP_CORS),
    "CORS-02": ("cors", "Wildcard origin without credentials", "Wildcard only on public, non-sensitive resources",
                "Access-Control-Allow-Origin: * lets any site read this response, but without cookies.",
                "Fine for public assets; restrict to known origins if the response is user-specific.", OWASP_CORS),
    "CORS-03": ("cors", "Arbitrary origin reflected", "Only allow-listed origins are echoed",
                "The server echoed an untrusted test origin, so any site can read this response.",
                "Validate the Origin header against an explicit allow-list before echoing it.", OWASP_CORS),
    "CORS-04": ("cors", "Arbitrary origin reflected with credentials", "Never reflect untrusted origins with credentials",
                "Any website could make authenticated requests as the visitor and read the responses.",
                "Use a strict origin allow-list and only send Allow-Credentials for trusted origins.", OWASP_CORS),
    "CORS-05": ("cors", "'null' origin allowed with credentials", "Never allow the null origin",
                "Sandboxed iframes and local files send Origin: null, so allowing it with credentials is exploitable.",
                "Remove 'null' from the allowed origins.", OWASP_CORS),
    "CORS-06": ("cors", "Wildcard combined with credentials", "Do not combine * with Allow-Credentials: true",
                "Browsers reject this combination, which usually indicates a misunderstood CORS configuration.",
                "Use an explicit origin allow-list if credentials are needed.", OWASP_CORS),
    "CORS-07": ("cors", "Reflected origin without Vary: Origin", "Vary: Origin when the allowed origin varies",
                "Without Vary: Origin, caches may serve a response allowed for one origin to another.",
                "Add 'Vary: Origin' to responses whose Access-Control-Allow-Origin depends on the request.", OWASP_CORS),
    "CORS-INFO": ("cors", "CORS assessment", "Assessable response from the final URL",
                  "CORS could not be fully assessed for this URL.",
                  "Re-run against the final, non-redirecting URL to assess CORS.", OWASP_CORS),
}


def _check(check_id: str, status: str, observed: str, explanation: str | None = None) -> CheckResult:
    category, title, expected, default_expl, remediation, ref = CHECKS[check_id]
    return CheckResult(
        check_id=check_id, category=category, title=title, status=status,
        observed=observed[:500] if observed else "(not present)", expected=expected,
        explanation=explanation or default_expl,
        remediation="No action needed." if status == "pass" else remediation, reference_url=ref,
    )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _parse_csp(value: str) -> dict[str, list[str]]:
    directives: dict[str, list[str]] = {}
    for part in value.split(";"):
        tokens = part.strip().split()
        if tokens and tokens[0].lower() not in directives:
            directives[tokens[0].lower()] = [t.lower() for t in tokens[1:]]
    return directives


def check_headers(headers: httpx.Headers, scheme: str) -> list[CheckResult]:
    results: list[CheckResult] = []
    h = {k.lower(): v for k, v in headers.items()}

    hsts = h.get("strict-transport-security")
    if scheme != "https":
        results.append(_check("HDR-01", "info", hsts or "", "HSTS only applies to https responses; not applicable."))
    elif not hsts:
        results.append(_check("HDR-01", "fail", ""))
    else:
        m = re.search(r"max-age\s*=\s*\"?(\d+)", hsts, re.I)
        max_age = int(m.group(1)) if m else 0
        subdomains = "includesubdomains" in hsts.lower()
        ok = max_age >= 31536000 and subdomains
        results.append(_check("HDR-01", "pass" if ok else "warning", hsts,
                              None if ok else f"HSTS present but max-age={max_age}"
                              f"{'' if subdomains else ' and includeSubDomains is missing'}."))

    csp = h.get("content-security-policy")
    csp_ro = h.get("content-security-policy-report-only")
    directives = _parse_csp(csp) if csp else {}
    if not csp:
        if csp_ro:
            results.append(_check("HDR-02", "warning", f"Report-Only: {csp_ro}",
                                  "Only a Report-Only policy is sent, so nothing is actually blocked."))
        else:
            results.append(_check("HDR-02", "fail", ""))
    else:
        issues = []
        script = directives.get("script-src", directives.get("default-src"))
        if script is None:
            issues.append("no script-src or default-src")
        else:
            issues += [f"script sources allow {t}" for t in ("'unsafe-inline'", "'unsafe-eval'", "*") if t in script]
        obj = directives.get("object-src", directives.get("default-src") if "object-src" not in directives else None)
        if obj != ["'none'"]:
            issues.append("object-src is not 'none'")
        if "frame-ancestors" not in directives:
            issues.append("frame-ancestors is not set")
        results.append(_check("HDR-02", "warning" if issues else "pass", csp,
                              ("Policy present but weak: " + "; ".join(issues) + ".") if issues else None))

    xcto = h.get("x-content-type-options", "")
    results.append(_check("HDR-03", "pass" if xcto.strip().lower() == "nosniff" else "fail", xcto))

    xfo = h.get("x-frame-options", "")
    fa = directives.get("frame-ancestors")
    if fa is not None:
        results.append(_check("HDR-04", "pass", f"frame-ancestors {' '.join(fa)}"))
    elif xfo.strip().upper() in ("DENY", "SAMEORIGIN"):
        results.append(_check("HDR-04", "pass", f"X-Frame-Options: {xfo}"))
    elif xfo.strip().upper().startswith("ALLOW-FROM"):
        results.append(_check("HDR-04", "warning", f"X-Frame-Options: {xfo}",
                              "ALLOW-FROM is obsolete and ignored by modern browsers."))
    else:
        results.append(_check("HDR-04", "fail", xfo))

    rp_raw = h.get("referrer-policy", "")
    rp = rp_raw.split(",")[-1].strip().lower() if rp_raw else ""
    if rp in ("no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"):
        results.append(_check("HDR-05", "pass", rp_raw))
    elif rp == "unsafe-url":
        results.append(_check("HDR-05", "fail", rp_raw, "unsafe-url sends the full URL, even over plain HTTP."))
    else:
        results.append(_check("HDR-05", "warning", rp_raw,
                              None if rp else "No policy is set, so browsers fall back to their default."))

    pp = h.get("permissions-policy")
    results.append(_check("HDR-06", "pass" if pp else "info", pp or ""))

    coop = h.get("cross-origin-opener-policy", "").strip().lower()
    results.append(_check("HDR-07", {"same-origin": "pass", "same-origin-allow-popups": "warning"}.get(coop, "info"),
                          coop))

    corp = h.get("cross-origin-resource-policy", "").strip().lower()
    results.append(_check("HDR-08", "pass" if corp in ("same-origin", "same-site") else "info", corp))

    if "set-cookie" not in h:
        results.append(_check("HDR-09", "info", h.get("cache-control", ""),
                              "The response does not set a cookie, so this check does not apply."))
    else:
        cc = h.get("cache-control", "").lower()
        status = "pass" if "no-store" in cc else ("fail" if not cc else "warning")
        results.append(_check("HDR-09", status, h.get("cache-control", "")))

    disclosed = [f"{n}: {h[n]}" for n in ("server", "x-powered-by") if h.get(n)]
    if not disclosed:
        results.append(_check("HDR-10", "pass", ""))
    elif any(re.search(r"\d+\.\d+", d.split(":", 1)[1]) for d in disclosed):
        results.append(_check("HDR-10", "warning", "; ".join(disclosed), "A software version number is disclosed."))
    else:
        results.append(_check("HDR-10", "info", "; ".join(disclosed),
                              "A product name is disclosed without a version number."))

    xxp = h.get("x-xss-protection", "").strip()
    results.append(_check("HDR-11", "pass" if xxp in ("", "0") else "warning", xxp))
    return results


def check_cors(baseline: httpx.Response, origin_resp: httpx.Response | None, null_resp: httpx.Response | None,
               preflight: httpx.Response | None) -> list[CheckResult]:
    responses = [r for r in (origin_resp, null_resp, preflight) if r is not None]
    if any(r.status_code in REDIRECT_CODES for r in responses):
        return [_check("CORS-INFO", "info", "Redirect returned", "CORS not assessed, URL redirects.")]
    if origin_resp is None or null_resp is None:
        return [_check("CORS-INFO", "info", "Request failed", "CORS not assessed, test requests did not complete.")]

    def acao(r): return r.headers.get("access-control-allow-origin", "").strip()
    def creds(r): return r.headers.get("access-control-allow-credentials", "").strip().lower() == "true"
    def vary_origin(r): return "origin" in [v.strip().lower() for v in r.headers.get("vary", "").split(",")]
    def show(label, r): return f"{label} -> ACAO: {acao(r) or '(none)'}, ACAC: {r.headers.get('access-control-allow-credentials', '(none)')}"

    observed = " | ".join(filter(None, [
        show(f"Origin: {CORS_TEST_ORIGIN}", origin_resp), show("Origin: null", null_resp),
        show("OPTIONS preflight", preflight) if preflight is not None else None]))
    results: list[CheckResult] = []
    all_resps = [baseline, *responses]
    reflected = acao(origin_resp) == CORS_TEST_ORIGIN or (preflight is not None and acao(preflight) == CORS_TEST_ORIGIN)
    null_allowed = acao(null_resp) == "null"

    if reflected and (creds(origin_resp) or (preflight is not None and creds(preflight))):
        results.append(_check("CORS-04", "fail", observed))
    elif reflected:
        results.append(_check("CORS-03", "warning", observed))
    if null_allowed and creds(null_resp):
        results.append(_check("CORS-05", "fail", observed))
    wildcard = [r for r in all_resps if acao(r) == "*"]
    if any(creds(r) for r in wildcard):
        results.append(_check("CORS-06", "warning", observed))
    elif wildcard:
        results.append(_check("CORS-02", "info", observed))
    if (reflected and not vary_origin(origin_resp)) or (null_allowed and not vary_origin(null_resp)):
        results.append(_check("CORS-07", "warning", observed))
    if not any(acao(r) for r in all_resps):
        results.append(_check("CORS-01", "pass", observed))
    elif not results:
        results.append(_check("CORS-INFO", "info", observed,
                              "A fixed origin is allowed; it was not one of the untrusted test origins."))
    return results


class _Session:
    """Wraps one httpx client with the request budget and overall deadline."""

    def __init__(self, transport: httpx.BaseTransport):
        self.count = 0
        self.deadline = time.monotonic() + config.SCAN_DEADLINE
        timeout = httpx.Timeout(config.READ_TIMEOUT, connect=config.CONNECT_TIMEOUT)
        self.client = httpx.Client(transport=transport, follow_redirects=False, timeout=timeout,
                                   headers={"User-Agent": config.USER_AGENT, "Accept": "*/*"}, trust_env=False)

    def send(self, method: str, url: str, headers: dict[str, str] | None = None) -> httpx.Response:
        if self.count >= config.MAX_REQUESTS or time.monotonic() >= self.deadline:
            raise ScanBudgetExceededError("Scan limit reached (request budget or deadline).")
        self.count += 1
        request = self.client.build_request(method, url, headers=headers)
        response = self.client.send(request, stream=True)
        response.close()  # headers only; body is never read
        return response


def _is_tls_error(exc: Exception) -> bool:
    cause = exc
    while cause is not None:
        if isinstance(cause, ssl.SSLError):
            return True
        cause = cause.__cause__ or cause.__context__
    return "CERTIFICATE_VERIFY_FAILED" in str(exc) or "SSL" in str(exc)


def _net_error_text(exc: Exception) -> str:
    if isinstance(exc, httpx.TimeoutException):
        return "The request timed out."
    if isinstance(exc, httpx.ConnectError):
        return "Could not connect to the server (refused, unreachable or reset)."
    return "The request failed due to a network error."


def run_scan(raw_url: str, *, resolver: Resolver = system_resolver,
             transport: httpx.BaseTransport | None = None) -> ScanResult:
    """Run one bounded scan. Raises TellwardenError subclasses for refusals; network errors on the
    baseline request raise ScanNetworkError."""
    started = _utc_now()
    target = validate_url(raw_url)
    addresses = resolve_public(target.host, target.port, resolver)
    session = _Session(transport or guarded_transport(resolver))
    logger.info("scan start host=%s", target.host)

    chain: list[RedirectHop] = []
    checks: list[CheckResult] = []
    notes: list[str] = []
    complete = True
    tls = TlsInfo(verified=target.scheme == "https")
    current = target
    downgrade = False
    response: httpx.Response | None = None

    try:
        for hop in range(config.MAX_REDIRECTS + 1):
            try:
                response = session.send("GET", current.url)
            except httpx.HTTPError as exc:
                if current.scheme == "https" and _is_tls_error(exc):
                    tls = TlsInfo(verified=False, error="Certificate verification failed or TLS handshake error.")
                    checks.append(_check("HTTPS-02", "fail", tls.error))
                    notes.append("Header and CORS checks were skipped because the TLS connection failed.")
                    response = None
                    break
                raise ScanNetworkError(_net_error_text(exc)) from None
            location = response.headers.get("location")
            chain.append(RedirectHop(hop=hop, url=current.url, status=response.status_code, location=location))
            if response.status_code not in REDIRECT_CODES or not location:
                break
            if hop == config.MAX_REDIRECTS:
                complete = False
                notes.append(f"Stopped: more than {config.MAX_REDIRECTS} redirects.")
                response = None
                break
            try:
                nxt = validate_url(urljoin(current.url, location))
                resolve_public(nxt.host, nxt.port, resolver)
            except TellwardenError as exc:
                complete = False
                notes.append(f"Redirect not followed: {exc}")
                break
            if current.scheme == "https" and nxt.scheme == "http":
                downgrade = True
            current = nxt
    except ScanBudgetExceededError as exc:
        complete = False
        notes.append(str(exc))

    final_url = current.url
    if response is not None and not checks:
        if current.scheme == "https":
            tls = TlsInfo(verified=True)
            checks.append(_check("HTTPS-02", "pass", "Certificate verified"))
        else:
            tls = TlsInfo(verified=False, error=None)
            checks.append(_check("HTTPS-02", "info", "Not applicable (plain HTTP)"))
    checks.insert(0, _check("HTTPS-01", "pass" if current.scheme == "https" else "fail", final_url))
    checks.append(_check("HTTPS-04", "warning" if downgrade else "pass",
                         "https -> http hop seen" if downgrade else f"{len(chain)} hop(s), no downgrade"))

    try:
        # HTTPS-03: probe plain HTTP on the original host
        probe_url = f"http://[{target.host}]/" if ":" in target.host else f"http://{target.host}/"
        try:
            probe = session.send("GET", probe_url)
            loc = probe.headers.get("location", "")
            if probe.status_code in (301, 302, 307, 308) and loc:
                dest = urlsplit(urljoin(probe_url, loc))
                same = (dest.hostname or "").lower() == target.host
                ok = dest.scheme == "https" and same
                checks.append(_check("HTTPS-03", "pass" if ok else "warning", f"{probe.status_code} -> {loc}",
                                     None if ok else "HTTP redirects, but not to https on the same host."))
            elif probe.status_code == 200:
                checks.append(_check("HTTPS-03", "warning", "200 OK over plain HTTP, no redirect"))
            else:
                checks.append(_check("HTTPS-03", "info", f"HTTP status {probe.status_code}",
                                     "Port 80 answered without a redirect to HTTPS."))
        except httpx.HTTPError:
            checks.append(_check("HTTPS-03", "info", "Port 80 closed or timed out",
                                 "Plain HTTP is not reachable, so there is nothing to redirect."))

        if response is not None:
            checks.extend(check_headers(response.headers, current.scheme))
            if response.status_code in REDIRECT_CODES:
                checks.append(_check("CORS-INFO", "info", "Redirect returned", "CORS not assessed, URL redirects."))
            else:
                def safe(method, headers):
                    try:
                        return session.send(method, final_url, headers)
                    except httpx.HTTPError:
                        return None
                origin_resp = safe("GET", {"Origin": CORS_TEST_ORIGIN})
                null_resp = safe("GET", {"Origin": "null"})
                preflight = safe("OPTIONS", {"Origin": CORS_TEST_ORIGIN, "Access-Control-Request-Method": "GET"})
                checks.extend(check_cors(response, origin_resp, null_resp, preflight))
    except ScanBudgetExceededError as exc:
        complete = False
        notes.append(str(exc))
    finally:
        session.client.close()

    summary = {s: sum(1 for c in checks if c.status == s) for s in ("pass", "warning", "fail", "info")}
    logger.info("scan done host=%s requests=%d summary=%s", target.host, session.count, summary)
    return ScanResult(
        version=__version__, scan_id=uuid.uuid4().hex[:12], started_at=started, finished_at=_utc_now(),
        input_url=target.url, final_url=final_url, redirect_chain=chain, resolved_addresses=addresses, tls=tls,
        request_count=session.count, checks=checks, summary=summary, complete=complete, notes=notes,
        limitations=LIMITATIONS,
    )


class ScanNetworkError(TellwardenError):
    """The target could not be reached for the baseline request."""


__all__ = ["run_scan", "check_headers", "check_cors", "ScanNetworkError", "ValidationError"]
