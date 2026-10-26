"""
Offline rule-based IDS simulator (TRD sections 9 and 10).
Pure functions of events plus rules: same input, same output. No live capture.
"""

import csv
import io
import ipaddress
import uuid
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from tellwarden import __version__, config
from tellwarden.exceptions import RuleConfigError, ValidationError
from tellwarden.models import Finding, IdsRunResult, RuleApplied, SkippedRow

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RULES_PATH = PROJECT_ROOT / "rules" / "default_rules.yaml"
SAMPLES_DIR = PROJECT_ROOT / "data" / "sample_events"

EVENT_TYPES = {"auth_success", "auth_failure", "conn", "http_request"}
RULE_TYPES = {"count_in_window", "distinct_in_window", "failures_then_success", "time_of_day"}
REQUIRED_COLUMNS = {"timestamp", "event_type", "src_ip"}
TUNABLE = ("threshold", "window_seconds", "max_per_distinct", "start_hour", "end_hour")
MAX_EVIDENCE = 500
MAX_SKIPPED_SHOWN = 20

SAMPLES = {
    "brute_force": ("Brute force", "Repeated SSH failures from one source against the root account."),
    "password_spraying": ("Password spraying", "One source trying many usernames a few times each."),
    "port_scan": ("Port scan", "One source connecting to many ports on a single host."),
    "mixed_normal": ("Normal activity", "Ordinary business-hours logins and web traffic. Expect few or no findings."),
}

LIMITATIONS = [
    "Offline simulation of event logs. This is not live packet capture or real-time network monitoring.",
    "Thresholds are illustrative teaching defaults, not tuned production detection logic.",
    "Findings are pattern matches on the supplied events only and may include false positives.",
]


@dataclass(frozen=True)
class Event:
    event_id: str
    ts: datetime
    event_type: str
    fields: dict[str, str]

    def get(self, name: str) -> str:
        return self.fields.get(name, "")


# ---------------------------------------------------------------- rules

def load_rules(path: Path = RULES_PATH) -> list[dict[str, Any]]:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise RuleConfigError("Rule file is missing.") from None
    except yaml.YAMLError:
        raise RuleConfigError("Rule file is not valid YAML.") from None
    rules = data.get("rules") if isinstance(data, dict) else None
    if not isinstance(rules, list) or not rules:
        raise RuleConfigError("Rule file must contain a non-empty 'rules' list.")
    seen = set()
    for rule in rules:
        rid = rule.get("id") if isinstance(rule, dict) else None
        if not rid or rid in seen:
            raise RuleConfigError(f"Rule id missing or duplicated: {rid!r}.")
        seen.add(rid)
        if rule.get("type") not in RULE_TYPES:
            raise RuleConfigError(f"Rule {rid} has unknown type {rule.get('type')!r}.")
        for key in ("name", "severity", "explanation", "response"):
            if not rule.get(key):
                raise RuleConfigError(f"Rule {rid} is missing '{key}'.")
        for param, bounds in (rule.get("bounds") or {}).items():
            if not (isinstance(bounds, list) and len(bounds) == 2 and bounds[0] <= rule.get(param, bounds[0]) <= bounds[1]):
                raise RuleConfigError(f"Rule {rid} default for '{param}' is outside its bounds.")
    return rules


def apply_overrides(rules: list[dict[str, Any]], overrides: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Return copies of rules with user overrides applied. Values outside bounds raise ValidationError."""
    overrides = overrides or {}
    if not isinstance(overrides, dict):
        raise ValidationError("Rule overrides must be an object keyed by rule id.")
    by_id = {r["id"]: r for r in rules}
    unknown = set(overrides) - set(by_id)
    if unknown:
        raise ValidationError(f"Unknown rule id(s): {', '.join(sorted(unknown))}.")
    result = []
    for rule in rules:
        rule = dict(rule)
        change = overrides.get(rule["id"]) or {}
        if not isinstance(change, dict):
            raise ValidationError(f"Override for {rule['id']} must be an object.")
        for key, value in change.items():
            if key == "enabled":
                if not isinstance(value, bool):
                    raise ValidationError(f"{rule['id']}.enabled must be true or false.")
                rule["enabled"] = value
                continue
            bounds = (rule.get("bounds") or {}).get(key)
            if bounds is None:
                raise ValidationError(f"{rule['id']}.{key} is not an adjustable parameter.")
            if not isinstance(value, int) or isinstance(value, bool) or not bounds[0] <= value <= bounds[1]:
                raise ValidationError(f"{rule['id']}.{key} must be an integer from {bounds[0]} to {bounds[1]}.")
            rule[key] = value
        result.append(rule)
    return result


# ---------------------------------------------------------------- events

def _parse_ts(value: str) -> tuple[datetime, bool]:
    ts = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc), True
    return ts.astimezone(timezone.utc), False


def parse_events(data: bytes) -> tuple[list[Event], list[SkippedRow], int, list[str]]:
    """Validate and parse a CSV of events. Returns (events, skipped examples, skipped count, notes)."""
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(f"File is larger than {config.MAX_UPLOAD_MB} MB.")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ValidationError("File is not valid UTF-8 text.") from None
    reader = csv.DictReader(io.StringIO(text, newline=""))
    header = {h.strip() for h in (reader.fieldnames or []) if h}
    missing = REQUIRED_COLUMNS - header
    if missing:
        raise ValidationError(f"CSV is missing required column(s): {', '.join(sorted(missing))}.")

    events: list[Event] = []
    skipped: list[SkippedRow] = []
    skipped_count = 0
    naive = 0
    ids: set[str] = set()

    def skip(row_no: int, reason: str):
        nonlocal skipped_count
        skipped_count += 1
        if len(skipped) < MAX_SKIPPED_SHOWN:
            skipped.append(SkippedRow(row=row_no, reason=reason))

    for idx, row in enumerate(reader):
        row_no = idx + 2  # header is line 1
        if idx >= config.MAX_EVENTS:
            raise ValidationError(f"CSV has more than {config.MAX_EVENTS} rows.")
        if None in row:
            skip(row_no, "Row has more columns than the header.")
            continue
        f = {k.strip(): (v or "").strip() for k, v in row.items() if k}
        etype = f.get("event_type", "")
        if etype not in EVENT_TYPES:
            skip(row_no, f"Unknown event_type (expected one of {', '.join(sorted(EVENT_TYPES))}).")
            continue
        try:
            ts, was_naive = _parse_ts(f.get("timestamp", ""))
        except ValueError:
            skip(row_no, "timestamp is not ISO 8601.")
            continue
        try:
            ipaddress.ip_address(f.get("src_ip", ""))
            if f.get("dst_ip"):
                ipaddress.ip_address(f["dst_ip"])
        except ValueError:
            skip(row_no, "src_ip or dst_ip is not a valid IP address.")
            continue
        if etype == "conn":
            port = f.get("dst_port", "")
            if not f.get("dst_ip") or not port.isdigit() or not 0 <= int(port) <= 65535:
                skip(row_no, "conn events need dst_ip and dst_port (0-65535).")
                continue
        elif f.get("dst_port") and not (f["dst_port"].isdigit() and int(f["dst_port"]) <= 65535):
            skip(row_no, "dst_port must be an integer 0-65535.")
            continue
        if etype.startswith("auth_") and not f.get("username"):
            skip(row_no, "Auth events need a username.")
            continue
        if len(f.get("username", "")) > 128 or len(f.get("user_agent", "")) > 256:
            skip(row_no, "username (max 128) or user_agent (max 256) is too long.")
            continue
        eid = f.get("event_id") or f"row-{row_no}"
        if len(eid) > 128:
            skip(row_no, "event_id is longer than 128 characters.")
            continue
        if eid in ids:
            skip(row_no, f"Duplicate event_id '{eid}'.")
            continue
        ids.add(eid)
        naive += was_naive
        events.append(Event(event_id=eid, ts=ts, event_type=etype, fields=f))

    events.sort(key=lambda e: (e.ts, e.event_id))
    notes = [f"{naive} timestamp(s) had no timezone and were treated as UTC."] if naive else []
    return events, skipped, skipped_count, notes


# ---------------------------------------------------------------- engine

def _key(rule: dict, e: Event) -> tuple[str, ...]:
    group = rule["group_by"] if isinstance(rule["group_by"], list) else [rule["group_by"]]
    return tuple(e.get(g) for g in group)


def _groups(rule: dict, events: list[Event], etype: str) -> dict[tuple, list[Event]]:
    groups: dict[tuple, list[Event]] = defaultdict(list)
    for e in events:
        if e.event_type == etype:
            groups[_key(rule, e)].append(e)
    return groups


def _merge_windows(windows: list[tuple[int, int, set | None]]) -> list[tuple[int, int, set | None]]:
    """Merge overlapping index ranges [i, j] (IDS-13). Third item is an optional value filter."""
    merged: list[tuple[int, int, set | None]] = []
    for i, j, vals in windows:
        if merged and i <= merged[-1][1]:
            pi, pj, pv = merged[-1]
            merged[-1] = (pi, max(pj, j), (pv | vals) if pv is not None and vals is not None else None)
        else:
            merged.append((i, j, set(vals) if vals is not None else None))
    return merged


def _eval_count(rule: dict, events: list[Event]):
    win, thr = rule["window_seconds"], rule["threshold"]
    for key, evs in _groups(rule, events, rule["event_filter"]).items():
        windows, i = [], 0
        for j in range(len(evs)):
            while (evs[j].ts - evs[i].ts).total_seconds() > win:
                i += 1
            if j - i + 1 >= thr:
                windows.append((i, j, None))
        for i, j, _ in _merge_windows(windows):
            yield key, evs[i:j + 1]


def _eval_distinct(rule: dict, events: list[Event]):
    win, thr, field = rule["window_seconds"], rule["threshold"], rule["distinct_field"]
    cap = rule.get("max_per_distinct")
    for key, evs in _groups(rule, events, rule["event_filter"]).items():
        windows, i, counts = [], 0, Counter()
        for j, e in enumerate(evs):
            counts[e.get(field)] += 1
            while (e.ts - evs[i].ts).total_seconds() > win:
                counts[evs[i].get(field)] -= 1
                if counts[evs[i].get(field)] == 0:
                    del counts[evs[i].get(field)]
                i += 1
            qualifying = {v for v, n in counts.items() if v and (cap is None or n <= cap)}
            if len(qualifying) >= thr:
                windows.append((i, j, qualifying))
        for i, j, vals in _merge_windows(windows):
            yield key, [e for e in evs[i:j + 1] if e.get(field) in vals]


def _eval_fail_success(rule: dict, events: list[Event]):
    win, thr = rule["window_seconds"], rule["threshold"]
    fails: dict[tuple, deque[Event]] = defaultdict(deque)
    for e in events:
        key = _key(rule, e)
        if e.event_type == rule["event_filter_fail"]:
            fails[key].append(e)
        elif e.event_type == rule["event_filter_success"]:
            q = fails[key]
            while q and (e.ts - q[0].ts).total_seconds() > win:
                q.popleft()
            if len(q) >= thr:
                yield key, [*q, e]
            q.clear()


def _eval_time_of_day(rule: dict, events: list[Event]):
    start, end = rule["start_hour"], rule["end_hour"]
    tz = timezone.utc
    if str(rule.get("timezone", "UTC")).upper() != "UTC":
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(rule["timezone"])
    for key, evs in _groups(rule, events, rule["event_filter"]).items():
        def outside(e):
            h = e.ts.astimezone(tz).hour
            return not (start <= h < end) if start <= end else (end <= h < start)
        hits = [e for e in evs if outside(e)]
        if hits:
            yield key, hits


EVALUATORS = {"count_in_window": _eval_count, "distinct_in_window": _eval_distinct,
              "failures_then_success": _eval_fail_success, "time_of_day": _eval_time_of_day}


def _iso(ts: datetime) -> str:
    return ts.isoformat(timespec="seconds").replace("+00:00", "Z")


def evaluate(events: list[Event], rules: list[dict[str, Any]]) -> list[Finding]:
    findings: list[Finding] = []
    for rule in rules:
        if not rule.get("enabled", True):
            continue
        group = rule["group_by"] if isinstance(rule["group_by"], list) else [rule["group_by"]]
        for n, (key, evidence) in enumerate(EVALUATORS[rule["type"]](rule, events), start=1):
            findings.append(Finding(
                finding_id=f"{rule['id']}-{n:03d}", rule_id=rule["id"], rule_name=rule["name"],
                severity=rule["severity"], attack_technique=str(rule.get("attack_technique", "")),
                entity=dict(zip(group, key)), first_seen=_iso(evidence[0].ts), last_seen=_iso(evidence[-1].ts),
                event_count=len(evidence), threshold=rule.get("threshold"), window_seconds=rule.get("window_seconds"),
                evidence_event_ids=[e.event_id for e in evidence[:MAX_EVIDENCE]],
                evidence_truncated=len(evidence) > MAX_EVIDENCE,
                explanation=rule["explanation"], recommended_response=rule["response"],
            ))
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    findings.sort(key=lambda f: (order.get(f.severity, 9), f.first_seen, f.finding_id))
    return findings


def run(data: bytes, dataset_name: str, origin: str, overrides: dict | None = None,
        rules_path: Path = RULES_PATH) -> IdsRunResult:
    rules = apply_overrides(load_rules(rules_path), overrides)
    events, skipped, skipped_count, notes = parse_events(data)
    if not events:
        notes.append("No valid events were loaded, so no rules were evaluated.")
    findings = evaluate(events, rules)
    applied = [RuleApplied(rule_id=r["id"], enabled=bool(r.get("enabled", True)),
                           parameters={k: r[k] for k in TUNABLE if k in r}) for r in rules]
    return IdsRunResult(
        version=__version__, run_id=uuid.uuid4().hex[:12], ran_at=_iso(datetime.now(timezone.utc)),
        dataset_name=dataset_name, dataset_origin=origin, events_loaded=len(events), rows_skipped=skipped_count,
        skipped_examples=skipped, notes=notes, rules_applied=applied, findings=findings, limitations=LIMITATIONS,
    )


def list_samples() -> list[dict[str, Any]]:
    out = []
    for sid, (name, desc) in SAMPLES.items():
        path = SAMPLES_DIR / f"{sid}.csv"
        if path.is_file():
            rows = max(0, sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip()) - 1)
            out.append({"id": sid, "name": name, "description": desc, "rows": rows})
    return out


def read_sample(sample_id: str) -> bytes:
    if sample_id not in SAMPLES:
        raise ValidationError("Unknown sample dataset.")
    return (SAMPLES_DIR / f"{sample_id}.csv").read_bytes()
