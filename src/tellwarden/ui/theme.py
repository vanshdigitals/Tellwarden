"""
Tellwarden Theme and Styling Engine
Injects custom CSS tokens adhering strictly to DESIGN_SYSTEM.md with owner-approved overrides O-1 to O-6.
"""
from pathlib import Path
import streamlit as st

def apply_theme():
    """Inject custom CSS rules and design tokens into Streamlit page."""
    custom_css = """
    <style>
    /* Self-hosted Typography */
    @font-face {
        font-family: 'DM Sans';
        src: url('/app/static/fonts/DMSans-Regular.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
    }
    @font-face {
        font-family: 'DM Sans';
        src: url('/app/static/fonts/DMSans-Medium.woff2') format('woff2');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
    }
    @font-face {
        font-family: 'DM Sans';
        src: url('/app/static/fonts/DMSans-SemiBold.woff2') format('woff2');
        font-weight: 600;
        font-style: normal;
        font-display: swap;
    }
    @font-face {
        font-family: 'IBM Plex Mono';
        src: url('/app/static/fonts/IBMPlexMono-Regular.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
    }

    /* Core Design Tokens */
    :root {
        --color-rampart-navy: #1B365D;
        --color-slate: #475569;
        --color-signal-teal: #0F766E;
        --color-signal-teal-hover: #0B5F58;
        --color-paper: #F8FAFC;
        --color-white: #FFFFFF;

        /* Derived Nav Tokens */
        --nav-text: #E2E8F0;
        --nav-label: #A9B8CC;
        --nav-hover: #27466F;
        --nav-active-bg: #FFFFFF;
        --focus-on-navy: #FFFFFF;
        --border-light: #CBD5E1;

        /* Semantic Status Tokens */
        --status-pass-text: #166534;
        --status-pass-bg: #E8F3EC;
        --status-pass-border: #B5D6C0;

        --status-warning-text: #B45309;
        --status-warning-bg: #FEF5E7;
        --status-warning-border: #EBCB9B;

        --status-fail-text: #B91C1C;
        --status-fail-bg: #FBEAEA;
        --status-fail-border: #EBB9B9;

        --status-info-text: #475569;
        --status-info-bg: #EEF2F6;
        --status-info-border: #CBD5E1;

        /* Shape Tokens */
        --radius-card: 14px;
        --radius-control: 10px;
        --radius-pill: 999px;

        --font-sans: "DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    /* Base Font Family Overrides */
    html, body, [class*="css"], .stMarkdown, .stText, p, span, div, label, input, button, select, textarea {
        font-family: var(--font-sans) !important;
    }

    code, kbd, pre, .mono-code, [data-testid="stCodeBlock"] {
        font-family: var(--font-mono) !important;
        font-size: 14px !important;
    }

    /* Custom Scope Banner (Full 1px outline, no one-sided border) */
    .tellwarden-banner {
        background-color: var(--status-info-bg);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-card);
        padding: 14px 18px;
        color: var(--color-rampart-navy);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 20px;
    }

    /* Status Badges (Pills with dual cues) */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        border: 1px solid transparent;
        white-space: nowrap;
    }

    .status-badge.pass {
        background-color: var(--status-pass-bg);
        color: var(--status-pass-text);
        border-color: var(--status-pass-border);
    }

    .status-badge.warning {
        background-color: var(--status-warning-bg);
        color: var(--status-warning-text);
        border-color: var(--status-warning-border);
    }

    .status-badge.fail {
        background-color: var(--status-fail-bg);
        color: var(--status-fail-text);
        border-color: var(--status-fail-border);
    }

    .status-badge.info {
        background-color: var(--status-info-bg);
        color: var(--status-info-text);
        border-color: var(--status-info-border);
    }

    /* Metric Count Card */
    .metric-count-card {
        background: var(--color-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-card);
        padding: 14px 18px;
        text-align: center;
        box-shadow: 0 1px 2px rgba(27, 54, 93, 0.06);
    }

    .metric-count-num {
        font-size: 28px;
        font-weight: 600;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
    }

    .metric-count-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 4px;
    }

    /* Form Controls & Buttons (Radius 10px, focus ring 2px) */
    input, select, textarea, button[kind="primary"], button[kind="secondary"] {
        border-radius: var(--radius-control) !important;
    }

    button:focus-visible, input:focus-visible {
        outline: 2px solid var(--color-signal-teal) !important;
        outline-offset: 2px !important;
    }

    /* Cards & Expanders */
    [data-testid="stExpander"] {
        border: 1px solid var(--border-light) !important;
        border-radius: var(--radius-card) !important;
        background-color: var(--color-white) !important;
        box-shadow: 0 1px 2px rgba(27, 54, 93, 0.06);
        overflow: hidden;
    }

    /* Metric widget font and styling */
    [data-testid="stMetricValue"] {
        font-weight: 600 !important;
        font-variant-numeric: tabular-nums !important;
        color: var(--color-rampart-navy) !important;
    }

    [data-testid="stMetricLabel"] {
        color: var(--color-slate) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }
    </style>
    """
    st.markdown(custom_css, unsafe_allow_html=True)

    # Load and inject shell.css once per run (as specified in Section 5.1)
    shell_css_path = Path(__file__).parent / "styles" / "shell.css"
    if shell_css_path.exists():
        shell_css = shell_css_path.read_text(encoding="utf-8")
        st.markdown(f"<style>\n{shell_css}\n</style>", unsafe_allow_html=True)
