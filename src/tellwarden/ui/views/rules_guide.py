"""
Detection Rules Guide View
Catalog of sliding-window detection rules with MITRE ATT&CK mapping and parameter bounds.
"""

import streamlit as st
import yaml
from pathlib import Path

def render():
    st.title("Detection Rules Guide")
    st.caption("Reference specifications for sliding-window detection rules, parameter bounds, and MITRE ATT&CK mapping.")

    # Educational notice
    st.markdown(
        """
        <div style="background:#EEF2F6; border:1px solid #CBD5E1; border-radius:14px; padding:16px 20px; color:#1B365D; margin-bottom:24px;">
            <strong>Illustrative Rule Set:</strong> Thresholds and sliding-window durations are educational references modeled after standard defensive baseline conventions (e.g., fail2ban). They can be tuned within bounded parameters during simulation.
        </div>
        """,
        unsafe_allow_html=True
    )

    rules_file = Path("rules/default_rules.yaml")
    if rules_file.exists():
        with open(rules_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            rules = data.get("rules", [])
    else:
        rules = []

    if not rules:
        st.info("No detection rules catalog found.")
        return

    for rule in rules:
        with st.expander(f"{rule.get('id')}: {rule.get('name')} [{rule.get('severity')}]", expanded=False):
            st.markdown(f"**Description:** {rule.get('description')}")
            st.markdown(f"**Rule Type:** `{rule.get('type')}`")
            st.markdown(f"**MITRE ATT&CK:** `{rule.get('attack_technique')}`")
            
            params = rule.get("parameters", {})
            st.markdown("**Parameters:**")
            p_cols = st.columns(len(params)) if params else []
            for idx, (k, v) in enumerate(params.items()):
                with p_cols[idx]:
                    st.metric(label=k.replace("_", " ").title(), value=str(v))
