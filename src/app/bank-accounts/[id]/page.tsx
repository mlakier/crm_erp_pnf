import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function amountText(amount: unknown, currencyCode: string) {
  return `${currencyCode} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function BankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      subsidiary: true,
      currency: true,
      glAccount: true,
      connection: true,
      feedTransactions: {
        include: { currency: true },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: 25,
      },
      reconciliations: {
        orderBy: [{ periodEndDate: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      },
    },
  })

  if (!bankAccount) notFound()

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/bank-accounts" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            ← Back to Bank Accounts
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{bankAccount.name}</h1>
            <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: bankAccount.active ? '#4ade80' : '#f87171', color: bankAccount.active ? '#86efac' : '#fca5a5' }}>
              {bankAccount.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {bankAccount.bankAccountId} • {bankAccount.bankName} • {bankAccount.maskedAccountNumber ?? 'No masked account number'}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Subsidiary</p>
          <p className="mt-2 font-semibold text-white">{bankAccount.subsidiary.subsidiaryId}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Currency</p>
          <p className="mt-2 font-semibold text-white">{bankAccount.currency.code}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Connection</p>
          <p className="mt-2 font-semibold text-white">{bankAccount.connection?.institutionName ?? bankAccount.statementSource}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Reconciliation Start</p>
          <p className="mt-2 font-semibold text-white">{formatDate(bankAccount.reconciliationStartDate)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">GL Link</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              This bank account controls statement matching and reconciliation for the linked GL cash account.
            </p>
          </div>
          <Link href={`/chart-of-accounts/${bankAccount.glAccountId}`} className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-muted)', color: 'var(--accent-primary-strong)' }}>
            Open GL Account
          </Link>
        </div>
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.22)' }}>
          <p className="font-semibold text-white">{bankAccount.glAccount.accountNumber} - {bankAccount.glAccount.name}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Category: {bankAccount.glAccount.category ?? '-'} • Reconciliation: {bankAccount.glAccount.reconciliationType ?? '-'} • Auto-match: {bankAccount.glAccount.autoMatchStrategy ?? '-'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <h2 className="text-lg font-semibold text-white">Recent Bank Activity</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Latest feed or imported transactions for matching.</p>
          </div>
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
              <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bankAccount.feedTransactions.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No activity loaded yet.</td></tr>
              ) : (
                bankAccount.feedTransactions.map((line) => (
                  <tr key={line.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(line.transactionDate)}</td>
                    <td className="px-4 py-3 text-white">{line.description}</td>
                    <td className="px-4 py-3 text-white">{amountText(line.amount, line.currency.code)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{line.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <h2 className="text-lg font-semibold text-white">Reconciliation History</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Month-end bank-to-GL reconciliation records.</p>
          </div>
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
              <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-3">Period End</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">AI Review</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bankAccount.reconciliations.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No reconciliations yet.</td></tr>
              ) : (
                bankAccount.reconciliations.map((reconciliation) => (
                  <tr key={reconciliation.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-4 py-3 text-white">{formatDate(reconciliation.periodEndDate)}</td>
                    <td className="px-4 py-3 text-white">{amountText(reconciliation.difference, bankAccount.currency.code)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{reconciliation.aiReviewStatus}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{reconciliation.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
