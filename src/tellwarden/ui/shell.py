"""
Tellwarden Shell Component
Renders top sticky header, right-side drawer (Option B), and handles navigation events.
"""

from pathlib import Path
import streamlit as st
from tellwarden.ui.nav import (
    NAV_ITEMS,
    NAV_MAP,
    NAV_GROUPS,
    get_items_by_group,
    find_item_by_title,
    find_item_by_key,
    NavItem
)

STYLES_DIR = Path(__file__).parent / "styles"

def _load_asset(filename: str) -> str:
    path = STYLES_DIR / filename
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""

_SHELL_COMPONENT = None

def _get_shell_component():
    css = _load_asset("shell.css")
    js = _load_asset("shell.js")
    return st.components.v2.component(
        "tw_shell",
        css=css,
        js=js,
        isolate_styles=False,
    )

def render_shell(current_page: st.Page) -> None:
    """
    Mount the responsive header and right-side drawer component.
    Interprets client navigation triggers and routes with st.switch_page.
    """
    # Identify active navigation item
    active_item = find_item_by_title(current_page.title)

    shell_comp = _get_shell_component()
    
    # Navigation payload: structured dictionary rendered with textContent on client
    nav_payload = {
        "active_key": active_item.key,
        "active_title": active_item.label,
        "active_group": active_item.group,
        "groups": [
            {
                "name": group,
                "items": [
                    {
                        "key": item.key,
                        "label": item.label,
                        "icon_svg": item.icon_svg,
                    }
                    for item in get_items_by_group(group)
                ]
            }
            for group in NAV_GROUPS
        ]
    }

    result = shell_comp(
        key="tw_shell_instance",
        data=nav_payload,
        default={"navigate": None},
        on_navigate_change=lambda: None
    )

    # Intercept client-side navigation trigger from result or session_state
    comp_state = st.session_state.get("tw_shell_instance")
    nav_val = None
    if isinstance(result, dict) and result.get("navigate"):
        nav_val = result.get("navigate")
    elif isinstance(comp_state, dict) and comp_state.get("navigate"):
        nav_val = comp_state.get("navigate")
    elif result is not None and getattr(result, "navigate", None):
        nav_val = getattr(result, "navigate")

    if nav_val:
        target_key = str(nav_val).strip()
        if target_key in NAV_MAP and target_key != active_item.key:
            target_page = NAV_MAP[target_key].page
            st.switch_page(target_page)
