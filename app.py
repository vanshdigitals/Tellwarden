"""
Tellwarden Application Entry Point
Educational cybersecurity workspace: Web Security Scanner & Offline IDS Simulator.
"""

from pathlib import Path
import streamlit as st
from tellwarden.ui.theme import apply_theme
from tellwarden.ui.nav import get_pages
from tellwarden.ui.shell import render_shell

# 1. Page Configuration (first Streamlit command, clean PNG favicon, no emoji)
FAVICON_PATH = Path(__file__).parent / "static" / "favicon.png"
st.set_page_config(
    page_title="Tellwarden",
    page_icon=str(FAVICON_PATH) if FAVICON_PATH.exists() else None,
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 2. Navigation Routing (position="hidden" replaces native sidebar with custom drawer)
pages = get_pages()
current_page = st.navigation(pages, position="hidden")

# 3. Global Theme Injection
apply_theme()

# 4. Custom Responsive Shell (Top Header & Right-Side Drawer Component)
render_shell(current_page)

# 5. Run Active Page Content
current_page.run()
