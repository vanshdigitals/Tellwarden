import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Health } from '../api/types'

type State = { kind: 'checking' } | { kind: 'online'; health: Health } | { kind: 'offline'; message: string }

let shared: State = { kind: 'checking' }
const listeners = new Set<(s: State) => void>()
let timer: number | undefined

async function poll() {
  try {
    shared = { kind: 'online', health: await api.health() }
  } catch (e) {
    shared = { kind: 'offline', message: e instanceof Error ? e.message : 'Backend unreachable' }
  }
  listeners.forEach((l) => l(shared))
}

/** Live backend connectivity, polled every 30 s while mounted. */
// eslint-disable-next-line react-refresh/only-export-components
export function useBackendHealth(): State & { refresh: () => void } {
  const [state, setState] = useState(shared)
  useEffect(() => {
    listeners.add(setState)
    if (listeners.size === 1) {
      void poll()
      timer = window.setInterval(poll, 30000)
    }
    return () => {
      listeners.delete(setState)
      if (listeners.size === 0) window.clearInterval(timer)
    }
  }, [])
  return { ...state, refresh: () => void poll() }
}

export function BackendStatus({ compact }: { compact?: boolean }) {
  const s = useBackendHealth()
  const dot = s.kind === 'online' ? 'bg-pass' : s.kind === 'offline' ? 'bg-fail' : 'bg-slate-400'
  const label = s.kind === 'online' ? 'Backend online' : s.kind === 'offline' ? 'Backend offline' : 'Checking backend'
  return (
    <span className="flex items-center gap-2 rounded-full border border-line bg-white px-2.5 py-1 text-sm font-medium text-navy" role="status" title={s.kind === 'offline' ? s.message : undefined}>
      <span className={`size-2.5 rounded-full ${dot}`} aria-hidden />
      <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
      {compact && <span className="sr-only sm:hidden">{label}</span>}
    </span>
  )
}
