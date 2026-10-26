import pytest

from tellwarden import ids
from tellwarden.exceptions import ValidationError

HEADER = "event_id,timestamp,event_type,src_ip,dst_ip,dst_port,username\n"


def run_sample(name, overrides=None):
    return ids.run(ids.read_sample(name), name, "sample", overrides)


def rule_ids(result):
    return {f.rule_id for f in result.findings}


def test_rules_file_loads_and_is_within_bounds():
    rules = ids.load_rules()
    assert {r["id"] for r in rules} >= {"AUTH-001", "AUTH-002", "NET-001"}


def test_brute_force_sample_detected_with_real_evidence():
    result = run_sample("brute_force")
    assert "AUTH-001" in rule_ids(result)
    finding = next(f for f in result.findings if f.rule_id == "AUTH-001")
    csv_ids = {line.split(",")[0] for line in ids.read_sample("brute_force").decode().splitlines()[1:]}
    assert set(finding.evidence_event_ids) <= csv_ids
    assert finding.event_count >= 5 and finding.entity == {"src_ip": "198.51.100.42"}


def test_password_spraying_sample_detected():
    assert "AUTH-002" in rule_ids(run_sample("password_spraying"))


def test_port_scan_sample_detected():
    assert "NET-001" in rule_ids(run_sample("port_scan"))


def test_normal_sample_has_no_attack_findings():
    assert not rule_ids(run_sample("mixed_normal")) & {"AUTH-001", "AUTH-002", "AUTH-003", "NET-001", "NET-002"}


def test_threshold_override_changes_result_and_is_bounded():
    assert "AUTH-001" not in rule_ids(run_sample("brute_force", {"AUTH-001": {"threshold": 50}}))
    with pytest.raises(ValidationError):
        run_sample("brute_force", {"AUTH-001": {"threshold": 999}})
    with pytest.raises(ValidationError):
        run_sample("brute_force", {"AUTH-001": {"severity": "Low"}})


def test_overlapping_windows_merge_into_one_finding():
    rows = "".join(f"e{i},2026-01-01T10:00:{i:02d}Z,auth_failure,198.51.100.1,,,root\n" for i in range(20))
    result = ids.run((HEADER + rows).encode(), "t.csv", "uploaded")
    assert [f.event_count for f in result.findings if f.rule_id == "AUTH-001"] == [20]


def test_failures_then_success():
    rows = "".join(f"f{i},2026-01-01T10:00:{i:02d}Z,auth_failure,198.51.100.1,,,alice\n" for i in range(6))
    rows += "s1,2026-01-01T10:01:00Z,auth_success,198.51.100.1,,,alice\n"
    result = ids.run((HEADER + rows).encode(), "t.csv", "uploaded")
    f = next(f for f in result.findings if f.rule_id == "AUTH-003")
    assert f.evidence_event_ids[-1] == "s1" and f.severity == "Critical"


def test_invalid_rows_are_skipped_with_reasons():
    rows = ("a,not-a-date,auth_failure,198.51.100.1,,,u\n"
            "b,2026-01-01T10:00:00Z,auth_failure,999.1.1.1,,,u\n"
            "c,2026-01-01T10:00:00Z,teleport,198.51.100.1,,,u\n"
            "d,2026-01-01T10:00:00,auth_failure,198.51.100.1,,,u\n"
            "d,2026-01-01T10:00:00Z,auth_failure,198.51.100.1,,,u\n")
    result = ids.run((HEADER + rows).encode(), "t.csv", "uploaded")
    assert result.events_loaded == 1 and result.rows_skipped == 4
    assert [s.row for s in result.skipped_examples] == [2, 3, 4, 6]
    assert any("treated as UTC" in n for n in result.notes)


def test_missing_columns_and_bad_encoding_rejected():
    with pytest.raises(ValidationError):
        ids.parse_events(b"foo,bar\n1,2\n")
    with pytest.raises(ValidationError):
        ids.parse_events(b"\xff\xfe\x00bad")


def test_engine_is_deterministic():
    a, b = run_sample("port_scan"), run_sample("port_scan")
    assert [f.model_dump() for f in a.findings] == [f.model_dump() for f in b.findings]
