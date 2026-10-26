"""
Network Guard: URL validation and address classification (TRD section 6, SEC-01 to SEC-08, SEC-14).

DNS rebinding (D-10): GuardedBackend resolves and classifies the host at connect
time and connects only to the addresses it just validated, so there is no gap
between the check and the connection. TLS still uses the original host name for
SNI and certificate verification.
"""

import ipaddress
import re
import socket
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urlsplit, urlunsplit

import httpcore
import httpx

from tellwarden.exceptions import BlockedTargetError, ResolutionError, ValidationError

MAX_URL_LENGTH = 2048
ALLOWED_PORTS = {80, 443}
BLOCKED_NAMES = {"localhost", "metadata.google.internal"}
BLOCKED_SUFFIXES = (".localhost", ".internal", ".local")

_EXPLICIT_BLOCKS: list[tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, str]] = [
    (ipaddress.ip_network("0.0.0.0/8"), "unspecified"),
    (ipaddress.ip_network("127.0.0.0/8"), "loopback"),
    (ipaddress.ip_network("10.0.0.0/8"), "private"),
    (ipaddress.ip_network("172.16.0.0/12"), "private"),
    (ipaddress.ip_network("192.168.0.0/16"), "private"),
    (ipaddress.ip_network("100.64.0.0/10"), "carrier-grade NAT"),
    (ipaddress.ip_network("169.254.0.0/16"), "link-local / cloud metadata"),
    (ipaddress.ip_network("198.18.0.0/15"), "benchmarking"),
    (ipaddress.ip_network("224.0.0.0/4"), "multicast"),
    (ipaddress.ip_network("240.0.0.0/4"), "reserved"),
    (ipaddress.ip_network("::/128"), "unspecified"),
    (ipaddress.ip_network("::1/128"), "loopback"),
    (ipaddress.ip_network("fc00::/7"), "private"),
    (ipaddress.ip_network("fe80::/10"), "link-local"),
    (ipaddress.ip_network("fd00:ec2::254/128"), "cloud metadata"),
    (ipaddress.ip_network("ff00::/8"), "multicast"),
    (ipaddress.ip_network("64:ff9b::/96"), "NAT64"),
]

_NUMERIC_HOST = re.compile(r"^(0x[0-9a-f]*|[0-9]+)(\.(0x[0-9a-f]*|[0-9]*))*\.?$")
_HOST_LABELS = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.?$")

Resolver = Callable[[str, int], list[str]]


@dataclass(frozen=True)
class TargetURL:
    url: str
    scheme: str
    host: str
    port: int


def validate_url(raw: str) -> TargetURL:
    """Normalise and validate a user-supplied URL. Raises ValidationError or BlockedTargetError."""
    if not isinstance(raw, str):
        raise ValidationError("URL must be text.")
    value = raw.strip()
    if not value:
        raise ValidationError("Enter a URL to scan.")
    if len(value) > MAX_URL_LENGTH:
        raise ValidationError(f"URL is longer than {MAX_URL_LENGTH} characters.")
    if any(ord(c) < 0x21 or ord(c) == 0x7F for c in value):
        raise ValidationError("URL contains spaces or control characters.")
    if "://" not in value:
        value = "https://" + value

    parts = urlsplit(value)
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        raise ValidationError("Only http and https URLs are supported.")
    if parts.username is not None or parts.password is not None or "@" in parts.netloc:
        raise ValidationError("URLs with embedded credentials (user:pass@) are not allowed.")
    try:
        port = parts.port
    except ValueError:
        raise ValidationError("URL port is not valid.") from None
    port = port or (443 if scheme == "https" else 80)
    if port not in ALLOWED_PORTS:
        raise ValidationError("Only ports 80 and 443 are allowed.")

    host = (parts.hostname or "").rstrip(".")
    if not host:
        raise ValidationError("URL has no host name.")

    is_literal = False
    if "[" in parts.netloc:
        try:
            ipaddress.IPv6Address(host)
        except ValueError:
            raise ValidationError("IPv6 address in URL is not valid.") from None
        is_literal = True
    elif _NUMERIC_HOST.match(host):
        try:
            ipaddress.IPv4Address(host)
        except ValueError:
            raise ValidationError(
                "Numeric host forms other than a plain dotted IPv4 address are not allowed."
            ) from None
        is_literal = True
    else:
        try:
            host = host.encode("idna").decode("ascii").lower()
        except UnicodeError:
            raise ValidationError("Host name is not a valid domain name.") from None
        if not _HOST_LABELS.match(host) or len(host) > 253:
            raise ValidationError("Host name is not a valid domain name.")
        if host in BLOCKED_NAMES or host.endswith(BLOCKED_SUFFIXES):
            raise BlockedTargetError(f"Host '{host}' is a local or internal name and cannot be scanned.",
                                     address=host, category="internal name")

    if is_literal:
        _require_public(host)

    netloc = f"[{host}]" if ":" in host else host
    if parts.port is not None and parts.port != (443 if scheme == "https" else 80):
        netloc += f":{port}"
    path = parts.path or "/"
    url = urlunsplit((scheme, netloc, path, parts.query, ""))
    return TargetURL(url=url, scheme=scheme, host=host, port=port)


def classify_address(address: str) -> str | None:
    """Return None for a public global address, otherwise the reason it is blocked."""
    try:
        ip = ipaddress.ip_address(address.split("%", 1)[0])
    except ValueError:
        return "invalid address"
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        return classify_address(str(ip.ipv4_mapped))
    for network, reason in _EXPLICIT_BLOCKS:
        if ip.version == network.version and ip in network:
            return reason
    if not ip.is_global:
        return "reserved / non-global"
    return None


def _require_public(address: str) -> None:
    reason = classify_address(address)
    if reason is not None:
        raise BlockedTargetError(
            f"Target address {address} is {reason} and cannot be scanned.",
            address=address, category=reason,
        )


def system_resolver(host: str, port: int) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError):
        raise ResolutionError(f"Could not resolve host '{host}'.") from None
    seen: list[str] = []
    for info in infos:
        addr = str(info[4][0])
        if addr not in seen:
            seen.append(addr)
    return seen


def resolve_public(host: str, port: int, resolver: Resolver = system_resolver) -> list[str]:
    """Resolve host and require every returned address to be public."""
    try:
        ipaddress.ip_address(host)
        addresses = [host]
    except ValueError:
        addresses = resolver(host, port)
    if not addresses:
        raise ResolutionError(f"Host '{host}' did not resolve to any address.")
    for addr in addresses:
        _require_public(addr)
    return addresses


class GuardedBackend(httpcore.SyncBackend):
    """Network backend that validates addresses at connect time (DNS rebinding defence)."""

    def __init__(self, resolver: Resolver = system_resolver):
        self._resolver = resolver

    def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        addresses = resolve_public(host, port, self._resolver)
        last_error: Exception | None = None
        for addr in addresses:
            try:
                return super().connect_tcp(addr, port, timeout, local_address, socket_options)
            except httpcore.ConnectError as exc:
                last_error = exc
        raise last_error or httpcore.ConnectError("connection failed")


def guarded_transport(resolver: Resolver = system_resolver) -> httpx.HTTPTransport:
    """httpx transport whose every TCP connection goes through GuardedBackend."""
    transport = httpx.HTTPTransport(verify=True, retries=0, trust_env=False)
    pool = transport._pool
    if not hasattr(pool, "_network_backend"):
        raise RuntimeError("Unsupported httpx/httpcore version: cannot install network guard.")
    pool._network_backend = GuardedBackend(resolver)
    return transport
