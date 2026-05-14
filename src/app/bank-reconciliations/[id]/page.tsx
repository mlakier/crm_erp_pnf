import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { buildBankReconciliationSummary } from '@/lib/bank-reconciliation-summary'
import BankReconciliationResolutionActions from '@/components/BankReconciliationResolutionActions'

function money(amount: unknown, code: string) {
  return `${code} ${Number(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function shortRecord(type: string | null | undefined, id: string | null | undefined) {
  if (!type && !id) return '-'
  return [type, id].filter(Boolean).join(' | ')
}

function recordKey(type: string | null | undefined, id: string | null | undefined) {
  if (!type || !id) return ''
  return `${type.replace(/-/g, '_')}:${id}`.toLowerCase()
}

function recordKeyAliases(type: string | null | undefined, id: string | null | undefined) {
  const key = recordKey(type, id)
  if (!key) return []
  const aliases = [key]
  if (type === 'cash_receipt') aliases.push(recordKey('invoice-receipt', id))
  if (type === 'invoice-receipt') aliases.push(recordKey('cash_receipt', id))
  return aliases
}

function matchedLabel(value: boolean) {
  return value ? 'Matched' : 'Open'
}

function reconciliationDisplayStatus(status: string, difference: number, unmatchedCount: number) {
  if (status === 'reconciled') return { label: 'Closed', tone: 'good' as const }
  if (Math.abs(difference) < 0.01 && unmatchedCount === 0) return { label: 'Ready to Close', tone: 'good' as const }
  return { label: 'Open', tone: 'warn' as const }
}

export default async function BankReconciliationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reconciliation = await prisma.bankReconciliation.findUnique({
    where: { id },
    include: {
      bankAccount: { include: { currency: true, glAccount: true } },
      subsidiary: true,
    },
  })

  if (!reconciliation) notFound()

  const summary = await buildBankReconciliationSummary(reconciliation.bankAccountId, reconciliation.periodEndDate)
  const code = reconciliation.bankAccount.currency.code
  const storedStatementBalance = Number(reconciliation.bankStatementBalance)
  const displayedBankEnding = reconciliation.bankStatementBalance != null
    ? storedStatementBalance
    : summary.bankStatementBalance
  const storedDifference = storedStatementBalance - summary.glBalance
  const displayStatus = reconciliationDisplayStatus(reconciliation.status, storedDifference, summary.unmatchedCount)
  const glBankFeedSourceIds = summary.glActivityLines
    .filter((line) => line.journalEntry.sourceType === 'bank-feed-transaction' && line.journalEntry.sourceId)
    .map((line) => line.journalEntry.sourceId as string)
  const matchedGlBankFeedSources = glBankFeedSourceIds.length
    ? await prisma.bankFeedTransaction.findMany({
      where: {
        id: { in: glBankFeedSourceIds },
        status: 'matched',
      },
      select: { id: true },
    })
    : []
  const matchedGlKeys = new Set(
    [
      ...summary.bankActivityLines.flatMap((line) => {
      if (line.status !== 'matched') return []
      return [
        ...recordKeyAliases(line.matchedRecordType, line.matchedRecordId),
        recordKey('journal_entry', line.matchedRecordId),
        recordKey('bank-feed-transaction', line.id),
      ].filter(Boolean)
      }),
      ...matchedGlBankFeedSources.map((line) => recordKey('bank-feed-transaction', line.id)),
    ],
  )

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/bank-reconciliations" className="text-sm font-semibold hover:underline" style={{ color: '#93c5fd' }}>
            &lt;- Back to Bank Reconciliations
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Bank Reconciliation Workpaper</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{reconciliation.reconciliationId}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {reconciliation.bankAccount.name} | {reconciliation.bankAccount.bankName} | GL {reconciliation.bankAccount.glAccount.accountNumber} | {reconciliation.subsidiary.subsidiaryId}
          </p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <BankReconciliationResolutionActions
            id={reconciliation.id}
            bankAccountId={reconciliation.bankAccountId}
            currencyCode={code}
            bankStatementBalance={storedStatementBalance.toFixed(2)}
            difference={storedDifference.toFixed(2)}
            status={reconciliation.status}
            unmatchedCount={summary.unmatchedCount}
          />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <MetricCard label="Period" value={`${formatDate(summary.periodStartDate)} - ${formatDate(summary.periodEndDate)}`} />
        <MetricCard label="Status" value={displayStatus.label} tone={displayStatus.tone} />
        <MetricCard label="Bank Ending" value={money(displayedBankEnding, code)} />
        <MetricCard label="GL Ending" value={money(summary.glBalance, code)} />
        <MetricCard
          label="Difference"
          value={money(storedDifference, code)}
          tone={Math.abs(storedDifference) < 0.01 ? 'good' : 'warn'}
        />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <ResolutionCard
          label="Unmatched Bank Lines"
          value={summary.unmatchedCount.toString()}
          description={summary.unmatchedCount ? 'Resolve these in bank matching before close.' : 'All bank feed lines through this period are matched.'}
          tone={summary.unmatchedCount ? 'warn' : 'good'}
          href={`/bank-matching?bankAccountId=${reconciliation.bankAccountId}`}
          action={summary.unmatchedCount ? 'Open matching' : 'Review matching'}
        />
        <ResolutionCard
          label="Statement Source"
          value={summary.statementBalanceSource === 'statement' ? 'Imported statement' : 'Manual / estimated'}
          description={summary.statementId ? 'A bank statement record was found for this period.' : 'No imported statement record is linked; using the workpaper balance/estimate.'}
          tone={summary.statementId ? 'good' : 'warn'}
        />
        <ResolutionCard
          label="Difference"
          value={money(storedDifference, code)}
          description={Math.abs(storedDifference) < 0.01 ? 'Ready to close once reviewed.' : 'Investigate bank timing, missing GL postings, or statement balance.'}
          tone={Math.abs(storedDifference) < 0.01 ? 'good' : 'warn'}
        />
      </div>

      <div className="rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-lg font-semibold text-white">Activity Summary</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Bank activity is reviewed on the left, GL activity on the right. Each side shows its own walkforward and matched status.
          </p>
        </div>
        <div className="grid gap-0 xl:grid-cols-2">
          <ActivitySide
            title="Bank"
            subtitle={`${summary.periodTransactionCount} bank lines in period. Matched: ${summary.matchedCount}. Open/suggested: ${summary.unmatchedCount}.`}
            opening={summary.bankOpeningBalance}
            activity={summary.bankActivityAmount}
            ending={displayedBankEnding}
            code={code}
            empty="No bank activity for this period."
            columns={['Date', 'Description', 'Counterparty', 'Amount', 'Matched', 'Matched Record']}
            rows={summary.bankActivityLines.map((line) => [
              formatDate(line.transactionDate),
              line.description,
              line.counterparty ?? '-',
              money(line.amount, code),
              matchedLabel(line.status === 'matched'),
              shortRecord(line.matchedRecordType, line.matchedRecordId),
            ])}
          />
          <ActivitySide
            title="GL"
            subtitle={`Posted/approved journal lines hitting GL ${reconciliation.bankAccount.glAccount.accountNumber} during the period.`}
            opening={summary.glOpeningBalance}
            activity={summary.glActivityAmount}
            ending={summary.glBalance}
            code={code}
            empty="No GL activity for this period."
            columns={['Date', 'Journal', 'Description', 'Debit', 'Credit', 'Net', 'Matched']}
            rows={summary.glActivityLines.map((line) => {
              const source = shortRecord(line.journalEntry.sourceType, line.journalEntry.sourceId)
              const isMatched = matchedGlKeys.has(recordKey('journal_entry', line.journalEntry.id))
                || matchedGlKeys.has(recordKey(line.journalEntry.sourceType, line.journalEntry.sourceId))
              return [
                formatDate(line.journalEntry.date),
                line.journalEntry.number,
                line.description ?? line.journalEntry.sourceType ?? '-',
                money(line.debit, code),
                money(line.credit, code),
                money(Number(line.debit) - Number(line.credit), code),
                source === '-' ? 'No source' : matchedLabel(isMatched),
              ]
            })}
          />
        </div>
        <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="grid gap-3 md:grid-cols-3">
            <DifferencePill label="Opening Difference" value={summary.bankOpeningBalance - summary.glOpeningBalance} code={code} />
            <DifferencePill label="Activity Difference" value={summary.bankActivityAmount - summary.glActivityAmount} code={code} />
            <DifferencePill label="Ending Difference" value={storedDifference} code={code} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const color = tone === 'good' ? '#86efac' : tone === 'warn' ? '#fecaca' : 'white'
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 text-lg font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function ResolutionCard({
  label,
  value,
  description,
  tone,
  href,
  action,
}: {
  label: string
  value: string
  description: string
  tone: 'good' | 'warn'
  href?: string
  action?: string
}) {
  const color = tone === 'good' ? '#86efac' : '#fde68a'
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: tone === 'good' ? '#22c55e' : '#f59e0b' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 text-xl font-semibold" style={{ color }}>{value}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      {href && action ? (
        <Link href={href} className="mt-3 inline-flex text-xs font-semibold hover:underline" style={{ color: '#bfdbfe' }}>
          {action}
        </Link>
      ) : null}
    </div>
  )
}

function DifferencePill({ label, value, code }: { label: string; value: number; code: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: Math.abs(value) < 0.01 ? '#22c55e' : '#f59e0b' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 font-semibold" style={{ color: Math.abs(value) < 0.01 ? '#86efac' : '#fde68a' }}>{money(value, code)}</p>
    </div>
  )
}

function ActivitySide({
  title,
  subtitle,
  opening,
  activity,
  ending,
  code,
  columns,
  rows,
  empty,
}: {
  title: string
  subtitle: string
  opening: number
  activity: number
  ending: number
  code: string
  columns: string[]
  rows: string[][]
  empty: string
}) {
  return (
    <div className="border-b p-5 xl:border-b-0 xl:border-r" style={{ borderColor: 'var(--border-muted)' }}>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <SideMetric label="Opening" value={money(opening, code)} />
        <SideMetric label="Activity" value={money(activity, code)} />
        <SideMetric label="Ending" value={money(ending, code)} strong />
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0" style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>{empty}</td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="whitespace-nowrap px-4 py-3" style={{ color: cell === 'Matched' ? '#86efac' : cell === 'Open' || cell === 'No source' ? '#fde68a' : cellIndex === 1 ? 'white' : 'var(--text-secondary)' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SideMetric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className={`mt-1 ${strong ? 'font-semibold text-white' : ''}`} style={{ color: strong ? undefined : 'var(--text-secondary)' }}>{value}</p>
    </div>
  )
}
