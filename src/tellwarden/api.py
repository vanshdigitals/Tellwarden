"""
HTTP API for the React frontend.
Run: uvicorn tellwarden.api:app --app-dir src --port 8000
"""

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from tellwarden import __version__, config, ids, scanner
from tellwarden.exceptions import (BlockedTargetError, ResolutionError, RuleConfigError, TellwardenError,
                                   ValidationError)
from tellwarden.models import IdsRunResult, ScanResult

logging.basicConfig(level=config.LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("tellwarden.api")

CORS_ORIGINS = [o.strip() for o in os.getenv(
    "TELLWARDEN_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

app = FastAPI(title="Tellwarden API", version=__version__, docs_url="/api/docs", openapi_url="/api/openapi.json",
              redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

_STATUS = {ValidationError: (400, "validation_error"), BlockedTargetError: (403, "blocked_target"),
           ResolutionError: (422, "resolution_error"), RuleConfigError: (500, "rule_config_error"),
           scanner.ScanNetworkError: (502, "target_unreachable")}


def _error(status: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, **extra}})


@app.exception_handler(TellwardenError)
async def _tellwarden_error(_: Request, exc: TellwardenError):
    status, code = next((v for t, v in _STATUS.items() if isinstance(exc, t)), (400, "error"))
    extra = {"category": exc.category} if isinstance(exc, BlockedTargetError) and exc.category else {}
    return _error(status, code, str(exc), **extra)


@app.exception_handler(RequestValidationError)
async def _request_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    return _error(422, "invalid_request", f"{field or 'request'}: {first.get('msg', 'invalid input')}")


@app.exception_handler(Exception)
async def _unexpected(_: Request, exc: Exception):
    logger.exception("unexpected error type=%s", type(exc).__name__)
    return _error(500, "internal_error", "Something went wrong on the server.")


# ------------------------------------------------------------------ cooldown (per client, in memory)

_last_scan: dict[str, float] = {}
_lock = threading.Lock()


def _claim_cooldown(client: str) -> int:
    """Return 0 and record the scan if allowed, else seconds to wait."""
    now = time.monotonic()
    with _lock:
        wait = config.COOLDOWN_SECONDS - (now - _last_scan.get(client, -1e9))
        if wait > 0:
            return int(wait) + 1
        _last_scan[client] = now
        return 0


# ------------------------------------------------------------------ routes

class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    time: str
    rules_loaded: int
    samples_available: int
    limits: dict[str, int]


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok", version=__version__,
        time=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        rules_loaded=len(ids.load_rules()), samples_available=len(ids.list_samples()),
        limits={"max_requests_per_scan": config.MAX_REQUESTS, "scan_deadline_seconds": config.SCAN_DEADLINE,
                "max_redirects": config.MAX_REDIRECTS, "cooldown_seconds": config.COOLDOWN_SECONDS,
                "max_upload_mb": config.MAX_UPLOAD_MB, "max_events": config.MAX_EVENTS},
    )


@app.get("/api/rules")
def rules():
    keep = ("id", "name", "enabled", "type", "event_filter", "event_filter_fail", "event_filter_success", "group_by",
            "distinct_field", "window_seconds", "threshold", "max_per_distinct", "start_hour", "end_hour", "timezone",
            "severity", "attack_technique", "explanation", "false_positives", "response", "bounds")
    return {"rules": [{k: r[k] for k in keep if k in r} for r in ids.load_rules()]}


@app.get("/api/ids/samples")
def samples():
    return {"samples": ids.list_samples()}


class ScanRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    authorized: Literal[True] = Field(description="User confirms they own or may test the target.")


@app.post("/api/scan", response_model=ScanResult)
def scan(body: ScanRequest, request: Request):
    wait = _claim_cooldown(request.client.host if request.client else "unknown")
    if wait:
        return _error(429, "cooldown", f"Please wait {wait} s before starting another scan.", retry_after=wait)
    return scanner.run_scan(body.url)


@app.post("/api/ids/run", response_model=IdsRunResult)
async def ids_run(sample: str | None = Form(None), overrides: str | None = Form(None),
                  file: UploadFile | None = File(None)):
    if (sample is None) == (file is None):
        raise ValidationError("Choose exactly one input: a sample dataset or an uploaded CSV file.")
    try:
        parsed = json.loads(overrides) if overrides else None
    except json.JSONDecodeError:
        raise ValidationError("Rule overrides are not valid JSON.") from None
    if file is not None:
        if not (file.filename or "").lower().endswith(".csv"):
            raise ValidationError("Upload a .csv file.")
        limit = config.MAX_UPLOAD_MB * 1024 * 1024
        data = await file.read(limit + 1)
        if len(data) > limit:
            raise ValidationError(f"File is larger than {config.MAX_UPLOAD_MB} MB.")
        name = "".join(c for c in (file.filename or "upload.csv") if c.isalnum() or c in "._-")[:80]
        return await run_in_threadpool(ids.run, data, name or "upload.csv", "uploaded", parsed)
    return await run_in_threadpool(ids.run, ids.read_sample(sample), sample, "sample", parsed)
