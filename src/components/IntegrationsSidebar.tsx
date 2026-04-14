import Link from 'next/link'
import { INTEGRATIONS } from '@/lib/integrations-catalog'

export default function IntegrationsSidebar({ activeHref }: { activeHref?: string }) {
  return (
    <aside className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Integrations
      </p>
      <div className="mt-4 space-y-2">
        {INTEGRATIONS.map((integration) => {
          const active = integration.href === activeHref
          return (
            <Link
              key={integration.key}
              href={integration.href}
              className="block rounded-xl border p-3 transition-colors"
              style={active
                ? {
                    borderColor: 'var(--accent-primary)',
                    backgroundColor: 'rgba(59,130,246,0.12)',
                  }
                : {
                    borderColor: 'var(--border-muted)',
                    backgroundColor: 'transparent',
                  }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: active ? 'var(--accent-primary-strong)' : 'var(--text-muted)' }}>
                {integration.provider}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{integration.label}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{integration.category}</p>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}