"""
Documentation consistency tests:
- TC-DOC-01: Banned claims scan
- TC-DOC-02: Hex colors verification
- TC-DOC-03: Font names verification
"""

import re
from pathlib import Path
import pytest

BANNED_CLAIMS = [
    r"\bAI-powered\b",
    r"\bmachine learning\b(?!\s+(?:is not|not used|out of scope))",
    r"\breal-time\b(?!\s+(?:is not|not supported|out of scope))",
    r"\blive traffic\b(?!\s+(?:is not|not supported|out of scope))",
    r"\bproduction-grade\b(?!\s+(?:is not|not supported|out of scope))",
    r"\bguaranteed\b(?!\s+(?:is not|not a))",
]

ALLOWED_HEX = {
    # Core brand
    "#1B365D", "#475569", "#0F766E", "#0B5F58", "#F8FAFC", "#FFFFFF",
    # Status tokens
    "#166534", "#B45309", "#B91C1C", "#E8F3EC", "#FEF5E7", "#FBEAEA", "#EEF2F6",
    "#B5D6C0", "#EBCB9B", "#EBB9B9", "#CBD5E1", "#E7EDF5",
    # Supporting neutrals & derived tokens
    "#E2E8F0", "#A9B8CC", "#27466F", "#34578A", "#94A3B8", "#F1F5F9", "#64748B", "#7F1D1D"
}

MARKDOWN_DOCS = [
    "README.md",
    "PRD.md",
    "TRD.md",
    "DESIGN_SYSTEM.md",
    "SECURITY_AND_ETHICS.md",
    "TEST_PLAN.md",
    "DECISIONS_AND_ASSUMPTIONS.md",
    "PROJECT_STRUCTURE.md",
    "REFERENCES.md",
    "RESEARCH_AND_NAMING.md"
]

def test_tc_doc_01_banned_claims(project_root):
    """TC-DOC-01: Verify no positive claims of banned buzzwords in Markdown files."""
    violations = []
    for doc in MARKDOWN_DOCS:
        p = project_root / doc
        if not p.exists():
            continue
        content = p.read_text(encoding="utf-8")
        in_out_of_scope = False
        for line_no, line in enumerate(content.splitlines(), 1):
            if "out of scope" in line.lower() and line.startswith("#"):
                in_out_of_scope = True
                continue
            elif in_out_of_scope and line.startswith("#"):
                in_out_of_scope = False

            if in_out_of_scope:
                continue

            # Skip lines that explicitly negate or disclaim
            lower_line = line.lower()
            if any(neg in lower_line for neg in ["no ", "not ", "never ", "banned", "out of scope", "does not"]):
                continue

            for pattern in BANNED_CLAIMS:
                if re.search(pattern, line, re.IGNORECASE):
                    violations.append(f"{doc}:{line_no} matches banned pattern {pattern}: '{line.strip()}'")
    assert not violations, f"Banned claims found:\n" + "\n".join(violations)

def test_tc_doc_02_hex_colors(project_root):
    """TC-DOC-02: Search all documents for hex colors and verify only allowed palette tokens exist."""
    hex_pattern = re.compile(r"#[0-9a-fA-F]{6}\b")
    violations = []
    allowed_upper = {h.upper() for h in ALLOWED_HEX}

    for doc in MARKDOWN_DOCS:
        p = project_root / doc
        if not p.exists():
            continue
        content = p.read_text(encoding="utf-8")
        for line_no, line in enumerate(content.splitlines(), 1):
            matches = hex_pattern.findall(line)
            for m in matches:
                if m.upper() not in allowed_upper:
                    violations.append(f"{doc}:{line_no} contains unapproved hex {m} in '{line.strip()}'")

    assert not violations, f"Unapproved hex colors found:\n" + "\n".join(violations)

def test_tc_doc_03_font_names(project_root):
    """TC-DOC-03: Confirm DM Sans and IBM Plex Mono are the active typography pairing in DESIGN_SYSTEM.md."""
    ds = project_root / "DESIGN_SYSTEM.md"
    content = ds.read_text(encoding="utf-8")
    assert "DM Sans" in content
    assert "IBM Plex Mono" in content
