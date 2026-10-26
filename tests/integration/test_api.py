import httpx
import pytest
from fastapi.testclient import TestClient

from tellwarden import api, scanner


@pytest.fixture
def client():
    api._last_scan.clear()
    return TestClient(api.app)


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["rules_loaded"] >= 7 and body["samples_available"] == 4


def test_rules_come_from_yaml(client):
    rules = client.get("/api/rules").json()["rules"]
    assert any(r["id"] == "AUTH-001" and r["bounds"]["threshold"] == [2, 50] for r in rules)


def test_cors_allows_dev_origin_only(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    bad = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers


def test_scan_requires_authorization(client):
    r = client.post("/api/scan", json={"url": "https://example.com", "authorized": False})
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_request"


def test_scan_blocks_loopback(client):
    r = client.post("/api/scan", json={"url": "http://127.0.0.1", "authorized": True})
    assert r.status_code == 403 and r.json()["error"]["code"] == "blocked_target"


def test_scan_rejects_bad_port(client):
    r = client.post("/api/scan", json={"url": "https://example.com:22", "authorized": True})
    assert r.status_code == 400


def test_scan_success_and_cooldown(client, monkeypatch):
    real = scanner.run_scan
    transport = httpx.MockTransport(lambda req: httpx.Response(200, headers={"x-content-type-options": "nosniff"}))
    monkeypatch.setattr(scanner, "run_scan",
                        lambda url: real(url, resolver=lambda h, p: ["93.184.215.14"], transport=transport))
    r = client.post("/api/scan", json={"url": "https://example.com", "authorized": True})
    assert r.status_code == 200
    body = r.json()
    assert body["final_url"] == "https://example.com/" and body["summary"]["fail"] > 0
    again = client.post("/api/scan", json={"url": "https://example.com", "authorized": True})
    assert again.status_code == 429 and again.json()["error"]["retry_after"] > 0


def test_ids_samples_and_run(client):
    samples = client.get("/api/ids/samples").json()["samples"]
    assert {s["id"] for s in samples} == {"brute_force", "password_spraying", "port_scan", "mixed_normal"}
    r = client.post("/api/ids/run", data={"sample": "brute_force"})
    assert r.status_code == 200 and any(f["rule_id"] == "AUTH-001" for f in r.json()["findings"])


def test_ids_upload_and_validation(client):
    csv = b"event_id,timestamp,event_type,src_ip\nx1,2026-01-01T00:00:00Z,http_request,198.51.100.7\n"
    r = client.post("/api/ids/run", files={"file": ("my log.csv", csv, "text/csv")})
    assert r.status_code == 200 and r.json()["events_loaded"] == 1 and r.json()["dataset_name"] == "mylog.csv"
    assert client.post("/api/ids/run", files={"file": ("x.txt", csv, "text/plain")}).status_code == 400
    assert client.post("/api/ids/run", data={}).status_code == 400
    bad = client.post("/api/ids/run", data={"sample": "brute_force", "overrides": '{"AUTH-001":{"threshold":1}}'})
    assert bad.status_code == 400 and "2 to 50" in bad.json()["error"]["message"]
