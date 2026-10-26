import { AlertTriangle, CheckCircle2, CircleAlert, Info, Loader2, XCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { CheckStatus } from '../api/types'

// Styling follows DESIGN_SYSTEM.md: 14 px cards, 10 px controls, 1 px #CBD5E1 borders, no shadows.

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: ReactNode }) {
  return (
    <header className="mb-6">
      <p className="text-sm font-semibold tracking-wider text-teal uppercase">{eyebrow}</p>
      <h1 className="mt-1 text-[28px] leading-tight font-semibold text-navy">{title}</h1>
      <p className="mt-2 max-w-[75ch] text-slate-ink">{description}</p>
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line/80 bg-white p-4 shadow-card sm:p-6 ${className}`}>{children}</section>
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-[22px] leading-snug font-semibold text-navy">{children}</h2>
}

export function Button({ variant = 'primary', loading, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; loading?: boolean }) {
  const styles = variant === 'primary'
    ? 'bg-teal text-white hover:bg-[#0b5f58] disabled:bg-slate-200 disabled:text-slate-ink'
    : 'border border-slate-ink/60 bg-white text-navy hover:bg-paper disabled:border-line disabled:text-slate-ink'
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

const STATUS_STYLE: Record<CheckStatus, { label: string; cls: string; Icon: typeof Info }> = {
  pass: { label: 'PASS', cls: 'bg-pass/10 text-pass', Icon: CheckCircle2 },
  warning: { label: 'WARNING', cls: 'bg-warn/10 text-warn', Icon: AlertTriangle },
  fail: { label: 'FAIL', cls: 'bg-fail/10 text-fail', Icon: XCircle },
  info: { label: 'INFO', cls: 'bg-slate-ink/10 text-slate-ink', Icon: Info },
}

export function StatusBadge({ status }: { status: CheckStatus }) {
  const { label, cls, Icon } = STATUS_STYLE[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${cls}`}>
      <Icon className="size-4" aria-hidden /> {label}
    </span>
  )
}

// Severity reuses status tokens (High/Critical = error, Medium = warning, Low = slate) plus a numeric rank.
const SEVERITY: Record<string, { rank: number; cls: string }> = {
  Critical: { rank: 4, cls: 'bg-fail text-white' },
  High: { rank: 3, cls: 'bg-fail/10 text-fail' },
  Medium: { rank: 2, cls: 'bg-warn/10 text-warn' },
  Low: { rank: 1, cls: 'bg-slate-ink/10 text-slate-ink' },
}

export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY[severity] ?? SEVERITY.Low
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${s.cls}`}>
      {severity} <span className="ml-1 font-mono font-normal opacity-90">S{s.rank}</span>
    </span>
  )
}

const ALERT = {
  error: { cls: 'border-fail/30 bg-fail/5 text-fail', Icon: XCircle },
  warning: { cls: 'border-warn/30 bg-warn/5 text-warn', Icon: AlertTriangle },
  info: { cls: 'border-line bg-slate-ink/5 text-slate-ink', Icon: Info },
  success: { cls: 'border-pass/30 bg-pass/5 text-pass', Icon: CheckCircle2 },
}

export function Alert({ tone, title, children }: { tone: keyof typeof ALERT; title?: string; children: ReactNode }) {
  const { cls, Icon } = ALERT[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-[10px] border px-4 py-3 text-sm ${cls}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={`text-slate-800 ${title ? 'mt-1' : ''}`}>{children}</div>
      </div>
    </div>
  )
}

/** Always-visible scope and limits banner (DESIGN_SYSTEM.md section 9). */
export function ScopeBanner({ children }: { children: ReactNode }) {
  return <div className="mb-6"><Alert tone="info">{children}</Alert></div>
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-fail">
      <CircleAlert className="size-4 shrink-0" aria-hidden /> {children}
    </p>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-ink" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </p>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-white px-4 py-10 text-center">
      <p className="font-medium text-navy">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-ink">{children}</div>}
    </div>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 font-mono text-sm break-all text-slate-800">{children}</code>
}
