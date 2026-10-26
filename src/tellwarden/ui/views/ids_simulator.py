"""
Offline Rule-Based IDS Simulator View
Evaluates sliding-window detection rules against event logs.
"""

import streamlit as st
import pandas as pd
from tellwarden.ui.components import render_scope_banner

def render():
    st.title("Offline IDS Simulator")
    st.caption("Evaluates sliding-window detection rules against event logs to identify brute force, port scans, and anomalous traffic patterns.")

    # Required banner from SECURITY_AND_ETHICS.md section 12
    render_scope_banner(
        "Offline simulation of sample data. This is not live network monitoring."
    )

    # Control card
    st.markdown(
        """
        <div style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:14px; padding:20px; margin-bottom:20px;">
            <h3 style="color:#1B365D; margin:0 0 12px 0; font-size:18px;">Simulation Workload</h3>
            <p style="color:#475569; font-size:14px; margin-bottom:16px;">
                Select a bundled scenario or upload a CSV file with synthetic RFC documentation IP addresses.
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )

    sc_col, btn_col = st.columns([3, 1])
    with sc_col:
        dataset = st.selectbox(
            "Sample Dataset",
            options=["mixed_normal.csv (1,200 events)", "brute_force.csv (150 events)", "port_scan.csv (180 events)", "password_spraying.csv (220 events)"],
            index=0
        )
    with btn_col:
        st.write("")
        st.write("")
        run_clicked = st.button("Run Analysis", type="primary")

    st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)

    # Findings Table
    st.subheader("Sample Detections")
    st.caption("Triggered rules based on sliding-window state evaluation.")

    findings_data = [
        {"Rule ID": "AUTH-001", "Rule Name": "SSH Brute Force", "Entity": "192.0.2.45", "Severity": "HIGH", "Count": 8, "Window": "300s", "Time (UTC)": "21:14:02"},
        {"Rule ID": "NET-001", "Rule Name": "Vertical Port Scan", "Entity": "198.51.100.12", "Severity": "CRITICAL", "Count": 18, "Window": "60s", "Time (UTC)": "21:10:48"},
        {"Rule ID": "AUTH-004", "Rule Name": "Off-Hours Admin Login", "Entity": "admin_ops", "Severity": "LOW", "Count": 1, "Window": "N/A", "Time (UTC)": "21:05:30"}
    ]
    df = pd.DataFrame(findings_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
