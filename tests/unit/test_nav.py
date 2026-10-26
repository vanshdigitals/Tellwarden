"""
TC-NAV-01: Unit tests for navigation registry and data structure.
Verifies single source of truth for routing, grouping, keys, and page registration.
"""

import pytest
from tellwarden.ui.nav import (
    NAV_ITEMS,
    NAV_MAP,
    NAV_GROUPS,
    get_pages,
    get_items_by_group,
    find_item_by_key,
    find_item_by_title,
)

def test_nav_items_count_and_uniqueness():
    """Verify exactly 5 pages with unique keys and url_paths."""
    assert len(NAV_ITEMS) == 5
    keys = [item.key for item in NAV_ITEMS]
    assert len(keys) == len(set(keys)), "Duplicate keys found in navigation registry"

    expected_keys = {"overview", "web_scanner", "ids_simulator", "rules_guide", "about"}
    assert set(keys) == expected_keys

def test_nav_groups_structure():
    """Verify pages map to exact uppercase category groups."""
    groups = {item.group for item in NAV_ITEMS}
    assert groups == {"PLATFORM", "MODULE A", "MODULE B", "REFERENCE"}
    assert NAV_GROUPS == ["PLATFORM", "MODULE A", "MODULE B", "REFERENCE"]

    platform_items = get_items_by_group("PLATFORM")
    assert len(platform_items) == 1
    assert platform_items[0].key == "overview"
    assert platform_items[0].label == "Platform Overview"

    mod_a_items = get_items_by_group("MODULE A")
    assert len(mod_a_items) == 1
    assert mod_a_items[0].key == "web_scanner"
    assert mod_a_items[0].label == "Web Security Scanner"

    mod_b_items = get_items_by_group("MODULE B")
    assert len(mod_b_items) == 1
    assert mod_b_items[0].key == "ids_simulator"
    assert mod_b_items[0].label == "Offline IDS Simulator"

    ref_items = get_items_by_group("REFERENCE")
    assert len(ref_items) == 2
    assert [i.key for i in ref_items] == ["rules_guide", "about"]
    assert [i.label for i in ref_items] == ["Detection Rules Guide", "About & Limitations"]

def test_nav_icons_and_svg_integrity():
    """Verify each navigation item has an inline SVG icon (no emoji)."""
    for item in NAV_ITEMS:
        assert item.icon_svg.startswith("<svg"), f"Item {item.key} icon must be inline SVG"
        assert 'stroke="currentColor"' in item.icon_svg
        assert 'stroke-width="2"' in item.icon_svg
        assert not any(ord(c) > 127 for c in item.icon_svg), f"No non-ASCII or emoji in icon of {item.key}"

def test_nav_page_mapping():
    """Verify each item maps to a valid st.Page object with url_path."""
    pages = get_pages()
    assert len(pages) == 5

    overview_item = find_item_by_key("overview")
    assert overview_item.url_path == ""

    scanner_item = find_item_by_key("web_scanner")
    assert scanner_item.url_path == "web-scanner"

    ids_item = find_item_by_key("ids_simulator")
    assert ids_item.url_path == "ids-simulator"

    rules_item = find_item_by_key("rules_guide")
    assert rules_item.url_path == "rules-guide"

    about_item = find_item_by_key("about")
    assert about_item.url_path == "about"

def test_find_item_helpers():
    """Test lookup helpers by key and title."""
    assert find_item_by_key("unknown").key == "overview"
    assert find_item_by_title("Platform Overview").key == "overview"
    assert find_item_by_title("Web Security Scanner").key == "web_scanner"
    assert find_item_by_title("Nonexistent").key == "overview"
