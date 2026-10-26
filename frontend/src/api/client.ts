import type { Health, IdsRunResult, Rule, RuleOverrides, Sample, ScanResult } from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfter?: number

  constructor(message: string, code: string, status: number, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: BodyInit
  json?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(opts.timeoutMs ?? 15000)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
  const headers: Record<string, string> = {}
  let body = opts.body
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method: opts.method ?? 'GET', headers, body, signal })
  } catch {
    if (opts.signal?.aborted) throw new ApiError('Request was cancelled.', 'cancelled', 0)
    if (timeout.aborted) throw new ApiError('The backend did not respond in time.', 'timeout', 0)
    throw new ApiError(`Cannot reach the Tellwarden backend at ${API_BASE_URL}. Is it running?`, 'network', 0)
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON body handled below
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; retry_after?: number } } | null)?.error
    throw new ApiError(e?.message ?? `Request failed (HTTP ${res.status}).`, e?.code ?? 'http_error', res.status,
      e?.retry_after)
  }
  if (data === null) throw new ApiError('The backend returned an unreadable response.', 'bad_response', res.status)
  return data as T
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>('/api/health', { signal, timeoutMs: 5000 }),
  rules: (signal?: AbortSignal) => request<{ rules: Rule[] }>('/api/rules', { signal }).then((r) => r.rules),
  samples: (signal?: AbortSignal) =>
    request<{ samples: Sample[] }>('/api/ids/samples', { signal }).then((r) => r.samples),
  // Server-side scan deadline is 20-60 s; allow headroom.
  scan: (url: string, signal?: AbortSignal) =>
    request<ScanResult>('/api/scan', { method: 'POST', json: { url, authorized: true }, signal, timeoutMs: 75000 }),
  runIds: (input: { sample: string } | { file: File }, overrides: RuleOverrides, signal?: AbortSignal) => {
    const form = new FormData()
    if ('sample' in input) form.append('sample', input.sample)
    else form.append('file', input.file)
    if (Object.keys(overrides).length) form.append('overrides', JSON.stringify(overrides))
    return request<IdsRunResult>('/api/ids/run', { method: 'POST', body: form, signal, timeoutMs: 60000 })
  },
}
