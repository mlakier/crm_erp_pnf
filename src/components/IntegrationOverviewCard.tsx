type IntegrationOverviewCardProps = {
  provider: string
  setupFields: string[]
  statusText: string
}

export default function IntegrationOverviewCard({
  provider,
  setupFields,
  statusText,
}: IntegrationOverviewCardProps) {
  return (
    <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Integration Overview
      </p>
      <dl className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Provider</dt>
          <dd className="mt-1 text-sm text-white">{provider}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Setup Inputs</dt>
          <dd className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{setupFields.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</dt>
          <dd className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{statusText}</dd>
        </div>
      </dl>
    </section>
  )
}