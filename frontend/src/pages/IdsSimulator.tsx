import { ChevronDown, Download, Play, RotateCcw, Square, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { Finding, IdsRunResult, Rule, RuleOverrides } from '../api/types'
import { useBackendHealth } from '../components/BackendStatus'
import { Alert, Button, Card, CardTitle, EmptyState, FieldError, Loading, Mono, PageHeader, ScopeBanner, SeverityBadge } from '../components/ui'
import { downloadFile, findingsToCsv, safeName, stamp } from '../lib/export'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

const TUNABLE_LABEL: Record<string, string> = {
  threshold: 'Threshold', window_seconds: 'Window (s)', max_per_distinct: 'Max per user', start_hour: 'Start hour', end_hour: 'End hour',
}

export function IdsSimulator() {
  const { addRun } = useSession()
  const health = useBackendHealth()
  const samples = useApi(api.samples)
  const rules = useApi(api.rules)
  const [mode, setMode] = useState<'sample' | 'upload'>('sample')
  const [sample, setSample] = useState('brute_force')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<RuleOverrides>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [result, setResult] = useState<IdsRunResult | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  useEffect(() => () => ctrl.current?.abort(), [])

  const maxMb = health.kind === 'online' ? health.health.limits.max_upload_mb : 5

  function pickFile(f: File | null) {
    setFile(null)
    setFileError(null)
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) return setFileError('Choose a .csv file.')
    if (f.size > maxMb * 1024 * 1024) return setFileError(`File is larger than ${maxMb} MB.`)
    if (f.size === 0) return setFileError('File is empty.')
    setFile(f)
  }

  async function run() {
    if (mode === 'upload' && !file) return setFileError('Choose a CSV file to analyse.')
    setError(null)
    setRunning(true)
    ctrl.current = new AbortController()
    try {
      const r = await api.runIds(mode === 'sample' ? { sample } : { file: file! }, overrides, ctrl.current.signal)
      setResult(r)
      addRun(r)
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(String(err), 'unknown', 0)
      if (e.code !== 'cancelled') setError(e)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Module B" title="Offline IDS Simulator"
        description="Offline simulation of event logs. Rule-based detection runs over a bundled sample or your own CSV. This is not live packet capture or real-time network monitoring." />
      <ScopeBanner>
        Offline simulation of sample data. Thresholds are illustrative teaching defaults, and findings are pattern matches that may include false positives.
      </ScopeBanner>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>1. Choose input</CardTitle>
          <div role="radiogroup" aria-label="Input source" className="mb-4 inline-flex rounded-[10px] bg-slate-100 p-1 text-sm">
            {(['sample', 'upload'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 font-medium ${mode === m ? 'bg-white text-navy' : 'text-slate-ink'}`}>
                {m === 'sample' ? 'Sample dataset' : 'Upload CSV'}
              </button>
            ))}
          </div>

          {mode === 'sample' && (
            samples.status === 'loading' ? <Loading label="Loading samples…" /> :
            samples.status === 'error' ? <Alert tone="error" title="Could not load samples">{samples.error.message}</Alert> :
            <fieldset className="space-y-2">
              <legend className="sr-only">Sample dataset</legend>
              {samples.data.map((s) => (
                <label key={s.id} className={`flex cursor-pointer gap-3 rounded-[10px] border p-3 text-sm ${sample === s.id ? 'border-teal bg-teal/5' : 'border-line'}`}>
                  <input type="radio" name="sample" className="mt-1 accent-teal" checked={sample === s.id} onChange={() => setSample(s.id)} />
                  <span>
                    <span className="font-medium text-navy">{s.name}</span> <span className="text-slate-ink">· {s.rows} events</span>
                    <span className="block text-slate-ink">{s.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {mode === 'upload' && (
            <div className="space-y-2 text-sm">
              <label htmlFor="csv-file" className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-line p-4 text-slate-ink hover:border-teal">
                <Upload className="size-5 text-teal" aria-hidden />
                <span>{file ? <Mono>{file.name}</Mono> : `Choose a CSV event log (max ${maxMb} MB)`}</span>
              </label>
              <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              {fileError && <FieldError>{fileError}</FieldError>}
              <p className="text-sm text-slate-ink">
                Required columns: <Mono>timestamp, event_type, src_ip</Mono>. Optional: <Mono>event_id, dst_ip, dst_port, protocol, username, service, status, user_agent, bytes</Mono>.
                Event types: <Mono>auth_success, auth_failure, conn, http_request</Mono>. The file is processed in memory and not stored.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>2. Tune rules (optional)</CardTitle>
            {Object.keys(overrides).length > 0 && (
              <Button variant="secondary" className="px-2 py-1" onClick={() => setOverrides({})}><RotateCcw className="size-4" aria-hidden /> Reset</Button>
            )}
          </div>
          {rules.status === 'loading' && <Loading label="Loading rules…" />}
          {rules.status === 'error' && <Alert tone="error" title="Could not load rules">{rules.error.message}</Alert>}
          {rules.status === 'success' && (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {rules.data.map((r) => <RuleTuner key={r.id} rule={r} value={overrides[r.id] ?? {}}
                onChange={(v) => setOverrides((o) => {
                  const next = { ...o }
                  if (Object.keys(v).length) next[r.id] = v
                  else delete next[r.id]
                  return next
                })} />)}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={run} loading={running} disabled={rules.status !== 'success'}>
          <Play className="size-4" aria-hidden /> {running ? 'Analysing…' : 'Run detection'}
        </Button>
        {running && <Button variant="secondary" onClick={() => ctrl.current?.abort()}><Square className="size-4" aria-hidden /> Cancel</Button>}
      </div>
      {error && <div className="mt-3"><Alert tone="error" title="Run failed">{error.message}</Alert></div>}

      <div className="mt-4">
        {result ? <RunReport result={result} /> : !running && <EmptyState title="No IDS run yet">Pick an input and run detection.</EmptyState>}
      </div>
    </>
  )
}

function RuleTuner({ rule, value, onChange }: { rule: Rule; value: Record<string, number | boolean>; onChange: (v: Record<string, number | boolean>) => void }) {
  const enabled = (value.enabled as boolean | undefined) ?? rule.enabled
  const set = (key: string, v: number | boolean, def: number | boolean) => {
    const next = { ...value }
    if (v === def) delete next[key]
    else next[key] = v
    onChange(next)
  }
  return (
    <li className="rounded-[10px] border border-line p-3 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4 accent-teal" checked={enabled} onChange={(e) => set('enabled', e.target.checked, rule.enabled)} />
        <Mono>{rule.id}</Mono> <span className="font-medium text-navy">{rule.name}</span>
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        {Object.entries(rule.bounds).map(([key, [min, max]]) => {
          const def = rule[key as keyof Rule] as number
          const current = (value[key] as number | undefined) ?? def
          return (
            <label key={key} className="text-sm text-slate-ink">
              {TUNABLE_LABEL[key] ?? key}
              <input type="number" min={min} max={max} step={1} value={current} disabled={!enabled}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value))
                  if (Number.isFinite(n)) set(key, Math.min(max, Math.max(min, n)), def)
                }}
                className="mt-0.5 block w-24 rounded border border-line px-2 py-1 font-mono text-sm text-slate-900 disabled:bg-slate-100" />
              <span className="font-mono">{min}–{max}</span>
            </label>
          )
        })}
      </div>
    </li>
  )
}

function RunReport({ result }: { result: IdsRunResult }) {
  const base = `tellwarden-ids-${safeName(result.dataset_name.replace(/\.csv$/i, ''))}-${stamp(result.ran_at)}`
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>Run summary</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadFile(`${base}.json`, JSON.stringify(result, null, 2), 'application/json')}>
              <Download className="size-4" aria-hidden /> JSON
            </Button>
            <Button variant="secondary" disabled={!result.findings.length} onClick={() => downloadFile(`${base}.csv`, findingsToCsv(result.findings), 'text/csv')}>
              <Download className="size-4" aria-hidden /> CSV
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Dataset" value={<Mono>{result.dataset_name}</Mono>} />
          <Stat label="Events loaded" value={result.events_loaded} />
          <Stat label="Rows skipped" value={result.rows_skipped} />
          <Stat label="Findings" value={result.findings.length} />
        </dl>
        {result.notes.map((n) => <p key={n} className="mt-2 text-sm text-slate-ink">{n}</p>)}
        {result.rows_skipped > 0 && (
          <div className="mt-3">
            <Alert tone="warning" title={`${result.rows_skipped} row(s) skipped`}>
              <ul className="list-disc pl-5">
                {result.skipped_examples.map((s) => <li key={s.row}>Line {s.row}: {s.reason}</li>)}
              </ul>
              {result.rows_skipped > result.skipped_examples.length && <p className="mt-1">Showing the first {result.skipped_examples.length}.</p>}
            </Alert>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Findings</CardTitle>
        {result.findings.length === 0 ? (
          <EmptyState title="No rule matched">No enabled rule's condition was met by these events with the current thresholds.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">{result.findings.map((f) => <FindingRow key={f.finding_id} f={f} />)}</ul>
        )}
      </Card>

      <Alert tone="info" title="Limitations">
        <ul className="list-disc pl-5">{result.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      </Alert>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-[10px] bg-paper px-3 py-2"><dt className="text-slate-ink">{label}</dt><dd className="mt-0.5 text-lg font-semibold text-navy">{value}</dd></div>
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <li>
      <details className="group py-2">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-1">
          <SeverityBadge severity={f.severity} />
          <span className="text-sm font-medium text-slate-900">{f.rule_name}</span>
          <span className="font-mono text-sm text-slate-ink">{Object.values(f.entity).join(' · ')}</span>
          <span className="ml-auto text-sm text-slate-ink">{f.event_count} events</span>
          <ChevronDown className="size-4 text-slate-ink transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 rounded-[10px] bg-paper p-3 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="text-slate-ink">Finding</dt><dd><Mono>{f.finding_id}</Mono> · ATT&CK <Mono>{f.attack_technique}</Mono></dd>
          <dt className="text-slate-ink">Entity</dt><dd><Mono>{Object.entries(f.entity).map(([k, v]) => `${k}=${v}`).join(', ')}</Mono></dd>
          <dt className="text-slate-ink">Time range</dt><dd><Mono>{f.first_seen} → {f.last_seen}</Mono></dd>
          {f.threshold !== null && <><dt className="text-slate-ink">Rule condition</dt><dd>threshold <Mono>{f.threshold}</Mono>{f.window_seconds !== null && <> within <Mono>{f.window_seconds}s</Mono></>}</dd></>}
          <dt className="text-slate-ink">Explanation</dt><dd>{f.explanation}</dd>
          <dt className="text-slate-ink">Response</dt><dd>{f.recommended_response}</dd>
          <dt className="text-slate-ink">Evidence event IDs</dt>
          <dd className="flex flex-wrap gap-1">
            {f.evidence_event_ids.map((id) => <span key={id} className="rounded bg-white px-1.5 py-0.5 ring-1 ring-line"><Mono>{id}</Mono></span>)}
            {f.evidence_truncated && <span className="text-sm text-warn">(truncated at 500)</span>}
          </dd>
        </dl>
      </details>
    </li>
  )
}
