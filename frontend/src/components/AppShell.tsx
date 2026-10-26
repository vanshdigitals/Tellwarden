import { BookOpen, Globe, Info, LayoutGrid, Menu, ShieldAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { BackendStatus } from './BackendStatus'

const NAV = [
  { group: 'Platform', items: [{ to: '/', label: 'Platform Overview', Icon: LayoutGrid }] },
  { group: 'Module A', items: [{ to: '/web-scanner', label: 'Web Security Scanner', Icon: Globe }] },
  { group: 'Module B', items: [{ to: '/ids-simulator', label: 'Offline IDS Simulator', Icon: ShieldAlert }] },
  {
    group: 'Reference',
    items: [
      { to: '/rules-guide', label: 'Detection Rules Guide', Icon: BookOpen },
      { to: '/about', label: 'About & Limitations', Icon: Info },
    ],
  },
]

// D-18 / DESIGN_SYSTEM.md section 8: push mode on desktop (>= 1101px), overlay drawer below.
const DESKTOP_QUERY = '(min-width: 1101px)'
const DRAWER_WIDTH = 320
const PREF_KEY = 'tellwarden.drawerOpen'

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
  )
}

function readDesktopPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'false'
  } catch {
    return true
  }
}

function writeDesktopPref(open: boolean) {
  try {
    localStorage.setItem(PREF_KEY, String(open))
  } catch {
    // storage unavailable: preference is simply not remembered
  }
}

/** Original shield-outline mark (O-5). */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <path d="M14 3 5 6.5v6.8c0 5.6 3.8 10 9 11.7 5.2-1.7 9-6.1 9-11.7V6.5L14 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m10 14 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AppShell() {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches && readDesktopPref())
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(open)
  const { pathname } = useLocation()
  const overlay = open && !isDesktop
  const pushed = open && isDesktop

  const current = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find((i) => i.to === pathname)

  function setDrawer(next: boolean) {
    setOpen(next)
    if (window.matchMedia(DESKTOP_QUERY).matches) writeDesktopPref(next)
  }

  // The hamburger is covered while the drawer is open, so focus moves to the drawer's close button and back.
  useEffect(() => {
    if (wasOpen.current && !open) toggleRef.current?.focus()
    if (!wasOpen.current && open) closeRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Escape closes; Tab is trapped inside the overlay drawer; background scroll is locked.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false)
      } else if (e.key === 'Tab' && overlay && drawerRef.current) {
        const items = [...drawerRef.current.querySelectorAll<HTMLElement>('a, button')]
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    if (overlay) {
      document.body.style.overflow = 'hidden'
      closeRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, overlay])

  const reserve = pushed ? { paddingRight: `calc(${DRAWER_WIDTH}px + 1.5rem)` } : undefined

  return (
    <div className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-line bg-white min-[1101px]:h-16">
        <div className="flex h-full items-center gap-4 pr-16 pl-4 transition-[padding] duration-[240ms] motion-reduce:transition-none sm:pl-6" style={reserve}>
          <NavLink to="/" className="flex shrink-0 items-center gap-2 rounded-[10px] text-navy" aria-label="Tellwarden home">
            <BrandMark className="size-7" />
            <span className="text-lg font-semibold">Tellwarden</span>
          </NavLink>
          {current && (
            <p className="hidden min-w-0 truncate text-sm text-slate-ink md:block">
              <span className="uppercase">{current.group}</span> <span aria-hidden>/</span> {current.label}
            </p>
          )}
          <div className="ml-auto"><BackendStatus compact /></div>
        </div>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setDrawer(!open)}
          aria-expanded={open}
          aria-controls="app-drawer"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          className={`absolute top-1/2 right-4 -translate-y-1/2 rounded-[10px] p-2 text-navy hover:bg-paper sm:right-6 ${open ? 'invisible' : ''}`}
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </header>

      {overlay && <div className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.5)]" onClick={() => setDrawer(false)} aria-hidden />}

      <aside
        id="app-drawer"
        ref={drawerRef}
        aria-label="Navigation drawer"
        inert={!open}
        style={{ width: `min(${DRAWER_WIDTH}px, 88vw)` }}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-navy text-nav-text transition-transform duration-[240ms] ease-out motion-reduce:transition-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 pr-4 pl-5 sm:pr-6 min-[1101px]:h-16">
          <div className="flex items-center gap-2 text-white">
            <BrandMark className="size-7" />
            <div className="leading-tight">
              <p className="text-base font-semibold">Tellwarden</p>
              <p className="text-sm text-nav-label">Security analysis workspace</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation menu"
            className="rounded-[10px] p-2 text-white hover:bg-nav-hover focus-visible:outline-white"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ group, items }) => (
            <div key={group} className="mb-5">
              <p className="px-3 pb-2 text-sm font-semibold tracking-wider text-nav-label uppercase">{group}</p>
              <ul className="space-y-1">
                {items.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end
                      onClick={() => { if (!isDesktop) setDrawer(false) }}
                      className={({ isActive }) =>
                        `flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] whitespace-nowrap focus-visible:outline-white ${isActive ? 'bg-white font-semibold text-navy' : 'font-medium text-nav-text hover:bg-nav-hover'}`}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden /> {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="m-3 rounded-[14px] border border-white/24 bg-white/7 p-4 text-sm leading-relaxed text-nav-text">
          <p className="mb-1 font-semibold text-white">Audit Guardrail</p>
          Offline sample analysis only. Scan only sites you own or have permission to test. Results are not a security
          guarantee.
        </div>
      </aside>

      <main className="px-4 pt-20 pb-12 transition-[padding] duration-[240ms] motion-reduce:transition-none sm:px-6 min-[1101px]:pt-22" style={reserve}>
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
