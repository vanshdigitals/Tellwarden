import { ArrowRight, ChevronDown, Download, Globe, Info, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import type { CheckStatus, IdsRunResult } from '../api/types'
import { useBackendHealth } from '../components/BackendStatus'
import { Alert, Button, Card, EmptyState, Loading, Mono, SeverityBadge, StatusBadge } from '../components/ui'
import { downloadFile, stamp } from '../lib/export'
import { useSession } from '../lib/session'
import { useApi } from '../lib/useApi'

// The overview's sample statistics come from running the real rule engine over the bundled synthetic datasets.
let sampleCache: Promise<IdsRunResult[]> | null = null
function loadSampleRuns(): Promise<IdsRunResult[]> {
  sampleCache ??= api.samples()
    .then((samples) => Promise.all(samples.map((s) => api.runIds({ sample: s.id }, {}))))
    .catch((err) => {
      sampleCache = null
      throw err
    })
  return sampleCache
}

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
const RANK: Record<string, number> = { Critical: 0, High: 1, fail: 2, Medium: 3, warning: 4, Low: 5 }

interface Row {
  key: string
  source: 'IDS Simulator' | 'Web Scanner'
  name: string
  code: string
  status: CheckStatus | 'review'
  severity?: string
  time: string
  context: string
  explanation: string
  action: string
  to: string
}

const time = (iso: string) => iso.slice(11, 19)

export function Overview() {
  const health = useBackendHealth()
  const { scans } = useSession()
  const runs = useApi(() => loadSampleRuns())

  const rows = useMemo<Row[]>(() => {
    const ids: Row[] = runs.status === 'success' ? runs.data.flatMap((r) => r.findings.map((f) => ({
      key: `${r.run_id}-${f.finding_id}`, source: 'IDS Simulator' as const, name: f.rule_name, code: f.rule_id,
      status: 'review' as const, severity: f.severity, time: f.first_seen,
      context: `${Object.values(f.entity).join(' · ')} · ${f.event_count} events in ${r.dataset_name}`,
      explanation: f.explanation, action: f.recommended_response, to: '/ids-simulator',
    }))) : []
    const web: Row[] = scans.slice(0, 3).flatMap((s) => s.checks.filter((c) => c.status === 'fail' || c.status === 'warning').map((c) => ({
      key: `${s.scan_id}-${c.check_id}`, source: 'Web Scanner' as const, name: c.title, code: c.check_id,
      status: c.status, time: s.finished_at, context: new URL(s.final_url).host,
      explanation: c.explanation, action: c.remediation, to: '/web-scanner',
    })))
    return [...ids, ...web].sort((a, b) => RANK[a.severity ?? a.status] - RANK[b.severity ?? b.status] || a.time.localeCompare(b.time))
  }, [runs, scans])

  const findings = runs.status === 'success' ? runs.data.flatMap((r) => r.findings) : []
  const bySeverity = SEVERITIES.map((s) => findings.filter((f) => f.severity === s).length)
  const scanTotals = (['pass', 'warning', 'fail', 'info'] as const).map((s) => scans.reduce((n, sc) => n + sc.summary[s], 0))

  function exportReport() {
    if (runs.status !== 'success') return
    const now = new Date().toISOString()
    downloadFile(`tellwarden-overview-${stamp(now)}.json`, JSON.stringify({
      tool: 'Tellwarden', generated_at: now,
      note: 'Sample data: bundled synthetic datasets analysed offline, plus scans run in this browser tab.',
      sample_ids_runs: runs.data, scans_this_tab: scans,
    }, null, 2), 'application/json')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-navy sm:text-[32px]">Overview</h1>
          <p className="mt-1 text-slate-ink">Your starting point for the Web Scanner and the offline IDS Simulator.</p>
        </div>
        <Button variant="secondary" onClick={exportReport} disabled={runs.status !== 'success'}>
          <Download className="size-4" aria-hidden /> Export report
        </Button>
      </div>

      <Hero />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ModuleCard
          to="/web-scanner" Icon={Globe} module="Module A" title="Web Scanner" subtitle="Configuration checks"
          text="Check HTTPS, security headers and basic CORS behaviour of one site you own or have permission to test."
          chips={['HTTPS', 'Security headers', 'CORS']}
          spec={health.kind === 'online'
            ? `≤${health.health.limits.max_requests_per_scan} requests · ports 80/443 · ${health.health.limits.scan_deadline_seconds}s deadline`
            : 'Bounded, passive requests only'}
          note="Results are Pass, Warning, Fail or Info. A good result does not mean a site is secure."
          action="Start a scan" secondary={{ to: '/about', label: 'How scans stay safe' }}
        />
        <ModuleCard
          to="/ids-simulator" Icon={ShieldAlert} module="Module B" title="IDS Simulator" subtitle="Offline rule engine"
          text={`Apply ${health.kind === 'online' ? health.health.rules_loaded : 'the'} readable detection rules to sample or uploaded event logs and see which activity looks suspicious.`}
          chips={['Brute force', 'Password spraying', 'Port scans']}
          spec={health.kind === 'online'
            ? `CSV ≤${health.health.limits.max_upload_mb} MB · ≤${health.health.limits.max_events.toLocaleString()} rows · deterministic`
            : 'CSV event logs · deterministic'}
          note="Offline analysis only. This is not live network monitoring."
          action="Run an analysis" secondary={{ to: '/rules-guide', label: 'View rules' }}
        />
      </div>

      <SampleStrip runs={runs.status === 'success' ? runs.data : null} rules={health.kind === 'online' ? health.health.rules_loaded : null} />

      {runs.status === 'error' && (
        <Alert tone="error" title="Could not load sample analysis">
          {runs.error.message}{' '}
          <button className="font-medium text-teal underline" onClick={() => { sampleCache = null; runs.reload() }}>Retry</button>
        </Alert>
      )}

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <FindingsPreview rows={rows} loading={runs.status === 'loading'} />
        <Card>
          <h2 className="text-lg font-semibold text-navy">Sample breakdown</h2>
          <p className="mt-1 text-sm text-slate-ink">Counts from the sample runs. This is not a security score.</p>
          <Breakdown
            title="IDS findings by severity" total={`${findings.length} findings`}
            parts={SEVERITIES.map((s, i) => ({ label: s, value: bySeverity[i], cls: ['bg-[#7f1d1d]', 'bg-fail', 'bg-warn', 'bg-slate-ink'][i] }))}
          />
          {scans.length > 0 ? (
            <Breakdown
              title="Web Scanner results (this tab)" total={`${scanTotals.reduce((a, b) => a + b, 0)} checks`}
              parts={['Pass', 'Warning', 'Fail', 'Info'].map((l, i) => ({ label: l, value: scanTotals[i], cls: ['bg-pass', 'bg-warn', 'bg-fail', 'bg-slate-ink'][i] }))}
            />
          ) : (
            <p className="mt-6 border-t border-line pt-4 text-sm text-slate-ink">
              Web Scanner results appear here after you <Link to="/web-scanner" className="font-medium text-teal hover:underline">run a scan</Link>. No sample scans are shown.
            </p>
          )}
        </Card>
      </div>

      <p className="flex items-start gap-2 text-sm text-slate-ink">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Educational prototype. Not a live scanner or network monitor. Sample findings come from synthetic datasets; scanner results only appear for scans you run.
      </p>
    </div>
  )
}

function Hero() {
  const health = useBackendHealth()
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-7 text-white shadow-card sm:px-8 sm:py-9">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="hero-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
      <svg viewBox="0 0 200 220" className="pointer-events-none absolute -right-6 -bottom-16 hidden h-72 text-white sm:block" fill="none" aria-hidden>
        {[0, 18, 36].map((d) => (
          <path key={d} d={`M100 ${10 + d} ${20 + d * 0.9} ${40 + d * 0.6}v${60 - d * 0.6}c0 ${50 - d} ${34 - d * 0.4} ${86 - d * 1.2} ${80 - d * 0.9} ${110 - d * 1.6} ${46 - d * 0.5}-${24 - d * 0.4} ${80 - d * 0.9}-${60 - d * 0.6} ${80 - d * 0.9}-${110 - d * 1.6}V${40 + d * 0.6}L100 ${10 + d}Z`}
            stroke="currentColor" strokeOpacity={0.12 - d * 0.002} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-nav-text">
          Educational prototype
        </span>
        <h2 className="mt-4 text-[26px] leading-tight font-semibold tracking-tight sm:text-[34px]">Welcome to Tellwarden</h2>
        <p className="mt-3 text-base leading-relaxed text-nav-text sm:text-lg">
          Check a few configuration settings of a site you are allowed to test, or run readable detection rules over
          event logs. Everything is explained in plain language.
        </p>
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-nav-label">
          <span className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${health.kind === 'online' ? 'bg-emerald-400' : health.kind === 'offline' ? 'bg-red-400' : 'bg-slate-400'}`} aria-hidden />
            {health.kind === 'online' ? `Backend online · v${health.health.version}` : health.kind === 'offline' ? 'Backend offline' : 'Checking backend'}
          </span>
          {health.kind === 'offline' && (
            <button className="flex items-center gap-1 font-medium text-white underline" onClick={health.refresh}>
              <RefreshCw className="size-3.5" aria-hidden /> Retry
            </button>
          )}
        </p>
      </div>
    </section>
  )
}

interface ModuleProps {
  to: string; Icon: typeof Globe; module: string; title: string; subtitle: string; text: string
  chips: string[]; spec: string; note: string; action: string; secondary: { to: string; label: string }
}

function ModuleCard({ to, Icon, module, title, subtitle, text, chips, spec, note, action, secondary }: ModuleProps) {
  return (
    <Card className="flex flex-col p-6! sm:p-7!">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal ring-1 ring-teal/15">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wider text-slate-ink uppercase">{module}</p>
          <h2 className="text-[22px] leading-snug font-semibold text-navy">{title}</h2>
          <p className="text-sm text-slate-ink">{subtitle}</p>
        </div>
      </div>
      <p className="mt-5 leading-relaxed text-slate-800">{text}</p>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Capabilities">
        {chips.map((c) => <li key={c} className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-navy">{c}</li>)}
      </ul>
      <p className="mt-4 font-mono text-sm text-slate-ink">{spec}</p>
      <p className="mt-2 text-sm text-slate-ink">{note}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
        <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-teal px-5 font-medium text-white hover:bg-[#0b5f58]">
          {action} <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link to={secondary.to} className="font-medium text-teal hover:underline">{secondary.label}</Link>
      </div>
    </Card>
  )
}

function SampleStrip({ runs, rules }: { runs: IdsRunResult[] | null; rules: number | null }) {
  const findings = runs?.flatMap((r) => r.findings) ?? []
  const items = [
    { label: 'Events analysed', value: runs ? runs.reduce((n, r) => n + r.events_loaded, 0).toLocaleString() : '…', hint: `${runs?.length ?? '…'} synthetic datasets` },
    { label: 'IDS findings', value: runs ? String(findings.length) : '…', hint: SEVERITIES.map((s) => `${findings.filter((f) => f.severity === s).length} ${s.toLowerCase()}`).filter((t) => !t.startsWith('0')).join(', ') || 'none' },
    { label: 'Detection rules', value: rules ?? '…', hint: 'Thresholds are illustrative' },
  ]
  return (
    <section aria-labelledby="sample-stats" className="rounded-2xl border border-line/80 bg-white/60 px-5 py-4">
      <h2 id="sample-stats" className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold tracking-wider text-slate-ink uppercase">
        <span className="rounded-full bg-slate-ink/10 px-2 py-0.5 tracking-normal whitespace-nowrap normal-case">Sample data</span>
        Bundled datasets, analysed by the live rule engine
      </h2>
      <dl className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-line">
        {items.map((it) => (
          <div key={it.label} className="sm:px-4 sm:first:pl-0">
            <dt className="text-sm text-slate-ink">{it.label}</dt>
            <dd className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-navy">{it.value}</span>
              <span className="truncate text-sm text-slate-ink">{it.hint}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Breakdown({ title, total, parts }: { title: string; total: string; parts: { label: string; value: number; cls: string }[] }) {
  const sum = parts.reduce((n, p) => n + p.value, 0)
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-navy">{title}</h3>
        <span className="text-sm text-slate-ink">{total}</span>
      </div>
      <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {sum > 0 && parts.filter((p) => p.value).map((p) => <span key={p.label} className={p.cls} style={{ width: `${(p.value / sum) * 100}%` }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-800"><span className={`size-2.5 rounded-sm ${p.cls}`} aria-hidden />{p.label}</dt>
            <dd className="font-mono text-navy">{p.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FindingsPreview({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const [filter, setFilter] = useState<'All' | Row['source']>('All')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const visible = rows.filter((r) => (filter === 'All' || r.source === filter) && (!q || `${r.name} ${r.code} ${r.context}`.toLowerCase().includes(q)))
  const shown = showAll ? visible : visible.slice(0, 6)
  const count = (f: typeof filter) => rows.filter((r) => f === 'All' || r.source === f).length

  return (
    <Card className="overflow-hidden p-0!">
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-navy">Recent sample findings</h2>
        <p className="mt-1 text-sm text-slate-ink">IDS findings from the bundled datasets, plus failed or warning checks from scans you ran in this tab. Select a finding for details.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['All', 'Web Scanner', 'IDS Simulator'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ${filter === f ? 'bg-navy text-white' : 'border border-line bg-white text-navy hover:bg-paper'}`}>
              {f} <span className={filter === f ? 'text-nav-label' : 'text-slate-ink'}>{count(f)}</span>
            </button>
          ))}
          <label className="relative min-w-0 flex-1 basis-48">
            <span className="sr-only">Search findings</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-ink" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search findings"
              className="h-9 w-full rounded-[10px] border border-line bg-white pr-3 pl-9 text-sm text-navy placeholder:text-slate-ink" />
          </label>
        </div>
      </div>

      {loading ? <div className="px-6 pb-6"><Loading label="Running rules over sample datasets…" /></div>
        : shown.length === 0 ? <div className="px-5 pb-6 sm:px-6"><EmptyState title="No matching findings">{filter === 'Web Scanner' ? 'Run a scan to see Web Scanner findings here.' : 'Try another filter or search term.'}</EmptyState></div>
        : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_6.5rem_5.5rem] gap-4 border-y border-line bg-paper px-6 py-2.5 text-sm font-medium text-slate-ink md:grid">
              <span>Finding</span><span>Status</span><span>Severity</span><span>Time (UTC)</span>
            </div>
            <ul className="divide-y divide-line">
              {shown.map((r) => {
                const open = openKey === r.key
                return (
                  <li key={r.key}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6 md:grid-cols-[minmax(0,1fr)_9rem_6.5rem_5.5rem]">
                      <div className="min-w-0">
                        <button type="button" aria-expanded={open} onClick={() => setOpenKey(open ? null : r.key)}
                          className="flex items-center gap-1 text-left font-medium text-navy underline decoration-line underline-offset-4 hover:decoration-navy">
                          {r.name}
                          <ChevronDown className={`size-4 shrink-0 text-slate-ink transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        <p className="mt-0.5 truncate text-sm text-slate-ink"><span className="font-mono">{r.code}</span> · {r.source}</p>
                      </div>
                      <div className="justify-self-end md:justify-self-start">
                        {r.status === 'review'
                          ? <span className="inline-flex items-center rounded-full bg-navy/8 px-2.5 py-0.5 text-sm font-semibold text-navy">NEEDS REVIEW</span>
                          : <StatusBadge status={r.status} />}
                      </div>
                      <div className="md:block">{r.severity ? <SeverityBadge severity={r.severity} /> : <span className="text-sm text-slate-ink">No severity</span>}</div>
                      <span className="justify-self-end font-mono text-sm text-slate-ink md:justify-self-start">{time(r.time)}</span>
                    </div>
                    {open && (
                      <dl className="mx-5 mb-4 grid gap-x-4 gap-y-1.5 rounded-xl bg-paper p-4 text-sm sm:mx-6 sm:grid-cols-[8rem_1fr]">
                        <dt className="text-slate-ink">Context</dt><dd><Mono>{r.context}</Mono></dd>
                        <dt className="text-slate-ink">Why it matters</dt><dd>{r.explanation}</dd>
                        <dt className="text-slate-ink">Next step</dt><dd>{r.action}</dd>
                        <dt className="sr-only">Open</dt>
                        <dd className="sm:col-start-2"><Link to={r.to} className="inline-flex items-center gap-1 font-medium text-teal hover:underline">Open {r.source} <ArrowRight className="size-4" aria-hidden /></Link></dd>
                      </dl>
                    )}
                  </li>
                )
              })}
            </ul>
            {visible.length > 6 && (
              <div className="flex items-center justify-between border-t border-line bg-paper px-6 py-3 text-sm">
                <span className="text-slate-ink">Showing {shown.length} of {visible.length} findings</span>
                <button type="button" className="font-medium text-teal hover:underline" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show fewer' : `Show all ${visible.length}`}
                </button>
              </div>
            )}
          </div>
        )}
    </Card>
  )
}
