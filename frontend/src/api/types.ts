// Mirrors src/tellwarden/models.py and api.py response shapes.

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'info'

export interface Health {
  status: 'ok'
  version: string
  time: string
  rules_loaded: number
  samples_available: number
  limits: Record<string, number>
}

export interface CheckResult {
  check_id: string
  category: 'https' | 'header' | 'cors'
  title: string
  status: CheckStatus
  observed: string
  expected: string
  explanation: string
  remediation: string
  reference_url: string
}

export interface ScanResult {
  tool: string
  version: string
  scan_id: string
  started_at: string
  finished_at: string
  input_url: string
  final_url: string
  redirect_chain: { hop: number; url: string; status: number; location: string | null }[]
  resolved_addresses: string[]
  tls: { verified: boolean; error: string | null }
  request_count: number
  checks: CheckResult[]
  summary: Record<CheckStatus, number>
  complete: boolean
  notes: string[]
  limitations: string[]
  authorization_confirmed: boolean
}

export interface Rule {
  id: string
  name: string
  enabled: boolean
  type: 'count_in_window' | 'distinct_in_window' | 'failures_then_success' | 'time_of_day'
  event_filter?: string
  event_filter_fail?: string
  event_filter_success?: string
  group_by: string | string[]
  distinct_field?: string
  window_seconds?: number
  threshold?: number
  max_per_distinct?: number
  start_hour?: number
  end_hour?: number
  timezone?: string
  severity: string
  attack_technique: string
  explanation: string
  false_positives: string
  response: string
  bounds: Record<string, [number, number]>
}

export interface Sample {
  id: string
  name: string
  description: string
  rows: number
}

export interface Finding {
  finding_id: string
  rule_id: string
  rule_name: string
  severity: string
  attack_technique: string
  entity: Record<string, string>
  first_seen: string
  last_seen: string
  event_count: number
  threshold: number | null
  window_seconds: number | null
  evidence_event_ids: string[]
  evidence_truncated: boolean
  explanation: string
  recommended_response: string
  data_origin: string
}

export interface IdsRunResult {
  tool: string
  version: string
  run_id: string
  ran_at: string
  dataset_name: string
  dataset_origin: 'sample' | 'uploaded'
  events_loaded: number
  rows_skipped: number
  skipped_examples: { row: number; reason: string }[]
  notes: string[]
  rules_applied: { rule_id: string; enabled: boolean; parameters: Record<string, number | string> }[]
  findings: Finding[]
  limitations: string[]
}

export type RuleOverrides = Record<string, Record<string, number | boolean>>
