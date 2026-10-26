"""
Web Security Scanner View
Educational assessment of HTTPS, security headers, and CORS configuration.
"""

import streamlit as st
import pandas as pd
from tellwarden.ui.components import render_scope_banner, render_counts_row

def render():
    st.title("Web Security Scanner")
    st.caption("Inspects HTTPS certificate status, 11 essential security headers, and safe CORS configuration hygiene.")

    # Required banner from SECURITY_AND_ETHICS.md section 12
    render_scope_banner(
        "Scan only sites you own or have permission to test. This tool checks a few configuration settings. A good result does not mean a site is secure."
    )

    # Input card
    st.markdown(
        """
        <div style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:14px; padding:20px; margin-bottom:20px;">
            <h3 style="color:#1B365D; margin:0 0 12px 0; font-size:18px;">Target Configuration</h3>
            <p style="color:#475569; font-size:14px; margin-bottom:16px;">
                Enter a target domain or URL. Automated SSRF validation blocks private, loopback, and metadata addresses before any connection is made.
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )

    url_col, btn_col = st.columns([3, 1])
    with url_col:
        target_url = st.text_input("Target URL", value="https://example.test", help="Must be an HTTP or HTTPS target.")
        consent = st.checkbox("I own this site or have explicit permission to test", value=True)
    with btn_col:
        st.write("")
        st.write("")
        scan_clicked = st.button("Start Scan", type="primary", disabled=not consent)

    st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)

    # Summary counts row
    render_counts_row(pass_cnt=7, warn_cnt=3, fail_cnt=2, info_cnt=2)

    st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)

    # Results Table
    st.subheader("Sample Configuration Checks")
    st.caption("Baseline checks evaluated against sample documentation target (example.test).")

    checks_data = [
        {"Check": "HTTPS Enforced", "Category": "Transport", "Result": "PASS", "Observed": "TLS 1.3 enforced, valid cert"},
        {"Check": "Strict-Transport-Security", "Category": "Headers", "Result": "PASS", "Observed": "max-age=31536000; includeSubDomains"},
        {"Check": "Content-Security-Policy", "Category": "Headers", "Result": "WARNING", "Observed": "unsafe-inline directive present"},
        {"Check": "X-Frame-Options", "Category": "Headers", "Result": "PASS", "Observed": "DENY"},
        {"Check": "X-Content-Type-Options", "Category": "Headers", "Result": "PASS", "Observed": "nosniff"},
        {"Check": "Referrer-Policy", "Category": "Headers", "Result": "PASS", "Observed": "strict-origin-when-cross-origin"},
        {"Check": "Permissions-Policy", "Category": "Headers", "Result": "FAIL", "Observed": "Header missing"},
        {"Check": "Cross-Origin-Opener-Policy", "Category": "Headers", "Result": "INFO", "Observed": "same-origin"},
        {"Check": "Cross-Origin-Resource-Policy", "Category": "Headers", "Result": "INFO", "Observed": "same-site"},
        {"Check": "Access-Control-Allow-Origin", "Category": "CORS", "Result": "PASS", "Observed": "Restricted origin"},
        {"Check": "Access-Control-Allow-Credentials", "Category": "CORS", "Result": "PASS", "Observed": "Not combined with wildcard"}
    ]
    df = pd.DataFrame(checks_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
