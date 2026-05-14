import Link from 'next/link'
import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { fmtDateOnly, fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'

type ParsedPayload = {
  accountNumber?: string
  accountName?: string
  transactionCurrencyCode?: string
  transactionAmount?: number
  sourceLineCount?: number
  firstPostingDate?: string | null
  lastPostingDate?: string | null
  remaining?: {
    transactionAmount?: number
    localAmount?: number
    functionalAmount?: number
    groupAmount?: number
  }
  revaluedContext?: {
    originalLocalAmount?: number
    originalFunctionalAmount?: number
    originalGroupAmount?: number
    translationAudit?: {
      sourceSummary?: string
    }
  }
  remeasurementDeltas?: Array<{
    layer?: string
    currencyId?: string
    carryingAmount?: number
    revaluedAmount?: number
    delta?: number
  }>
  translationDeltas?: Array<{
    layer?: string
    currencyId?: string
    carryingAmount?: number
    revaluedAmount?: number
    delta?: number
  }>
  functionalNet?: number
  existingGroupNet?: number
  translatedGroupNet?: number
  groupDelta?: number
}

type RunItemRow = {
  id: string
  itemNumber: number
  itemType: string
  status: string
  message: string | null
  sourceRecordId: string | null
  resultPayloadJson: string | null
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function formatAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '-'
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatRunType(runType: string) {
  if (runType === 'fx_revaluation') return 'FX Remeasurement'
  if (runType === 'translation') return 'Currency Translation / CTA'
  return runType
}

function statusTone(status: string) {
  if (status === 'failed') return { color: 'var(--danger)', borderColor: 'var(--danger)' }
  if (status === 'completed_with_exceptions') return { color: 'var(--warning)', borderColor: 'var(--warning)' }
  return { color: 'var(--success)', borderColor: 'var(--success)' }
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p> : null}
    </div>
  )
}

function FxCalculationRows({ items }: { items: RunItemRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
            {['Item', 'Open Item', 'Status', 'Layer', 'Carrying', 'Remeasured', 'Delta', 'Message'].map((label) => (
              <th
                key={label}
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.flatMap((item) => {
            const payload = parseJson<ParsedPayload>(item.resultPayloadJson)
            const deltas = [
              ...(payload?.remeasurementDeltas ?? []),
              ...(payload?.translationDeltas ?? []),
            ]
            if (deltas.length === 0) {
              return [
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  <td className="px-4 py-3 text-sm text-white">{item.itemNumber}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.sourceRecordId ?? '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.status}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message ?? '-'}</td>
                </tr>,
              ]
            }
            return deltas.map((delta, index) => (
              <tr key={`${item.id}-${index}`} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <td className="px-4 py-3 text-sm text-white">{item.itemNumber}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.sourceRecordId ?? '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.status}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{delta.layer ?? '-'}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(delta.carryingAmount)}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(delta.revaluedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-white">{formatAmount(delta.delta)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message ?? '-'}</td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}

function GlBalanceCalculationRows({ items }: { items: RunItemRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
            {['Item', 'Account', 'Txn Balance', 'Layer', 'Carrying', 'Remeasured', 'Delta', 'Source Lines', 'Message'].map((label) => (
              <th
                key={label}
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.flatMap((item) => {
            const payload = parseJson<ParsedPayload>(item.resultPayloadJson)
            const deltas = [
              ...(payload?.remeasurementDeltas ?? []),
              ...(payload?.translationDeltas ?? []),
            ]
            const accountLabel = payload?.accountNumber || payload?.accountName
              ? `${payload?.accountNumber ?? ''}${payload?.accountNumber && payload?.accountName ? ' - ' : ''}${payload?.accountName ?? ''}`
              : (item.sourceRecordId ?? '-')
            const txnBalance = `${payload?.transactionCurrencyCode ?? ''} ${formatAmount(payload?.transactionAmount)}`.trim()
            if (deltas.length === 0) {
              return [
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  <td className="px-4 py-3 text-sm text-white">{item.itemNumber}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{accountLabel}</td>
                  <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{txnBalance || '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{payload?.sourceLineCount ?? '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message ?? '-'}</td>
                </tr>,
              ]
            }
            return deltas.map((delta, index) => (
              <tr key={`${item.id}-${index}`} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <td className="px-4 py-3 text-sm text-white">{item.itemNumber}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{accountLabel}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{txnBalance || '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{delta.layer ?? '-'}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(delta.carryingAmount)}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(delta.revaluedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-white">{formatAmount(delta.delta)}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{payload?.sourceLineCount ?? '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message ?? '-'}</td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}

function TranslationCalculationRows({ items }: { items: RunItemRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
            {['Item', 'Account', 'Status', 'Functional Net', 'Existing Group', 'Translated Group', 'CTA Delta', 'Message'].map((label) => (
              <th
                key={label}
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const payload = parseJson<ParsedPayload>(item.resultPayloadJson)
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <td className="px-4 py-3 text-sm text-white">{item.itemNumber}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.sourceRecordId ?? '-'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.status}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(payload?.functionalNet)}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(payload?.existingGroupNet)}</td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(payload?.translatedGroupNet)}</td>
                <td className="px-4 py-3 text-right text-sm text-white">{formatAmount(payload?.groupDelta)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message ?? '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function FxRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ moneySettings }, run] = await Promise.all([
    loadCompanyDisplaySettings(),
    prisma.runHeader.findUnique({
      where: { id },
      include: {
        accountingPeriod: { select: { name: true, startDate: true, endDate: true } },
        items: { orderBy: [{ itemNumber: 'asc' }] },
        outputLinks: {
          where: { outputRecordType: 'journal_entry' },
          select: { outputRecordId: true },
          take: 1,
        },
      },
    }),
  ])

  if (!run) notFound()

  const summary = parseJson<Record<string, unknown>>(run.summaryJson)
  const journalId = run.outputLinks[0]?.outputRecordId ?? (summary?.journalEntryId as string | undefined) ?? null
  const isTranslation = run.runType === 'translation'
  const openItemRows = run.items.filter((item) => item.itemType === 'open_item_revaluation')
  const glBalanceRows = run.items.filter((item) => item.itemType === 'gl_balance_revaluation')

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/fx-revaluation" className="text-sm text-blue-400 hover:underline">
            &lt;- Back to FX Remeasurement & Translation
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {formatRunType(run.runType)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{run.runNumber}</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            {run.message ?? 'Review the calculation details that produced this close run and its journal.'}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={statusTone(run.status)}
          >
            {run.status}
          </span>
          {journalId ? (
            <Link href={`/journals/${journalId}`} className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white">
              Open Journal
            </Link>
          ) : null}
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Requested" value={fmtDocumentDate(run.requestedAt, moneySettings)} />
        <SummaryCard label="As Of" value={run.asOfDate ? fmtDateOnly(run.asOfDate, moneySettings) : '-'} />
        <SummaryCard label="Period" value={run.accountingPeriod?.name ?? '-'} />
        <SummaryCard label="Items" value={`${run.items.length}`} helper="Calculation rows captured on the run." />
      </section>

      <section
        className="mb-6 overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Calculation Details
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {isTranslation
              ? 'Shows functional carrying balance, existing group balance, translated group balance, and CTA delta by account.'
              : 'Shows open-item subledger calculations first, then non-open-item monetary GL balances by account/currency.'}
          </p>
        </div>
        {isTranslation ? (
          <TranslationCalculationRows items={run.items} />
        ) : (
          <div className="space-y-6 p-5">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Open Item Calculations
              </h3>
              {openItemRows.length > 0 ? (
                <FxCalculationRows items={openItemRows} />
              ) : (
                <p className="rounded-xl border px-4 py-3 text-sm" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-muted)' }}>
                  No open-item balances were calculated for this run.
                </p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Non-Open-Item GL Balance Calculations
              </h3>
              {glBalanceRows.length > 0 ? (
                <GlBalanceCalculationRows items={glBalanceRows} />
              ) : (
                <p className="rounded-xl border px-4 py-3 text-sm" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-muted)' }}>
                  No eligible non-open-item monetary GL balances were calculated for this run.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Run Summary Payload
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Raw summary retained for auditability while the detail table provides the readable calculation path.
          </p>
        </div>
        <pre className="overflow-x-auto p-5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {JSON.stringify(summary ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  )
}
