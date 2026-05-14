import { prisma } from '@/lib/prisma'
import BankReconciliationCreateForm from '@/components/BankReconciliationCreateForm'
import { buildBankReconciliationSummary } from '@/lib/bank-reconciliation-summary'

function money(amount: unknown, code: string) {
  return `${code} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0)
}

function nextMonthEnd(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 2, 0)
}

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}

function reconciliationDisplayStatus(reconciliation: { status: string; difference: unknown; aiReviewStatus: string | null }) {
  if (reconciliation.status === 'reconciled') return { label: 'Closed', tone: 'good' as const }
  const isClean = Math.abs(Number(reconciliation.difference)) < 0.01
  const isReviewed = reconciliation.aiReviewStatus === 'ready_for_review' || reconciliation.aiReviewStatus === 'clean'
  if (reconciliation.status === 'open' && isClean && isReviewed) return { label: 'Ready to Close', tone: 'good' as const }
  return { label: 'Open', tone: 'warn' as const }
}

export default async function BankReconciliationsPage() {
  const [reconciliations, bankAccounts, unmatchedByAccount] = await Promise.all([
    prisma.bankReconciliation.findMany({
      include: { bankAccount: { include: { currency: true, glAccount: true } }, subsidiary: true },
      orderBy: [{ periodEndDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.bankAccount.findMany({
      where: { active: true },
      include: { currency: true, glAccount: true, subsidiary: true },
      orderBy: { bankAccountId: 'asc' },
    }),
    prisma.bankFeedTransaction.groupBy({
      by: ['bankAccountId'],
      where: { status: { in: ['unmatched', 'suggested'] } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ])

  const unmatchedMap = new Map(
    unmatchedByAccount.map((row) => [
      row.bankAccountId,
      {
        count: row._count._all,
        amount: Number(row._sum.amount ?? 0),
      },
    ]),
  )
  const openCount = reconciliations.filter((reconciliation) => reconciliation.status === 'open').length
  const totalDifference = reconciliations.reduce((sum, reconciliation) => sum + Number(reconciliation.difference), 0)
  const bankAccountIds = bankAccounts.map((account) => account.id)
  const glAccountIds = bankAccounts.map((account) => account.glAccountId)
  const [firstBankActivity, firstGlActivity] = await Promise.all([
    prisma.bankFeedTransaction.findMany({
      where: { bankAccountId: { in: bankAccountIds } },
      orderBy: { transactionDate: 'asc' },
      select: { bankAccountId: true, transactionDate: true },
    }),
    prisma.journalEntryLineItem.findMany({
      where: {
        accountId: { in: glAccountIds },
        journalEntry: { status: { in: ['approved', 'posted'] } },
      },
      orderBy: { journalEntry: { date: 'asc' } },
      select: { accountId: true, journalEntry: { select: { date: true } } },
    }),
  ])

  const latestReconciliationByAccount = new Map<string, Date>()
  const openReconciliationByAccount = new Map<string, { id: string; reconciliationId: string; periodEndDate: Date }>()
  for (const reconciliation of reconciliations) {
    const current = latestReconciliationByAccount.get(reconciliation.bankAccountId)
    if (!current || reconciliation.periodEndDate > current) {
      latestReconciliationByAccount.set(reconciliation.bankAccountId, reconciliation.periodEndDate)
    }
    const currentOpen = openReconciliationByAccount.get(reconciliation.bankAccountId)
    if (
      reconciliation.status === 'open'
      && (!currentOpen || reconciliation.periodEndDate > currentOpen.periodEndDate)
    ) {
      openReconciliationByAccount.set(reconciliation.bankAccountId, {
        id: reconciliation.id,
        reconciliationId: reconciliation.reconciliationId,
        periodEndDate: reconciliation.periodEndDate,
      })
    }
  }

  const firstBankActivityByAccount = new Map<string, Date>()
  for (const activity of firstBankActivity) {
    if (!firstBankActivityByAccount.has(activity.bankAccountId)) {
      firstBankActivityByAccount.set(activity.bankAccountId, activity.transactionDate)
    }
  }

  const firstGlActivityByGlAccount = new Map<string, Date>()
  for (const activity of firstGlActivity) {
    if (!firstGlActivityByGlAccount.has(activity.accountId)) {
      firstGlActivityByGlAccount.set(activity.accountId, activity.journalEntry.date)
    }
  }

  const currentMonthEnd = endOfMonth(new Date())
  const reconciliationOptions = await Promise.all(bankAccounts.map(async (account) => {
    const latestReconciliation = latestReconciliationByAccount.get(account.id)
    const openReconciliation = openReconciliationByAccount.get(account.id)
    const firstActivityCandidates = [
      firstBankActivityByAccount.get(account.id),
      firstGlActivityByGlAccount.get(account.glAccountId),
    ].filter((value): value is Date => Boolean(value))
    const firstActivity = firstActivityCandidates.sort((a, b) => a.getTime() - b.getTime())[0]
    const unmatched = unmatchedMap.get(account.id)
    const suggestedPeriodEnd = openReconciliation
      ? openReconciliation.periodEndDate
      : latestReconciliation
      ? nextMonthEnd(latestReconciliation)
      : firstActivity
        ? endOfMonth(firstActivity)
        : currentMonthEnd
    const periodReason = openReconciliation
      ? `Open workpaper exists (${openReconciliation.reconciliationId})`
      : latestReconciliation
      ? `Next month after last reconciliation (${formatDate(latestReconciliation)})`
      : firstActivity
        ? `First activity month (${formatDate(firstActivity)})`
        : 'No activity yet; defaults to current month end'
    const summary = await buildBankReconciliationSummary(account.id, suggestedPeriodEnd)

    return {
      id: account.id,
      label: `${account.bankAccountId} | ${account.name} | ${account.currency.code} | GL ${account.glAccount.accountNumber}`,
      searchText: `${account.bankAccountId} ${account.name} ${account.bankName} ${account.currency.code} ${account.glAccount.accountNumber} ${account.glAccount.name}`,
      bankName: account.bankName,
      glAccount: `${account.glAccount.accountNumber} ${account.glAccount.name}`,
      currencyCode: account.currency.code,
      unmatchedCount: unmatched?.count ?? 0,
      unmatchedAmount: money(unmatched?.amount ?? 0, account.currency.code),
      nextPeriodEndDate: dateInput(suggestedPeriodEnd),
      nextPeriodReason: periodReason,
      bankOpeningBalance: money(summary.bankOpeningBalance, account.currency.code),
      bankActivityAmount: money(summary.bankActivityAmount, account.currency.code),
      bankActivityAmountValue: summary.bankActivityAmount,
      bankEndingBalance: money(summary.bankStatementBalance, account.currency.code),
      bankEndingBalanceValue: summary.bankStatementBalance,
      glOpeningBalance: money(summary.glOpeningBalance, account.currency.code),
      glActivityAmount: money(summary.glActivityAmount, account.currency.code),
      glActivityAmountValue: summary.glActivityAmount,
      glEndingBalance: money(summary.glBalance, account.currency.code),
      glEndingBalanceValue: summary.glBalance,
      previewDifference: money(summary.difference, account.currency.code),
      previewDifferenceValue: summary.difference,
      bankLineCount: summary.periodTransactionCount,
      glLineCount: summary.glActivityLines.length,
      hasOpenReconciliation: Boolean(openReconciliation),
      openReconciliationId: openReconciliation?.id ?? '',
      openReconciliationNumber: openReconciliation?.reconciliationId ?? '',
      openReconciliationPeriodEnd: openReconciliation ? formatDate(openReconciliation.periodEndDate) : '',
    }
  }))

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Treasury</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Bank Reconciliations</h1>
        <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Monthly bank-to-GL reconciliation workspace. Statements, unmatched activity, timing differences, and AI review converge here.
        </p>
        </div>
        <a href="/bank-matching" className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}>
          Open Matching Workbench
        </a>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Bank Accounts" value={bankAccounts.length.toString()} />
        <SummaryCard label="Open Recons" value={openCount.toString()} />
        <SummaryCard label="Unmatched Lines" value={Array.from(unmatchedMap.values()).reduce((sum, row) => sum + row.count, 0).toString()} tone="warn" />
        <SummaryCard label="Total Difference" value={money(totalDifference, bankAccounts[0]?.currency.code ?? 'USD')} tone={Math.abs(totalDifference) < 0.01 ? 'good' : 'warn'} />
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="font-semibold text-white">Bank Account Readiness</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Use this to clear unmatched activity before certifying a period reconciliation.
          </p>
        </div>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
          {bankAccounts.map((account) => {
            const unmatched = unmatchedMap.get(account.id)
            return (
              <div key={account.id} className="border-b border-r p-4" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{account.name}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {account.bankName} | {account.currency.code} | GL {account.glAccount.accountNumber}
                    </p>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: unmatched?.count ? '#f59e0b' : '#22c55e', color: unmatched?.count ? '#fde68a' : '#bbf7d0' }}>
                    {unmatched?.count ?? 0} unmatched
                  </span>
                </div>
                <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Unmatched amount: {money(unmatched?.amount ?? 0, account.currency.code)}
                </p>
                <a href={`/bank-matching?bankAccountId=${account.id}`} className="mt-3 inline-flex text-xs font-semibold hover:underline" style={{ color: '#bfdbfe' }}>
                  Review activity
                </a>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-5">
        <BankReconciliationCreateForm bankAccounts={reconciliationOptions} />
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Reconciliation</th>
              <th className="px-4 py-3">Bank Account</th>
              <th className="px-4 py-3">Subsidiary</th>
              <th className="px-4 py-3">Period End</th>
              <th className="px-4 py-3">Bank Balance</th>
              <th className="px-4 py-3">GL Balance</th>
              <th className="px-4 py-3">Difference</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {reconciliations.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No bank reconciliations yet. Create them from month-end close once statements and GL balances are available.
                </td>
              </tr>
            ) : (
              reconciliations.map((reconciliation) => (
                <tr key={reconciliation.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  {(() => {
                    const displayStatus = reconciliationDisplayStatus(reconciliation)
                    return (
                      <>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{reconciliation.reconciliationId}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{reconciliation.bankAccount.glAccount.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-white">{reconciliation.bankAccount.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{reconciliation.subsidiary.subsidiaryId}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(reconciliation.periodEndDate)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{money(reconciliation.bankStatementBalance, reconciliation.bankAccount.currency.code)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{money(reconciliation.glBalance, reconciliation.bankAccount.currency.code)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: Math.abs(Number(reconciliation.difference)) < 0.01 ? '#86efac' : '#fecaca' }}>{money(reconciliation.difference, reconciliation.bankAccount.currency.code)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    <div>{reconciliation.aiReviewStatus}</div>
                    <div className="mt-1 max-w-xs truncate text-xs" style={{ color: 'var(--text-muted)' }}>{reconciliation.reviewerNotes ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: displayStatus.tone === 'good' ? '#22c55e' : '#f59e0b', color: displayStatus.tone === 'good' ? '#bbf7d0' : '#fde68a' }}>
                      {displayStatus.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/bank-reconciliations/${reconciliation.id}`}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold"
                      style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}
                    >
                      Open Workpaper
                    </a>
                  </td>
                      </>
                    )
                  })()}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const color = tone === 'good' ? '#86efac' : tone === 'warn' ? '#fde68a' : 'white'
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}
