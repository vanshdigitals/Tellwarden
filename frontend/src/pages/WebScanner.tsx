import { ChevronDown, Download, ExternalLink, Search, Square } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, api } from '../api/client'
import type { CheckResult, ScanResult } from '../api/types'
import { Alert, Button, Card, CardTitle, EmptyState, FieldError, Mono, PageHeader, ScopeBanner, StatusBadge } from '../components/ui'
import { downloadFile, safeName, stamp } from '../lib/export'
import { useSession } from '../lib/session'

/** Client-side pre-check for fast feedback. The backend re-validates everything. */
function precheck(raw: string): string | null {
  const v = raw.trim()
  if (!v) return 'Enter a URL to scan.'
  if (v.length > 2048) return 'URL is longer than 2048 characters.'
  if (/\s/.test(v)) return 'URL must not contain spaces.'
  const m = /^([a-z][a-z0-9+.-]*):\/\//i.exec(v)
  if (m && !['http', 'https'].includes(m[1].toLowerCase())) return 'Only http and https URLs are supported.'
  return null
}

const CATEGORY_LABEL = { https: 'HTTPS', header: 'Security headers', cors: 'CORS' } as const

export function WebScanner() {
  const { addScan } = useSession()
  const [url, setUrl] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => () => ctrl.current?.abort(), [])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = precheck(url)
    setInputError(problem)
    if (problem || !authorized) return
    setError(null)
    setRunning(true)
    ctrl.current = new AbortController()
    try {
      const r = await api.scan(url.trim(), ctrl.current.signal)
      setResult(r)
      addScan(r)
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(String(err), 'unknown', 0)
      if (apiErr.code !== 'cancelled') setError(apiErr)
      if (apiErr.retryAfter) setCooldown(apiErr.retryAfter)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Module A" title="Web Security Scanner"
        description="Passive configuration-hygiene checks of one public URL: HTTPS, security headers and basic CORS behaviour. No crawling, no exploitation, at most 10 requests." />
      <ScopeBanner>
        Scan only sites you own or have written permission to test. Results describe configuration hygiene at this moment and are not a security guarantee.
      </ScopeBanner>

      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="scan-url" className="block text-sm font-medium text-navy">Target URL</label>
            <input
              id="scan-url" type="text" inputMode="url" autoComplete="off" spellCheck={false}
              placeholder="https://your-site.example" value={url}
              onChange={(e) => { setUrl(e.target.value); setInputError(null) }}
              aria-invalid={!!inputError} aria-describedby={inputError ? 'scan-url-error' : 'scan-url-help'}
              className="mt-1 w-full rounded-[10px] border border-line px-3 py-2 font-mono text-sm"
            />
            {inputError ? <FieldError id="scan-url-error">{inputError}</FieldError> : (
              <p id="scan-url-help" className="mt-1 text-sm text-slate-ink">
                Ports 80 and 443 only. Private, loopback and cloud-metadata addresses are refused by the backend.
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" className="mt-0.5 size-4 accent-teal" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            I own this site or have written permission to test it.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={running} disabled={!authorized || cooldown > 0}>
              <Search className="size-4" aria-hidden /> {running ? 'Scanning, up to 20 seconds' : cooldown > 0 ? `Wait ${cooldown} s` : 'Run scan'}
            </Button>
            {!authorized && !running && <p className="self-center text-sm text-slate-ink">Tick the statement to enable Scan.</p>}
            {running && (
              <Button type="button" variant="secondary" onClick={() => ctrl.current?.abort()}>
                <Square className="size-4" aria-hidden /> Cancel
              </Button>
            )}
          </div>
          {error && <Alert tone="error" title={errorTitle(error)}>{error.message}</Alert>}
        </form>
      </Card>

      <div className="mt-4">
        {result ? <ScanReport result={result} /> : !running && (
          <EmptyState title="No scan results yet">Enter a URL you are authorised to test and run a scan.</EmptyState>
        )}
      </div>
    </>
  )
}

function errorTitle(e: ApiError) {
  return ({ blocked_target: 'Target refused', validation_error: 'Invalid URL', resolution_error: 'DNS lookup failed',
    target_unreachable: 'Target unreachable', cooldown: 'Please wait', network: 'Backend unreachable',
    timeout: 'Timed out' } as Record<string, string>)[e.code] ?? 'Scan failed'
}

function ScanReport({ result }: { result: ScanResult }) {
  const host = (() => { try { return new URL(result.final_url).hostname } catch { return 'target' } })()
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>Scan summary</CardTitle>
          <Button variant="secondary" onClick={() => downloadFile(
            `tellwarden-scan-${safeName(host)}-${stamp(result.finished_at)}.json`, JSON.stringify(result, null, 2), 'application/json')}>
            <Download className="size-4" aria-hidden /> Export JSON
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['pass', 'warning', 'fail', 'info'] as const).map((s) => (
            <div key={s} className="rounded-[10px] bg-paper px-3 py-2">
              <StatusBadge status={s} />
              <p className="mt-1 text-2xl font-semibold text-navy">{result.summary[s]}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-ink">Counts only: this is a configuration hygiene view, not a security grade.</p>
        {!result.complete && <div className="mt-3"><Alert tone="warning" title="Scan incomplete">{result.notes.join(' ')}</Alert></div>}
        {result.complete && result.notes.length > 0 && <div className="mt-3"><Alert tone="info">{result.notes.join(' ')}</Alert></div>}
        <dl className="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-slate-ink">Final URL</dt><dd><Mono>{result.final_url}</Mono></dd>
          <dt className="text-slate-ink">Resolved addresses</dt><dd><Mono>{result.resolved_addresses.join(', ')}</Mono></dd>
          <dt className="text-slate-ink">TLS</dt><dd>{result.tls.verified ? 'Verified' : result.tls.error ?? 'Not used'}</dd>
          <dt className="text-slate-ink">Requests sent</dt><dd><Mono>{result.request_count}</Mono></dd>
          <dt className="text-slate-ink">Finished</dt><dd><Mono>{result.finished_at}</Mono></dd>
          <dt className="text-slate-ink">Redirect chain</dt>
          <dd>
            <ol className="space-y-0.5">
              {result.redirect_chain.map((h) => (
                <li key={h.hop}><Mono>{h.status} {h.url}{h.location ? ` → ${h.location}` : ''}</Mono></li>
              ))}
            </ol>
          </dd>
        </dl>
      </Card>

      {(['https', 'header', 'cors'] as const).map((cat) => (
        <Card key={cat}>
          <CardTitle>{CATEGORY_LABEL[cat]}</CardTitle>
          <ul className="divide-y divide-line">
            {result.checks.filter((c) => c.category === cat).map((c) => <CheckRow key={c.check_id + c.observed} check={c} />)}
          </ul>
        </Card>
      ))}

      <Alert tone="info" title="Limitations">
        <ul className="list-disc pl-5">{result.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      </Alert>
    </div>
  )
}

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li>
      <details className="group py-2">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded py-1">
          <StatusBadge status={check.status} />
          <span className="flex-1 text-sm font-medium text-slate-900">{check.title}</span>
          <span className="hidden font-mono text-sm text-slate-ink sm:inline">{check.check_id}</span>
          <ChevronDown className="size-4 text-slate-ink transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 rounded-[10px] bg-paper p-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-ink">Observed</dt><dd><Mono>{check.observed}</Mono></dd>
          <dt className="text-slate-ink">Expected</dt><dd><Mono>{check.expected}</Mono></dd>
          <dt className="text-slate-ink">Why it matters</dt><dd>{check.explanation}</dd>
          <dt className="text-slate-ink">Remediation</dt><dd>{check.remediation}</dd>
          <dt className="text-slate-ink">Reference</dt>
          <dd>
            <a href={check.reference_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal hover:underline">
              OWASP guidance <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </dd>
        </dl>
      </details>
    </li>
  )
}
