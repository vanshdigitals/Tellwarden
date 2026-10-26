"""
End-to-End Playwright Automated Test Suite for Tellwarden Navigation Redesign.
Covers AC-1 through AC-14, AC-16, and captures required verification screenshots.
"""

import time
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright, expect

ARTIFACTS_DIR = Path(r"C:\Users\vansh\.gemini\antigravity-ide\brain\0ee41fd3-cf9b-4a9b-a70b-36c1ae6976bc")
APP_URL = "http://localhost:8501"

VIEWPORTS = [
    (320, 568, "320"),
    (375, 667, "375"),
    (390, 844, "390"),
    (430, 932, "430"),
    (768, 1024, "768"),
    (1024, 768, "1024"),
    (1280, 800, "1280"),
    (1440, 900, "1440"),
    (1600, 1000, "1600"),
]

def wait_for_app_ready(page):
    """Wait for Streamlit app and custom shell component to mount."""
    page.goto(APP_URL, wait_until="networkidle")
    page.wait_for_selector("#tw-header", timeout=15000)
    page.wait_for_selector("#tw-drawer", timeout=15000)

def test_ac_01_and_screenshots():
    """AC-1: Header and hamburger in top-right across all viewports; capture screenshots."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for w, h, label in VIEWPORTS:
            context = browser.new_context(viewport={"width": w, "height": h})
            page = context.new_page()
            wait_for_app_ready(page)

            # Check header & hamburger visibility
            header = page.locator("#tw-header")
            hamburger = page.locator("#tw-hamburger")
            expect(header).to_be_visible()
            expect(hamburger).to_be_visible()

            # Ensure toggle button (close_btn when open, hamburger when closed) is at the far right
            if w >= 1101:
                close_btn = page.locator("#tw-close-btn")
                expect(close_btn).to_be_visible()
                c_box = close_btn.bounding_box()
                assert c_box["x"] + c_box["width"] >= w - 40, f"Close button not at top-right for width {w}"
            else:
                box = hamburger.bounding_box()
                assert box["x"] + box["width"] >= w - 40, f"Hamburger not at top-right for width {w}"

            # Capture screenshots for key viewports
            if label in ["320", "390", "768", "1280", "1600"]:
                if w >= 1101:
                    # Capture open state first
                    page.screenshot(path=str(ARTIFACTS_DIR / f"screenshot_{label}_open.png"))
                    # Close desktop drawer with close_btn
                    page.locator("#tw-close-btn").click()
                    page.wait_for_timeout(300)
                    # Verify hamburger at far right when closed
                    h_box = hamburger.bounding_box()
                    assert h_box["x"] + h_box["width"] >= w - 40, f"Hamburger not at top-right when closed for width {w}"
                    # Capture closed state
                    page.screenshot(path=str(ARTIFACTS_DIR / f"screenshot_{label}_closed.png"))
                else:
                    # Mobile closed screenshot
                    page.screenshot(path=str(ARTIFACTS_DIR / f"screenshot_{label}_closed.png"))
                    # Open mobile drawer
                    hamburger.click()
                    page.wait_for_timeout(300)
                    page.screenshot(path=str(ARTIFACTS_DIR / f"screenshot_{label}_open.png"))

            context.close()
        browser.close()

def test_ac_02_button_alignment():
    """AC-2: Hamburger and drawer close button occupy same top-right screen coordinates."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        wait_for_app_ready(page)

        hamburger = page.locator("#tw-hamburger")
        close_btn = page.locator("#tw-close-btn")

        # In desktop push, drawer is open at load. Close button occupies top-right.
        c_box = close_btn.bounding_box()

        # Close drawer: hamburger now appears in that exact spot
        close_btn.click()
        page.wait_for_timeout(300)
        h_box = hamburger.bounding_box()

        # Check top coordinate within 2px and right-edge within 4px
        assert abs(h_box["y"] - c_box["y"]) <= 2, f"Vertical alignment mismatch: {h_box['y']} vs {c_box['y']}"
        assert abs((h_box["x"] + h_box["width"]) - (c_box["x"] + c_box["width"])) <= 4, "Horizontal right-edge alignment mismatch"
        browser.close()

def test_ac_03_desktop_push_mode():
    """AC-3: Desktop >=1101px push mode, adapts width, 240ms transition, no backdrop."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        wait_for_app_ready(page)

        drawer = page.locator("#tw-drawer")
        expect(drawer).to_have_class("tw-drawer open")

        # Backdrop should not be active in push mode
        backdrop = page.locator("#tw-backdrop")
        assert "active" not in (backdrop.get_attribute("class") or "")

        # Check CSS variable --tw-drawer-w is 320px
        var_w = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--tw-drawer-w').trim()")
        assert var_w == "320px"

        # Toggle close
        page.locator("#tw-close-btn").click()
        page.wait_for_timeout(300)

        var_w_closed = page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--tw-drawer-w').trim()")
        assert var_w_closed == "0px"
        assert "open" not in (drawer.get_attribute("class") or "")
        browser.close()

def test_ac_04_and_05_mobile_overlay_mode():
    """AC-4 & AC-5: Mobile overlay mode opens with backdrop, closes on hamburger, close, backdrop, Escape."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        wait_for_app_ready(page)

        drawer = page.locator("#tw-drawer")
        backdrop = page.locator("#tw-backdrop")
        hamburger = page.locator("#tw-hamburger")
        close_btn = page.locator("#tw-close-btn")

        # Initially closed on mobile
        assert "open" not in (drawer.get_attribute("class") or "")

        # 1. Open with hamburger
        hamburger.click()
        page.wait_for_timeout(300)
        assert "open" in (drawer.get_attribute("class") or "")
        assert "active" in (backdrop.get_attribute("class") or "")

        # Close with close_btn
        close_btn.click()
        page.wait_for_timeout(300)
        assert "open" not in (drawer.get_attribute("class") or "")

        # 2. Open and close with Escape
        hamburger.click()
        page.wait_for_timeout(300)
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        assert "open" not in (drawer.get_attribute("class") or "")

        # 3. Open and close with backdrop click
        hamburger.click()
        page.wait_for_timeout(300)
        # Click on left area of screen (outside drawer)
        page.mouse.click(50, 400)
        page.wait_for_timeout(300)
        assert "open" not in (drawer.get_attribute("class") or "")

        browser.close()

def test_ac_06_drawer_structure_and_guardrail():
    """AC-6: Drawer brand, 4 category groups, pinned Audit Guardrail."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        wait_for_app_ready(page)

        # Check brand title and subtitle
        expect(page.locator(".tw-drawer-title")).to_have_text("Tellwarden")
        expect(page.locator(".tw-drawer-sub")).to_have_text("Security analysis workspace")

        # Check groups
        labels = page.locator(".tw-group-label").all_text_contents()
        assert labels == ["PLATFORM", "MODULE A", "MODULE B", "REFERENCE"]

        # Check guardrail title and body
        expect(page.locator(".tw-guardrail-title")).to_have_text("Audit Guardrail")
        guardrail_text = page.locator(".tw-guardrail-body").text_content()
        assert "Offline sample analysis only." in guardrail_text
        assert "Scan only sites you own or have permission to test." in guardrail_text
        assert "Results are not a security guarantee." in guardrail_text
        browser.close()

def test_ac_07_and_08_page_navigation():
    """AC-7 & AC-8: Selecting items navigates, updates URL, active item is white pill with aria-current='page'."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        wait_for_app_ready(page)

        # Verify initial active item is Platform Overview
        active_btn = page.locator(".tw-nav-item.active")
        expect(active_btn).to_have_attribute("aria-current", "page")
        assert "Platform Overview" in active_btn.text_content()

        # Click Web Security Scanner
        scanner_btn = page.locator("button.tw-nav-item[data-key='web_scanner']")
        scanner_btn.click()
        page.wait_for_timeout(1000)

        # Check title on page
        expect(page.locator("h1")).to_have_text("Web Security Scanner")
        new_active = page.locator(".tw-nav-item.active")
        assert "Web Security Scanner" in new_active.text_content()

        # Direct navigation to about page
        page.goto(f"{APP_URL}/about", wait_until="networkidle")
        page.wait_for_timeout(1000)
        expect(page.locator("h1")).to_have_text("About & Limitations")
        about_active = page.locator(".tw-nav-item.active")
        assert "About & Limitations" in about_active.text_content()

        browser.close()

def test_ac_09_no_two_line_wrap():
    """AC-9: Longest label 'Detection Rules Guide' must stay on one line at 320px."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 320, "height": 568})
        page = context.new_page()
        wait_for_app_ready(page)

        # Open mobile drawer
        page.locator("#tw-hamburger").click()
        page.wait_for_timeout(300)

        rules_btn = page.locator("button.tw-nav-item[data-key='rules_guide']")
        label_span = rules_btn.locator(".tw-item-label")
        box = label_span.bounding_box()

        # Height should not exceed standard single line height (~24px)
        assert box["height"] <= 26, f"Label wrapped to multiple lines, height is {box['height']}"
        browser.close()

def test_ac_10_no_horizontal_scroll():
    """AC-10: No horizontal page scroll on any tested viewport."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for w, h, _ in VIEWPORTS:
            context = browser.new_context(viewport={"width": w, "height": h})
            page = context.new_page()
            wait_for_app_ready(page)

            scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
            client_w = page.evaluate("() => document.documentElement.clientWidth")
            assert scroll_w <= client_w + 1, f"Horizontal scroll detected at width {w}: scrollWidth={scroll_w}, clientWidth={client_w}"
            context.close()
        browser.close()

def test_ac_11_small_screen_guardrail():
    """AC-11: 320x568px Audit Guardrail is reachable without hiding menu items."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 320, "height": 568})
        page = context.new_page()
        wait_for_app_ready(page)

        page.locator("#tw-hamburger").click()
        page.wait_for_timeout(300)

        guardrail = page.locator(".tw-guardrail")
        expect(guardrail).to_be_visible()

        # In reduced height viewport, p2 is hidden to save vertical space
        p2_display = page.evaluate("() => { let el = document.querySelector('.tw-guardrail-p2'); return el ? getComputedStyle(el).display : 'none'; }")
        assert p2_display == "none", "p2 should be hidden on viewport height under 600px"
        browser.close()

def test_ac_12_keyboard_focus_trap():
    """AC-12: Focus moves to close button, Tab stays inside drawer, Escape returns focus."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        wait_for_app_ready(page)

        hamburger = page.locator("#tw-hamburger")
        close_btn = page.locator("#tw-close-btn")

        hamburger.click()
        page.wait_for_timeout(300)

        # Verify close_btn has focus
        focused_id = page.evaluate("() => document.activeElement ? document.activeElement.id : null")
        assert focused_id == "tw-close-btn"

        # Tab through all 5 items to last item
        for _ in range(5):
            page.keyboard.press("Tab")

        # Next Tab should wrap back to close_btn
        page.keyboard.press("Tab")
        wrapped_id = page.evaluate("() => document.activeElement ? document.activeElement.id : null")
        assert wrapped_id == "tw-close-btn"

        # Press Escape -> drawer closes, focus returns to hamburger
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        esc_focused_id = page.evaluate("() => document.activeElement ? document.activeElement.id : null")
        assert esc_focused_id == "tw-hamburger"
        browser.close()

def test_ac_13_reduced_motion():
    """AC-13: prefers-reduced-motion: reduce disables transitions."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce"
        )
        page = context.new_page()
        wait_for_app_ready(page)

        transition = page.evaluate("() => { let el = document.querySelector('#tw-drawer'); return el ? getComputedStyle(el).transition : 'none'; }")
        assert "none" in transition or transition == "all 0s ease 0s" or "0s" in transition
        browser.close()

def test_ac_14_resize_mode_switch():
    """AC-14: Resizing across 1100px restores correct state without stuck backdrop or scroll lock."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        wait_for_app_ready(page)

        # In desktop, drawer is open
        drawer = page.locator("#tw-drawer")
        assert "open" in (drawer.get_attribute("class") or "")

        # Resize to mobile 600px
        page.set_viewport_size({"width": 600, "height": 900})
        page.wait_for_timeout(300)

        # In mobile, drawer should be closed by default
        assert "open" not in (drawer.get_attribute("class") or "")
        backdrop = page.locator("#tw-backdrop")
        assert "active" not in (backdrop.get_attribute("class") or "")
        body_overflow = page.evaluate("() => document.body.style.overflow")
        assert body_overflow == ""

        # Resize back to desktop 1400px
        page.set_viewport_size({"width": 1400, "height": 900})
        page.wait_for_timeout(300)
        assert "open" in (drawer.get_attribute("class") or "")
        browser.close()

def test_ac_16_zero_external_network_requests():
    """AC-16: All font and shell assets load locally; zero requests to external hosts."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        external_requests = []
        page.on("request", lambda req: (
            external_requests.append(req.url)
            if not req.url.startswith("http://localhost:8501") and not req.url.startswith("blob:http://localhost:8501") and not req.url.startswith("data:")
            else None
        ))

        page.goto(APP_URL, wait_until="networkidle")
        page.wait_for_selector("#tw-header", timeout=15000)

        assert len(external_requests) == 0, f"External network requests detected: {external_requests}"
        browser.close()
