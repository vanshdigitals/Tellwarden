"""
Navigation Registry and Data Structure
Single source of truth for page registration, routing, and responsive drawer rendering.
"""

from dataclasses import dataclass
from typing import Callable, Dict, List
import streamlit as st

from tellwarden.ui.views import overview, web_scanner, ids_simulator, rules_guide, about

@dataclass(frozen=True)
class NavItem:
    key: str
    label: str
    group: str
    url_path: str
    icon_svg: str
    page: st.Page

# Common 20px line icon set (2px stroke, rounded caps, currentColor)
ICON_OVERVIEW = (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>'
    '<rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'
    '</svg>'
)

ICON_SCANNER = (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>'
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    '</svg>'
)

ICON_IDS = (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    '<line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    '</svg>'
)

ICON_RULES = (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
    '</svg>'
)

ICON_ABOUT = (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>'
    '<line x1="12" y1="8" x2="12.01" y2="8"/>'
    '</svg>'
)

BRAND_MARK_SVG = (
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B365D" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    '<path d="M9 12l2 2 4-4"/>'
    '</svg>'
)

BRAND_MARK_DRAWER_SVG = (
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    '<path d="M9 12l2 2 4-4"/>'
    '</svg>'
)

# Canonical Registry
NAV_ITEMS: List[NavItem] = [
    NavItem(
        key="overview",
        label="Platform Overview",
        group="PLATFORM",
        url_path="",
        icon_svg=ICON_OVERVIEW,
        page=st.Page(overview.render, title="Platform Overview", url_path="", default=True)
    ),
    NavItem(
        key="web_scanner",
        label="Web Security Scanner",
        group="MODULE A",
        url_path="web-scanner",
        icon_svg=ICON_SCANNER,
        page=st.Page(web_scanner.render, title="Web Security Scanner", url_path="web-scanner")
    ),
    NavItem(
        key="ids_simulator",
        label="Offline IDS Simulator",
        group="MODULE B",
        url_path="ids-simulator",
        icon_svg=ICON_IDS,
        page=st.Page(ids_simulator.render, title="Offline IDS Simulator", url_path="ids-simulator")
    ),
    NavItem(
        key="rules_guide",
        label="Detection Rules Guide",
        group="REFERENCE",
        url_path="rules-guide",
        icon_svg=ICON_RULES,
        page=st.Page(rules_guide.render, title="Detection Rules Guide", url_path="rules-guide")
    ),
    NavItem(
        key="about",
        label="About & Limitations",
        group="REFERENCE",
        url_path="about",
        icon_svg=ICON_ABOUT,
        page=st.Page(about.render, title="About & Limitations", url_path="about")
    ),
]

NAV_MAP: Dict[str, NavItem] = {item.key: item for item in NAV_ITEMS}

NAV_GROUPS: List[str] = ["PLATFORM", "MODULE A", "MODULE B", "REFERENCE"]

def get_pages() -> List[st.Page]:
    """Return all st.Page objects for st.navigation registration."""
    return [item.page for item in NAV_ITEMS]

def get_items_by_group(group: str) -> List[NavItem]:
    """Filter navigation items by category group."""
    return [item for item in NAV_ITEMS if item.group == group]

def find_item_by_title(title: str) -> NavItem:
    """Find NavItem matching active page title or label."""
    for item in NAV_ITEMS:
        # Check label first, then safe check on page title if initialized
        if item.label == title:
            return item
        try:
            if hasattr(item.page, "_title") and item.page._title == title:
                return item
        except Exception:
            pass
    return NAV_ITEMS[0]

def find_item_by_key(key: str) -> NavItem:
    """Find NavItem by stable key with fallback to overview."""
    return NAV_MAP.get(key, NAV_ITEMS[0])
