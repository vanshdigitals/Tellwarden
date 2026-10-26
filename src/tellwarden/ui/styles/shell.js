/**
 * Tellwarden Shell Component Client Script
 * Renders header, right-side drawer, focus trap, and handles responsive layout.
 * Strictly renders text with textContent (never innerHTML with variable data).
 */

export default function(component) {
    const { data, setTriggerValue, setStateValue, parentElement } = component;
    if (!parentElement || !data) return;

    // Use or create a shell root container so styles in parentElement are never wiped
    let shellRoot = parentElement.querySelector(".tw-shell-root");
    if (!shellRoot) {
        shellRoot = document.createElement("div");
        shellRoot.className = "tw-shell-root";
        parentElement.appendChild(shellRoot);
    } else {
        shellRoot.innerHTML = "";
    }

    const activeKey = data.active_key || "overview";
    const activeTitle = data.active_title || "Platform Overview";
    const activeGroup = data.active_group || "PLATFORM";

    // 1. Skip Link
    const skipLink = document.createElement("a");
    skipLink.href = "#main-content";
    skipLink.className = "tw-skip-link";
    skipLink.id = "tw-skip-link";
    skipLink.textContent = "Skip to main content";
    shellRoot.appendChild(skipLink);

    // 2. Header
    const header = document.createElement("header");
    header.className = "tw-header";
    header.id = "tw-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "tw-header-left";

    // Compact Brand
    const compactBrand = document.createElement("div");
    compactBrand.className = "tw-compact-brand";
    compactBrand.id = "tw-compact-brand";
    
    // Shield icon SVG (constant trusted string)
    compactBrand.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B365D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;
    const brandText = document.createElement("span");
    brandText.className = "tw-brand-text";
    brandText.textContent = "Tellwarden";
    compactBrand.appendChild(brandText);
    headerLeft.appendChild(compactBrand);

    // Breadcrumb
    const breadcrumb = document.createElement("nav");
    breadcrumb.className = "tw-breadcrumb";
    breadcrumb.id = "tw-breadcrumb";
    breadcrumb.setAttribute("aria-label", "Breadcrumb");

    const bcGroup = document.createElement("span");
    bcGroup.className = "tw-bc-group";
    bcGroup.textContent = activeGroup;

    const bcSep = document.createElement("span");
    bcSep.className = "tw-bc-sep";
    bcSep.textContent = "/";

    const bcTitle = document.createElement("span");
    bcTitle.className = "tw-bc-title";
    bcTitle.textContent = activeTitle;

    breadcrumb.appendChild(bcGroup);
    breadcrumb.appendChild(bcSep);
    breadcrumb.appendChild(bcTitle);
    headerLeft.appendChild(breadcrumb);
    header.appendChild(headerLeft);

    // Hamburger Button
    const hamburger = document.createElement("button");
    hamburger.className = "tw-hamburger";
    hamburger.id = "tw-hamburger";
    hamburger.setAttribute("aria-label", "Open navigation menu");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-controls", "tw-drawer");
    hamburger.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B365D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    header.appendChild(hamburger);
    shellRoot.appendChild(header);

    // 3. Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "tw-backdrop";
    backdrop.id = "tw-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    shellRoot.appendChild(backdrop);

    // 4. Drawer
    const drawer = document.createElement("aside");
    drawer.className = "tw-drawer";
    drawer.id = "tw-drawer";
    drawer.setAttribute("aria-label", "Navigation");

    // Drawer Header
    const drawerHeader = document.createElement("div");
    drawerHeader.className = "tw-drawer-header";

    const drawerBrand = document.createElement("div");
    drawerBrand.className = "tw-drawer-brand";
    drawerBrand.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;

    const brandTitles = document.createElement("div");
    const drawerTitle = document.createElement("div");
    drawerTitle.className = "tw-drawer-title";
    drawerTitle.textContent = "Tellwarden";

    const drawerSub = document.createElement("div");
    drawerSub.className = "tw-drawer-sub";
    drawerSub.textContent = "Security analysis workspace";

    brandTitles.appendChild(drawerTitle);
    brandTitles.appendChild(drawerSub);
    drawerBrand.appendChild(brandTitles);
    drawerHeader.appendChild(drawerBrand);

    const closeBtn = document.createElement("button");
    closeBtn.className = "tw-close-btn";
    closeBtn.id = "tw-close-btn";
    closeBtn.setAttribute("aria-label", "Close navigation menu");
    closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    drawerHeader.appendChild(closeBtn);
    drawer.appendChild(drawerHeader);

    // Scrollable Nav Area
    const nav = document.createElement("nav");
    nav.className = "tw-nav";
    nav.id = "tw-nav";
    nav.setAttribute("aria-label", "Main");

    (data.groups || []).forEach((group, gIdx) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "tw-group";

        const groupLabel = document.createElement("p");
        groupLabel.className = "tw-group-label";
        const groupLabelId = `tw-group-${gIdx}`;
        groupLabel.id = groupLabelId;
        groupLabel.textContent = group.name;
        groupDiv.appendChild(groupLabel);

        const groupList = document.createElement("ul");
        groupList.className = "tw-group-list";
        groupList.setAttribute("role", "list");
        groupList.setAttribute("aria-labelledby", groupLabelId);

        (group.items || []).forEach((item) => {
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.className = "tw-nav-item";
            btn.setAttribute("data-key", item.key);

            if (item.key === activeKey) {
                btn.classList.add("active");
                btn.setAttribute("aria-current", "page");
            }

            // Safe icon SVG from nav.py constant
            btn.innerHTML = item.icon_svg;

            const labelSpan = document.createElement("span");
            labelSpan.className = "tw-item-label";
            labelSpan.textContent = item.label;
            btn.appendChild(labelSpan);

            li.appendChild(btn);
            groupList.appendChild(li);
        });

        groupDiv.appendChild(groupList);
        nav.appendChild(groupDiv);
    });

    drawer.appendChild(nav);

    // Guardrail Footer
    const guardrail = document.createElement("div");
    guardrail.className = "tw-guardrail";

    const guardrailHead = document.createElement("div");
    guardrailHead.className = "tw-guardrail-head";
    guardrailHead.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

    const guardrailTitle = document.createElement("span");
    guardrailTitle.className = "tw-guardrail-title";
    guardrailTitle.textContent = "Audit Guardrail";
    guardrailHead.appendChild(guardrailTitle);
    guardrail.appendChild(guardrailHead);

    const guardrailBody = document.createElement("p");
    guardrailBody.className = "tw-guardrail-body";

    const gp1 = document.createElement("span");
    gp1.className = "tw-guardrail-p1";
    gp1.textContent = "Offline sample analysis only. ";

    const gp2 = document.createElement("span");
    gp2.className = "tw-guardrail-p2";
    gp2.textContent = "Scan only sites you own or have permission to test. Results are not a security guarantee.";

    guardrailBody.appendChild(gp1);
    guardrailBody.appendChild(gp2);
    guardrail.appendChild(guardrailBody);
    drawer.appendChild(guardrail);

    shellRoot.appendChild(drawer);

    // Anchor target for skip link
    const anchor = document.createElement("div");
    anchor.id = "main-content";
    anchor.tabIndex = -1;
    shellRoot.appendChild(anchor);

    // ----------------------------------------------------------------------
    // State & Responsiveness Logic
    // ----------------------------------------------------------------------
    const mql = window.matchMedia("(min-width: 1101px)");
    let mobileOpen = false;

    function isDesktop() {
        return mql.matches;
    }

    function isDesktopOpen() {
        const stored = sessionStorage.getItem("tw_nav_desktop_open");
        return stored === null || stored === "true";
    }

    function setDesktopOpen(open) {
        sessionStorage.setItem("tw_nav_desktop_open", open ? "true" : "false");
        applyState();
    }

    function applyState() {
        const desktop = isDesktop();
        if (desktop) {
            // Push mode
            const open = isDesktopOpen();
            drawer.classList.toggle("open", open);
            backdrop.classList.remove("active");
            document.body.style.overflow = "";

            if (open) {
                document.documentElement.style.setProperty("--tw-drawer-w", "320px");
                compactBrand.classList.add("hidden-desktop");
                hamburger.setAttribute("aria-expanded", "true");
                hamburger.setAttribute("aria-label", "Close navigation menu");
                drawer.removeAttribute("inert");
                drawer.removeAttribute("aria-hidden");
            } else {
                document.documentElement.style.setProperty("--tw-drawer-w", "0px");
                compactBrand.classList.remove("hidden-desktop");
                hamburger.setAttribute("aria-expanded", "false");
                hamburger.setAttribute("aria-label", "Open navigation menu");
                drawer.setAttribute("inert", "");
                drawer.setAttribute("aria-hidden", "true");
            }
        } else {
            // Overlay mode
            document.documentElement.style.setProperty("--tw-drawer-w", "0px");
            compactBrand.classList.remove("hidden-desktop");

            if (mobileOpen) {
                drawer.classList.add("open");
                backdrop.classList.add("active");
                document.body.style.overflow = "hidden";
                hamburger.setAttribute("aria-expanded", "true");
                hamburger.setAttribute("aria-label", "Close navigation menu");
                drawer.removeAttribute("inert");
                drawer.removeAttribute("aria-hidden");
                setTimeout(() => closeBtn.focus(), 50);
            } else {
                drawer.classList.remove("open");
                backdrop.classList.remove("active");
                document.body.style.overflow = "";
                hamburger.setAttribute("aria-expanded", "false");
                hamburger.setAttribute("aria-label", "Open navigation menu");
                drawer.setAttribute("inert", "");
                drawer.setAttribute("aria-hidden", "true");
            }
        }
    }

    function toggleMenu() {
        if (isDesktop()) {
            setDesktopOpen(!isDesktopOpen());
        } else {
            mobileOpen = !mobileOpen;
            applyState();
            if (!mobileOpen) {
                hamburger.focus();
            }
        }
    }

    function closeOverlay(returnFocus = true) {
        if (!isDesktop() && mobileOpen) {
            mobileOpen = false;
            applyState();
            if (returnFocus) {
                hamburger.focus();
            }
        }
    }

    // Attach Toggle Listeners
    hamburger.onclick = (e) => {
        e.preventDefault();
        toggleMenu();
    };

    closeBtn.onclick = (e) => {
        e.preventDefault();
        if (isDesktop()) {
            setDesktopOpen(false);
            hamburger.focus();
        } else {
            closeOverlay(true);
        }
    };

    backdrop.onclick = (e) => {
        e.preventDefault();
        closeOverlay(true);
    };

    // Keyboard handling: Escape & Focus Trap
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!isDesktop() && mobileOpen) {
                e.preventDefault();
                closeOverlay(true);
            }
        } else if (e.key === "Tab" && !isDesktop() && mobileOpen) {
            const focusables = drawer.querySelectorAll("button:not([disabled]), a[href]");
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Navigation Item Clicks
    const navButtons = drawer.querySelectorAll(".tw-nav-item");
    navButtons.forEach((btn) => {
        btn.onclick = (e) => {
            e.preventDefault();
            const key = btn.getAttribute("data-key");
            if (!key) return;

            if (!isDesktop()) {
                closeOverlay(false);
            }
            if (typeof setTriggerValue === "function") {
                setTriggerValue("navigate", key);
            }
            if (typeof setStateValue === "function") {
                setStateValue("navigate", key);
            }
        };
    });

    // Viewport Resize Listener
    mql.addEventListener("change", () => {
        mobileOpen = false;
        applyState();
    });

    // Initial state setup
    applyState();

    return () => {
        document.documentElement.style.removeProperty("--tw-drawer-w");
        document.body.style.overflow = "";
    };
}
