"""
Platform Overview View
Telemetry snapshot, tool launchers, and recent sample findings.
"""

import streamlit as st
import pandas as pd
from tellwarden.ui.components import render_status_badge, render_severity_badge

def render():
    st.title("Overview")
    st.caption("Security posture snapshot and cross-module sample telemetry across web hygiene and detection rules.")

    # Welcome Strip
    st.markdown(
        """
        <div style="background-color:#1B365D; border-radius:14px; padding:18px 22px; color:#FFFFFF; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                    <h3 style="color:#FFFFFF; margin:0 0 4px 0; font-size:18px;">Welcome to Tellwarden</h3>
                    <p style="color:#E2E8F0; margin:0; font-size:14px; line-height:1.4;">
                        An educational cybersecurity workspace for web configuration hygiene and offline intrusion detection simulation. Explore findings, inspect rule logic, and evaluate sample workloads.
                    </p>
                </div>
                <span style="border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.1); border-radius:999px; padding:3px 12px; font-size:12px; color:#FFFFFF; white-space:nowrap;">
                    Educational prototype
                </span>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

    # 4 Metric Cards
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric(label="Sample checks", value="17", delta="12 Pass · 3 Warn · 2 Fail", delta_color="off")
    with c2:
        st.metric(label="Events analysed", value="1,200", delta="Across 4 scenarios", delta_color="off")
    with c3:
        st.metric(label="IDS findings", value="5", delta="1 Crit · 2 High · 2 Med", delta_color="off")
    with c4:
        st.metric(label="Example rules", value="7", delta="MITRE ATT&CK mapped", delta_color="off")

    st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)

    # Tool Launch Cards
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown(
            """
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; padding:20px; box-shadow:0 1px 2px rgba(27,54,93,0.06); height:100%;">
                <span style="font-size:11px; font-weight:600; text-transform:uppercase; color:#0F766E; background:rgba(15,118,110,0.1); padding:2px 8px; border-radius:999px;">MODULE A</span>
                <h3 style="color:#1B365D; margin:8px 0 6px 0; font-size:18px;">Web Security Scanner</h3>
                <p style="color:#475569; font-size:14px; line-height:1.4; margin-bottom:12px;">
                    Inspects HTTPS certificate status, 11 essential security headers, and basic CORS configuration hygiene on target hosts with SSRF safeguards.
                </p>
                <div style="background:#F1F5F9; border-radius:8px; padding:8px 12px; font-size:13px; color:#1B365D; margin-bottom:14px;">
                    <strong>Sample target:</strong> <code>https://example.test</code>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col_b:
        st.markdown(
            """
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; padding:20px; box-shadow:0 1px 2px rgba(27,54,93,0.06); height:100%;">
                <span style="font-size:11px; font-weight:600; text-transform:uppercase; color:#0F766E; background:rgba(15,118,110,0.1); padding:2px 8px; border-radius:999px;">MODULE B</span>
                <h3 style="color:#1B365D; margin:8px 0 6px 0; font-size:18px;">Offline IDS Simulator</h3>
                <p style="color:#475569; font-size:14px; line-height:1.4; margin-bottom:12px;">
                    Evaluates sliding-window detection rules against event logs to identify brute force, port scans, and anomalous traffic patterns without network probes.
                </p>
                <div style="background:#F1F5F9; border-radius:8px; padding:8px 12px; font-size:13px; color:#1B365D; margin-bottom:14px;">
                    <strong>Active dataset:</strong> <code>mixed_normal.csv (1,200 events)</code>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)

    # Recent Sample Findings Table
    st.subheader("Recent sample findings")
    st.caption("Simulated detections and web configuration hygiene checks.")

    sample_data = [
        {"Finding": "AUTH-001: SSH Brute Force Detected", "Module": "IDS Simulator", "Status": "Fail", "Severity": "High", "Time (UTC)": "21:14:02"},
        {"Finding": "HSTS max-age >= 31536000 with subdomains", "Module": "Web Scanner", "Status": "Pass", "Severity": "None", "Time (UTC)": "21:12:15"},
        {"Finding": "Content-Security-Policy contains unsafe-inline", "Module": "Web Scanner", "Status": "Warning", "Severity": "Medium", "Time (UTC)": "21:12:15"},
        {"Finding": "NET-001: Vertical Port Scan Pattern", "Module": "IDS Simulator", "Status": "Fail", "Severity": "Critical", "Time (UTC)": "21:10:48"},
        {"Finding": "X-Content-Type-Options: nosniff present", "Module": "Web Scanner", "Status": "Pass", "Severity": "None", "Time (UTC)": "21:12:15"},
        {"Finding": "CORS Origin Reflection with Credentials", "Module": "Web Scanner", "Status": "Needs Review", "Severity": "Medium", "Time (UTC)": "21:12:15"},
        {"Finding": "AUTH-004: Off-Hours Admin Login", "Module": "IDS Simulator", "Status": "Warning", "Severity": "Low", "Time (UTC)": "21:05:30"}
    ]
    df = pd.DataFrame(sample_data)
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.caption("Educational prototype · Sample data only · Not a live scanner or real-time network monitor.")
