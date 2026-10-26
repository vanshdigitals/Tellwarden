import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T }

/** Load data on mount with cancellation on unmount; `reload` re-runs the request. */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    fetcher(ctrl.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        setState({ status: 'error', error: err instanceof ApiError ? err : new ApiError(String(err), 'unknown', 0) })
      })
    return () => ctrl.abort()
    // fetcher is expected to be a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
