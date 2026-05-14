import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { bankConnectionCategoryLabel, bankConnectionProviderLabel } from '@/lib/banking-connection-options'

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

export default async function BankAccountsPage() {
  const [bankAccounts, availableGlAccounts] = await Promise.all([
    prisma.bankAccount.findMany({
      include: {
        subsidiary: true,
        currency: true,
        glAccount: true,
        connection: true,
        _count: { select: { feedTransactions: true, reconciliations: true } },
      },
      orderBy: [{ active: 'desc' }, { bankAccountId: 'asc' }],
    }),
    prisma.chartOfAccounts.count({
      where: {
        bankAccountRequired: true,
        active: true,
        linkedBankAccount: null,
      },
    }),
  ])

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Treasury
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Bank Accounts</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Link real-world bank accounts to GL cash accounts. Feed pulls, matching, and reconciliations all start here.
          </p>
        </div>
        <Link
          href="/bank-accounts/new"
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          New Bank Account
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Linked accounts</p>
          <p className="mt-2 text-3xl font-semibold text-white">{bankAccounts.length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Available GL cash accounts</p>
          <p className="mt-2 text-3xl font-semibold text-white">{availableGlAccounts}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Open reconciliations</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {bankAccounts.reduce((sum, account) => sum + account._count.reconciliations, 0)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Bank Account</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Subsidiary</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Linked GL Account</th>
              <th className="px-4 py-3">Connection</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bankAccounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No bank accounts configured yet. Create one from a GL account marked as a bank account.
                </td>
              </tr>
            ) : (
              bankAccounts.map((account) => (
                <tr key={account.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-4 py-3">
                    <Link href={`/bank-accounts/${account.id}`} className="font-semibold text-white hover:underline">
                      {account.name}
                    </Link>
                    <div style={{ color: 'var(--text-muted)' }}>{account.bankAccountId} {account.maskedAccountNumber ? `• ${account.maskedAccountNumber}` : ''}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{account.bankName}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{account.subsidiary.subsidiaryId}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{account.currency.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/chart-of-accounts/${account.glAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {account.glAccount.accountNumber} - {account.glAccount.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {account.connection
                      ? `${account.connection.institutionName} • ${bankConnectionCategoryLabel(account.connection.connectionCategory)} • ${bankConnectionProviderLabel(account.connection.provider)}`
                      : account.statementSource}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {account.connection?.lastSyncAt ? formatDate(account.connection.lastSyncAt) : `${account._count.feedTransactions} feed lines`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: account.active ? '#4ade80' : '#f87171', color: account.active ? '#86efac' : '#fca5a5' }}>
                      {account.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
