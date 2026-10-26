import { api } from '../api/client'
import type { Rule } from '../api/types'
import { Alert, Button, Card, Loading, Mono, PageHeader, SeverityBadge } from '../components/ui'
import { useApi } from '../lib/useApi'

function logic(r: Rule) {
  const group = Array.isArray(r.group_by) ? r.group_by.join(' + ') : r.group_by
  switch (r.type) {
    case 'count_in_window':
      return `At least ${r.threshold} ${r.event_filter} events from one ${group} within ${r.window_seconds} s.`
    case 'distinct_in_window':
      return `One ${group} has ${r.event_filter} events with at least ${r.threshold} distinct ${r.distinct_field} values within ${r.window_seconds} s${r.max_per_distinct ? `, each tried at most ${r.max_per_distinct} times` : ''}.`
    case 'failures_then_success':
      return `An ${r.event_filter_success} for one ${group} preceded by at least ${r.threshold} ${r.event_filter_fail} events within ${r.window_seconds} s.`
    case 'time_of_day':
      return `${r.event_filter} outside ${String(r.start_hour).padStart(2, '0')}:00–${String(r.end_hour).padStart(2, '0')}:00 ${r.timezone ?? 'UTC'}.`
  }
}

export function RulesGuide() {
  const rules = useApi(api.rules)
  return (
    <>
      <PageHeader eyebrow="Reference" title="Detection Rules Guide"
        description={<>Loaded live from the backend rule file <Mono>rules/default_rules.yaml</Mono>. Thresholds are illustrative teaching defaults.</>} />
      {rules.status === 'loading' && <Loading label="Loading rules…" />}
      {rules.status === 'error' && (
        <Alert tone="error" title="Could not load rules">
          {rules.error.message} <Button variant="secondary" className="ml-2 px-2 py-1" onClick={rules.reload}>Retry</Button>
        </Alert>
      )}
      {rules.status === 'success' && (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Mono>{r.id}</Mono>
                <SeverityBadge severity={r.severity} />
                {!r.enabled && <span className="text-sm text-slate-ink">(disabled by default)</span>}
              </div>
              <h2 className="mt-3 text-[22px] leading-snug font-semibold text-navy">{r.name}</h2>
              <dl className="mt-2 space-y-2 text-sm">
                <div><dt className="font-medium text-slate-900">Logic</dt><dd className="text-slate-ink">{logic(r)}</dd></div>
                <div><dt className="font-medium text-slate-900">Why it matters</dt><dd className="text-slate-ink">{r.explanation}</dd></div>
                <div><dt className="font-medium text-slate-900">Known false positives</dt><dd className="text-slate-ink">{r.false_positives}</dd></div>
                <div><dt className="font-medium text-slate-900">Recommended response</dt><dd className="text-slate-ink">{r.response}</dd></div>
                <div>
                  <dt className="font-medium text-slate-900">Adjustable bounds</dt>
                  <dd className="text-slate-ink">
                    {Object.entries(r.bounds).map(([k, [lo, hi]]) => <span key={k} className="mr-3"><Mono>{k}</Mono> {lo}–{hi}</span>)}
                  </dd>
                </div>
                <div><dt className="font-medium text-slate-900">MITRE ATT&CK</dt><dd><Mono>{r.attack_technique}</Mono> · type <Mono>{r.type}</Mono></dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
