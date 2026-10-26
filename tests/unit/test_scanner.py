import httpx
import pytest

from tellwarden import scanner
from tellwarden.exceptions import BlockedTargetError

PUBLIC = lambda h, p: ["93.184.215.14"]  # noqa: E731

GOOD_HEADERS = {
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "content-security-policy": "default-src 'self'; object-src 'none'; frame-ancestors 'self'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=()",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
}


def by_id(result):
    return {c.check_id: c.status for c in result.checks}


def test_hardened_site_passes_and_counts_match():
    def handler(req: httpx.Request):
        if req.url.scheme == "http":
            return httpx.Response(301, headers={"location": "https://example.com/"})
        return httpx.Response(200, headers=GOOD_HEADERS)

    result = scanner.run_scan("example.com", resolver=PUBLIC, transport=httpx.MockTransport(handler))
    s = by_id(result)
    assert s["HTTPS-01"] == s["HTTPS-02"] == s["HTTPS-03"] == s["HDR-01"] == s["HDR-02"] == "pass"
    assert s["CORS-01"] == "pass"
    assert result.complete and result.request_count <= 10
    assert sum(result.summary.values()) == len(result.checks)


def test_missing_headers_and_reflected_cors_with_credentials():
    def handler(req: httpx.Request):
        if req.url.scheme == "http":
            return httpx.Response(200)
        h = {"server": "nginx/1.18.0", "set-cookie": "sid=1"}
        origin = req.headers.get("origin")
        if origin:
            h |= {"access-control-allow-origin": origin, "access-control-allow-credentials": "true"}
        return httpx.Response(200, headers=h)

    s = by_id(scanner.run_scan("https://example.com", resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert s["HDR-01"] == s["HDR-02"] == s["HDR-03"] == s["HDR-04"] == s["HDR-09"] == "fail"
    assert s["HDR-10"] == "warning" and s["HTTPS-03"] == "warning"
    assert s["CORS-04"] == "fail" and s["CORS-05"] == "fail" and s["CORS-07"] == "warning"


def test_redirect_to_private_address_is_not_followed():
    def handler(req):
        return httpx.Response(302, headers={"location": "http://127.0.0.1/admin"})

    result = scanner.run_scan("https://example.com", resolver=PUBLIC, transport=httpx.MockTransport(handler))
    assert not result.complete
    assert any("127.0.0.1" in n for n in result.notes)
    assert all("127.0.0.1" not in h.url for h in result.redirect_chain)


def test_downgrade_redirect_is_flagged():
    def handler(req):
        if req.url.scheme == "https":
            return httpx.Response(301, headers={"location": "http://example.com/"})
        return httpx.Response(200)

    s = by_id(scanner.run_scan("https://example.com", resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert s["HTTPS-04"] == "warning" and s["HTTPS-01"] == "fail"


def test_unreachable_target_raises_network_error():
    def handler(req):
        raise httpx.ConnectError("refused")

    with pytest.raises(scanner.ScanNetworkError):
        scanner.run_scan("https://example.com", resolver=PUBLIC, transport=httpx.MockTransport(handler))


def test_private_resolution_blocked_before_any_request():
    calls = []
    with pytest.raises(BlockedTargetError):
        scanner.run_scan("https://internal.example", resolver=lambda h, p: ["10.0.0.1"],
                         transport=httpx.MockTransport(lambda r: calls.append(r) or httpx.Response(200)))
    assert calls == []
