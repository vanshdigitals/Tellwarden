"""
Reusable UI components for Tellwarden dashboard.
Adheres to DESIGN_SYSTEM.md dual-cue (icon + text + color) and accessibility rules.
"""

import streamlit as st

def render_status_badge(status: str) -> str:
    """Return HTML for an accessible dual-cue status badge."""
    s = status.strip().capitalize()
    if s == "Pass":
        return '<span class="status-badge pass">✓ PASS</span>'
    elif s == "Warning":
        return '<span class="status-badge warning">⚠ WARNING</span>'
    elif s == "Fail":
        return '<span class="status-badge fail">✕ FAIL</span>'
    else:
        return '<span class="status-badge info">ℹ INFO</span>'

def render_severity_badge(severity: str) -> str:
    """Return HTML for an IDS severity badge."""
    sev = severity.strip().capitalize()
    if sev == "Critical":
        return '<span class="status-badge fail" style="font-weight:700;">CRITICAL</span>'
    elif sev == "High":
        return '<span class="status-badge fail">HIGH</span>'
    elif sev == "Medium":
        return '<span class="status-badge warning">MEDIUM</span>'
    else:
        return '<span class="status-badge info">LOW</span>'

def render_scope_banner(text: str):
    """Render a prominent scope & ethical use disclaimer banner."""
    svg_icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    st.markdown(
        f'<div class="tellwarden-banner">{svg_icon}<strong>Notice:</strong> {text}</div>',
        unsafe_allow_html=True
    )

def render_counts_row(pass_cnt: int, warn_cnt: int, fail_cnt: int, info_cnt: int):
    """Render 4 responsive summary count cards without grading or scoring (SCN-10)."""
    cols = st.columns(4)
    with cols[0]:
        st.markdown(
            f'<div class="metric-count-card" style="border-color:#B5D6C0;">'
            f'<div class="metric-count-num" style="color:#166534;">{pass_cnt}</div>'
            f'<div class="metric-count-label" style="color:#166534;">PASS</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    with cols[1]:
        st.markdown(
            f'<div class="metric-count-card" style="border-color:#EBCB9B;">'
            f'<div class="metric-count-num" style="color:#B45309;">{warn_cnt}</div>'
            f'<div class="metric-count-label" style="color:#B45309;">WARNING</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    with cols[2]:
        st.markdown(
            f'<div class="metric-count-card" style="border-color:#EBB9B9;">'
            f'<div class="metric-count-num" style="color:#B91C1C;">{fail_cnt}</div>'
            f'<div class="metric-count-label" style="color:#B91C1C;">FAIL</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    with cols[3]:
        st.markdown(
            f'<div class="metric-count-card" style="border-color:#CBD5E1;">'
            f'<div class="metric-count-num" style="color:#475569;">{info_cnt}</div>'
            f'<div class="metric-count-label" style="color:#475569;">INFO</div>'
            f'</div>',
            unsafe_allow_html=True
        )
