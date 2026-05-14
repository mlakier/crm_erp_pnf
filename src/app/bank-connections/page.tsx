import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { bankConnectionCategoryLabel, bankConnectionProviderLabel } from '@/lib/banking-connection-options'

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString('en-US') : '-'
}

export default async function BankConnectionsPage() {
  const connections = await prisma.bankConnection.findMany({
    include: { _count: { select: { bankAccounts: true, feedTransactions: true } } },
    orderBy: [{ active: 'desc' }, { institutionName: 'asc' }],
  })

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Treasury</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Bank Connections</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Provider connection shell for future bank OAuth/API integrations. Today this records provider, institution, sync health, and linked bank accounts.
          </p>
        </div>
        <Link
          href="/bank-connections/new"
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          New Connection
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Connection</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Sync Frequency</th>
              <th className="px-4 py-3">Last Sync</th>
              <th className="px-4 py-3">Bank Accounts</th>
              <th className="px-4 py-3">Feed Lines</th>
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No bank connections yet. Bank accounts can still use manual file import until a provider is configured.
                </td>
              </tr>
            ) : (
              connections.map((connection) => (
                <tr key={connection.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{connection.institutionName}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{connection.connectionId}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{bankConnectionCategoryLabel(connection.connectionCategory)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{bankConnectionProviderLabel(connection.provider)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{connection.status}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{connection.health}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{connection.syncFrequency}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(connection.lastSyncAt)}</td>
                  <td className="px-4 py-3 text-white">{connection._count.bankAccounts}</td>
                  <td className="px-4 py-3 text-white">{connection._count.feedTransactions}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
