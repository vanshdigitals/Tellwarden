"""
About & Limitations View
Educational charter, technical architecture, responsible use, and scope boundaries.
"""

import streamlit as st

def render():
    st.title("About & Limitations")
    st.caption("Educational charter, technical architecture, responsible use, and operational constraints.")

    st.markdown(
        """
        ### Educational Charter
        Tellwarden is an educational cybersecurity workspace designed to demonstrate defensive security principles:
        1. **Web Configuration Hygiene:** Inspecting HTTPS certificate posture, HTTP security headers, and basic CORS configuration without intrusive probing.
        2. **Rule-Based Intrusion Detection:** Simulating sliding-window pattern matching against offline event logs without live network sniffing or kernel agents.

        ### Strict Limitations
        - **No Exploitation or Crawling:** Tellwarden does not crawl links, execute active exploits, perform brute-force attacks, or test for application vulnerabilities (SQLi, XSS, CSRF).
        - **Offline Simulation:** Module B operates exclusively on static CSV event files. It is not a live packet analyzer or real-time network monitor.
        - **Honest Posture:** No single numerical score, letter grade, or guarantee of safety is produced. A clean scan merely reflects configuration hygiene at that point in time.

        ### Safe HTTP Design & SSRF Safeguards
        - Pre-flight DNS resolution with strict IP blocklists (blocking RFC 1918, link-local, loopback, and cloud metadata addresses such as `169.254.169.254` and `fd00:ec2::254`).
        - Strict port restriction (ports 80 and 443 only).
        - Strict timeout budget (20-second hard deadline, 3-second connect timeout, 5-second read timeout).
        - Manual redirect inspection with maximum 3 hops, re-validating each hop against the network guard.

        ### Open Source Licensing
        Tellwarden is distributed under the **MIT License**. Self-hosted typography (DM Sans and IBM Plex Mono) is licensed under the **SIL Open Font License 1.1**.
        """,
        unsafe_allow_html=True
    )
