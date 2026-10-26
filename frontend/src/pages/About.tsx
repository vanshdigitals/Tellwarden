import { useBackendHealth } from '../components/BackendStatus'
import { Card, CardTitle, Mono, PageHeader } from '../components/ui'

export function About() {
  const health = useBackendHealth()
  const l = health.kind === 'online' ? health.health.limits : null
  return (
    <>
      <PageHeader eyebrow="Reference" title="About & Limitations"
        description="What Tellwarden does, what it deliberately does not do, and how it keeps scans safe." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Educational charter</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-ink">
            <li><strong>Web configuration hygiene:</strong> HTTPS, security headers and basic CORS behaviour of one URL, without intrusive probing.</li>
            <li><strong>Rule-based intrusion detection:</strong> sliding-window pattern matching over offline event logs. Rules are plain YAML data.</li>
            <li>Rule-based and deterministic. No AI/ML and no paid external services.</li>
          </ul>
        </Card>
        <Card>
          <CardTitle>Strict limitations</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-ink">
            <li>No crawling, exploitation, brute forcing or vulnerability testing (SQLi, XSS, CSRF).</li>
            <li>Module B analyses static CSV files only. It is not live packet capture or real-time monitoring.</li>
            <li>No score, letter grade or guarantee of safety. A clean result reflects configuration at that moment only.</li>
            <li>No persistent storage: results live in your browser tab and uploaded files are processed in memory.</li>
          </ul>
        </Card>
        <Card className="md:col-span-2">
          <CardTitle>Safe HTTP design and SSRF safeguards</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-ink">
            <li>Every resolved address must be public. Private (RFC 1918), loopback, link-local, carrier-grade NAT, multicast, reserved and cloud-metadata addresses such as <Mono>169.254.169.254</Mono> and <Mono>fd00:ec2::254</Mono> are refused.</li>
            <li>Addresses are re-validated at connection time and the connection goes only to the validated address, which defends against DNS rebinding.</li>
            <li>Ports 80 and 443 only. No embedded credentials. Obfuscated numeric hosts (e.g. <Mono>2130706433</Mono>) are rejected.</li>
            <li>
              Redirects are followed manually{l && <> (at most <Mono>{l.max_redirects}</Mono>)</>}, re-checking every hop.
              {l && <> At most <Mono>{l.max_requests_per_scan}</Mono> requests and a <Mono>{l.scan_deadline_seconds}s</Mono> deadline per scan, with a <Mono>{l.cooldown_seconds}s</Mono> cooldown.</>}
            </li>
            <li>Validation runs on the backend; checks in the browser are only for faster feedback.</li>
          </ul>
        </Card>
        <Card className="md:col-span-2">
          <CardTitle>Licensing</CardTitle>
          <p className="text-sm text-slate-ink">MIT License. DM Sans and IBM Plex Mono are self-hosted under the SIL Open Font License 1.1.</p>
        </Card>
      </div>
    </>
  )
}
