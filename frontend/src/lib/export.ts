import type { Finding } from '../api/types'

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function stamp(iso: string) {
  return iso.replace(/[-:]/g, '').replace(/\..*$/, '').replace('Z', '') + 'Z'
}

/** Keep only letters, digits, dot and hyphen (TRD section 13). */
export function safeName(value: string) {
  return value.replace(/[^A-Za-z0-9.-]/g, '').slice(0, 80) || 'report'
}

/** Neutralise spreadsheet formula injection (SEC-16) and quote the cell. */
function csvCell(value: unknown) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function findingsToCsv(findings: Finding[]) {
  const cols = ['finding_id', 'rule_id', 'rule_name', 'severity', 'attack_technique', 'entity', 'first_seen',
    'last_seen', 'event_count', 'threshold', 'window_seconds', 'evidence_event_ids', 'evidence_truncated',
    'data_origin'] as const
  const rows = findings.map((f) =>
    cols.map((c) => {
      if (c === 'entity') return csvCell(Object.entries(f.entity).map(([k, v]) => `${k}=${v}`).join('; '))
      if (c === 'evidence_event_ids') return csvCell(f.evidence_event_ids.join(' '))
      return csvCell(f[c])
    }).join(','))
  return [cols.join(','), ...rows].join('\r\n')
}
