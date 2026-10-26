"""
Typed result models shared by the engines and the HTTP API (TRD section 11).
Engines import only pydantic, never the web framework.
"""

from typing import Literal

from pydantic import BaseModel

CheckStatus = Literal["pass", "warning", "fail", "info"]


class CheckResult(BaseModel):
    check_id: str
    category: Literal["https", "header", "cors"]
    title: str
    status: CheckStatus
    observed: str
    expected: str
    explanation: str
    remediation: str
    reference_url: str


class RedirectHop(BaseModel):
    hop: int
    url: str
    status: int
    location: str | None = None


class TlsInfo(BaseModel):
    verified: bool
    error: str | None = None


class ScanResult(BaseModel):
    tool: str = "Tellwarden"
    version: str
    scan_id: str
    started_at: str
    finished_at: str
    input_url: str
    final_url: str
    redirect_chain: list[RedirectHop]
    resolved_addresses: list[str]
    tls: TlsInfo
    request_count: int
    checks: list[CheckResult]
    summary: dict[CheckStatus, int]
    complete: bool
    notes: list[str]
    limitations: list[str]
    authorization_confirmed: bool = True


class Finding(BaseModel):
    finding_id: str
    rule_id: str
    rule_name: str
    severity: str
    attack_technique: str
    entity: dict[str, str]
    first_seen: str
    last_seen: str
    event_count: int
    threshold: int | None
    window_seconds: int | None
    evidence_event_ids: list[str]
    evidence_truncated: bool
    explanation: str
    recommended_response: str
    data_origin: str = "offline simulation"


class SkippedRow(BaseModel):
    row: int
    reason: str


class RuleApplied(BaseModel):
    rule_id: str
    enabled: bool
    parameters: dict[str, int | str]


class IdsRunResult(BaseModel):
    tool: str = "Tellwarden"
    version: str
    run_id: str
    ran_at: str
    dataset_name: str
    dataset_origin: Literal["sample", "uploaded"]
    events_loaded: int
    rows_skipped: int
    skipped_examples: list[SkippedRow]
    notes: list[str]
    rules_applied: list[RuleApplied]
    findings: list[Finding]
    limitations: list[str]
