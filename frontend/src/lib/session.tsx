import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { IdsRunResult, ScanResult } from '../api/types'

/** Results produced in this browser tab. Nothing is persisted (SEC-13). */
interface SessionResults {
  scans: ScanResult[]
  runs: IdsRunResult[]
  addScan: (r: ScanResult) => void
  addRun: (r: IdsRunResult) => void
}

const Ctx = createContext<SessionResults | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [scans, setScans] = useState<ScanResult[]>([])
  const [runs, setRuns] = useState<IdsRunResult[]>([])
  const value = useMemo(() => ({
    scans,
    runs,
    addScan: (r: ScanResult) => setScans((s) => [r, ...s].slice(0, 20)),
    addRun: (r: IdsRunResult) => setRuns((s) => [r, ...s].slice(0, 20)),
  }), [scans, runs])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
