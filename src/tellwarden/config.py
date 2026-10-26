"""
Bounded configuration settings for Tellwarden.
All values are bounded. Out-of-range values safely fall back to defaults.
Per SEC-14, no setting or environment variable can relax or bypass the Network Guard address blocklist.
"""

import os
import logging

logger = logging.getLogger("tellwarden.config")

def _get_bounded_int(var_name: str, default: int, min_val: int, max_val: int) -> int:
    raw = os.getenv(var_name)
    if raw is None:
        return default
    try:
        val = int(raw)
        if min_val <= val <= max_val:
            return val
        logger.warning(
            "Config %s=%d out of range [%d, %d]. Falling back to default %d.",
            var_name, val, min_val, max_val, default
        )
    except ValueError:
        logger.warning(
            "Config %s=%r is not a valid integer. Falling back to default %d.",
            var_name, raw, default
        )
    return default

# Network & Scanner timeouts / limits
CONNECT_TIMEOUT: int = _get_bounded_int("TELLWARDEN_CONNECT_TIMEOUT", 3, 1, 10)
READ_TIMEOUT: int = _get_bounded_int("TELLWARDEN_READ_TIMEOUT", 5, 1, 15)
SCAN_DEADLINE: int = _get_bounded_int("TELLWARDEN_SCAN_DEADLINE", 20, 5, 60)
MAX_REDIRECTS: int = _get_bounded_int("TELLWARDEN_MAX_REDIRECTS", 3, 0, 5)
MAX_REQUESTS: int = _get_bounded_int("TELLWARDEN_MAX_REQUESTS", 10, 1, 10)
MAX_BODY_BYTES: int = _get_bounded_int("TELLWARDEN_MAX_BODY_BYTES", 1048576, 1024, 1048576)
COOLDOWN_SECONDS: int = _get_bounded_int("TELLWARDEN_COOLDOWN_SECONDS", 10, 5, 120)

# IDS Ingestion limits
MAX_UPLOAD_MB: int = _get_bounded_int("TELLWARDEN_MAX_UPLOAD_MB", 5, 1, 10)
MAX_EVENTS: int = _get_bounded_int("TELLWARDEN_MAX_EVENTS", 50000, 1000, 100000)

# Logging level
LOG_LEVEL: str = os.getenv("TELLWARDEN_LOG_LEVEL", "INFO").upper()
if LOG_LEVEL not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
    LOG_LEVEL = "INFO"

USER_AGENT: str = "Tellwarden/0.1.0 (educational scanner; +https://github.com/tellwarden/tellwarden)"
