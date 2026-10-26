import httpx
import pytest

from tellwarden.exceptions import BlockedTargetError, ValidationError
from tellwarden.netguard import classify_address, guarded_transport, resolve_public, validate_url


@pytest.mark.parametrize("raw,expected", [
    ("example.com", "https://example.com/"),
    ("  HTTPS://Example.COM/path?q=1#frag ", "https://example.com/path?q=1"),
    ("http://example.com:80/", "http://example.com/"),
    ("https://example.com:80/", "https://example.com:80/"),
    ("https://bücher.de", "https://xn--bcher-kva.de/"),
])
def test_validate_url_accepts_and_normalises(raw, expected):
    assert validate_url(raw).url == expected


@pytest.mark.parametrize("raw", [
    "", "ftp://example.com", "https://user:pass@example.com", "https://example.com:8080",
    "https://2130706433", "https://0177.0.0.1", "https://0x7f.0.0.1", "https://exa mple.com",
    "javascript:alert(1)", "https://" + "a" * 2050 + ".com", "https://-bad-.com",
])
def test_validate_url_rejects(raw):
    with pytest.raises(ValidationError):
        validate_url(raw)


@pytest.mark.parametrize("raw", [
    "http://localhost", "http://foo.localhost", "http://metadata.google.internal",
    "http://127.0.0.1", "http://10.1.2.3", "http://192.168.1.1", "http://169.254.169.254",
    "http://[::1]", "http://[::ffff:127.0.0.1]", "http://[fe80::1]", "http://100.64.0.1", "http://0.0.0.0",
])
def test_validate_url_blocks_internal(raw):
    with pytest.raises(BlockedTargetError):
        validate_url(raw)


@pytest.mark.parametrize("addr,blocked", [
    ("93.184.215.14", False), ("2606:4700::1111", False), ("127.0.0.1", True), ("172.20.0.1", True),
    ("198.18.0.1", True), ("224.0.0.1", True), ("240.0.0.1", True), ("fc00::1", True), ("fd00:ec2::254", True),
    ("64:ff9b::7f00:1", True), ("::ffff:10.0.0.1", True), ("192.0.2.1", True),
])
def test_classify_address(addr, blocked):
    assert (classify_address(addr) is not None) is blocked


def test_resolve_public_refuses_if_any_address_private():
    with pytest.raises(BlockedTargetError):
        resolve_public("mixed.example", 443, lambda h, p: ["93.184.215.14", "10.0.0.5"])


def test_guarded_transport_blocks_rebinding_at_connect_time():
    # Pre-check would pass, but the resolver used at connect time now returns loopback.
    client = httpx.Client(transport=guarded_transport(lambda h, p: ["127.0.0.1"]), trust_env=False)
    with pytest.raises(BlockedTargetError):
        client.get("http://rebind.example/")
