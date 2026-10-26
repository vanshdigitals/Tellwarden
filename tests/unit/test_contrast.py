"""
TC-A11Y-01: Automated Contrast Ratio Computation.
Verifies WCAG 2.x AA relative luminance contrast ratios for all core, status,
and derived navigation pairs defined in DESIGN_SYSTEM.md.
"""

import pytest

def hex_to_relative_luminance(hex_code: str) -> float:
    """Compute relative luminance according to WCAG 2.x formula."""
    hex_clean = hex_code.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join(c * 2 for c in hex_clean)
    r = int(hex_clean[0:2], 16) / 255.0
    g = int(hex_clean[2:4], 16) / 255.0
    b = int(hex_clean[4:6], 16) / 255.0

    def adjust(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        else:
            return ((channel + 0.055) / 1.055) ** 2.4

    r_adj = adjust(r)
    g_adj = adjust(g)
    b_adj = adjust(b)
    return 0.2126 * r_adj + 0.7152 * g_adj + 0.0722 * b_adj

def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculate contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05)."""
    l1 = hex_to_relative_luminance(hex1)
    l2 = hex_to_relative_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return round((lighter + 0.05) / (darker + 0.05), 2)

PAIRS = [
    # Core brand text
    ("Rampart Navy on White", "#1B365D", "#FFFFFF", 4.5, 12.12),
    ("Rampart Navy on Paper", "#1B365D", "#F8FAFC", 4.5, 11.59),
    ("Slate on White", "#475569", "#FFFFFF", 4.5, 7.58),
    ("Slate on Paper", "#475569", "#F8FAFC", 4.5, 7.24),
    ("Signal Teal on White", "#0F766E", "#FFFFFF", 4.5, 5.47),
    ("White on Signal Teal", "#FFFFFF", "#0F766E", 4.5, 5.47),
    ("Signal Teal on Paper", "#0F766E", "#F8FAFC", 4.5, 5.23),

    # Status tokens
    ("Pass on White", "#166534", "#FFFFFF", 4.5, 7.13),
    ("Pass on Paper", "#166534", "#F8FAFC", 4.5, 6.81),
    ("Pass on Tint", "#166534", "#E8F3EC", 4.5, 5.85),
    ("Warning on White", "#B45309", "#FFFFFF", 4.5, 5.02),
    ("Warning on Paper", "#B45309", "#F8FAFC", 4.5, 4.80),
    ("Warning on Tint", "#B45309", "#FEF5E7", 4.5, 4.54),
    ("Fail on White", "#B91C1C", "#FFFFFF", 4.5, 6.47),
    ("Fail on Paper", "#B91C1C", "#F8FAFC", 4.5, 6.18),
    ("Fail on Tint", "#B91C1C", "#FBEAEA", 4.5, 5.48),
    ("Info on Tint", "#475569", "#EEF2F6", 4.5, 6.64),

    # Derived navigation tokens (O-1 to O-6)
    ("nav-text on Navy", "#E2E8F0", "#1B365D", 4.5, 9.83),
    ("nav-label on Navy", "#A9B8CC", "#1B365D", 4.5, 6.01),
    ("nav-text on nav-hover", "#E2E8F0", "#27466F", 4.5, 7.77),
    ("Navy text on nav-active-bg", "#1B365D", "#FFFFFF", 4.5, 12.12),
    ("focus-on-navy on Navy", "#FFFFFF", "#1B365D", 3.0, 12.12),
    ("teal focus ring on Paper", "#0F766E", "#F8FAFC", 3.0, 5.23),
]

@pytest.mark.parametrize("name, fg, bg, min_threshold, expected", PAIRS)
def test_contrast_ratio_meets_threshold(name, fg, bg, min_threshold, expected):
    ratio = calculate_contrast_ratio(fg, bg)
    assert ratio >= min_threshold, f"{name} ratio {ratio} fails minimum threshold {min_threshold}"
