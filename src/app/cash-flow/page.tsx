import DerivedFinancialStatementView from '@/components/DerivedFinancialStatementView'
import { buildIndirectCashFlowStatement } from '@/lib/derived-financial-statements'
import { resolveFinancialStatementCurrencyLabel } from '@/lib/financial-statement-currency'
import { buildFinancialStatementReport, type FinancialStatementAmountLayer } from '@/lib/financial-statement-report'
import { prisma } from '@/lib/prisma'

type SearchParams = {
  periodId?: string
  subsidiaryId?: string
  includeChildren?: string
  amountLayer?: string
}

function normalizeLayer(value: string | undefined): FinancialStatementAmountLayer {
  if (value === 'transaction' || value === 'local' || value === 'functional' || value === 'group') return value
  return 'functional'
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function dayBefore(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() - 1))
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [periods, subsidiaries, latestJournal] = await Promise.all([
    prisma.accountingPeriod.findMany({
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: [{ endDate: 'desc' }, { name: 'asc' }],
    }),
    prisma.subsidiary.findMany({
      where: { active: true },
      select: { id: true, subsidiaryId: true, name: true },
      orderBy: [{ subsidiaryId: 'asc' }],
    }),
    prisma.journalEntry.findFirst({
      where: { status: { in: ['approved', 'posted'] } },
      select: { date: true },
      orderBy: { date: 'desc' },
    }),
  ])

  const selectedPeriod =
    periods.find((period) => period.id === params.periodId)
    ?? (latestJournal
      ? periods.find((period) => period.startDate <= latestJournal.date && period.endDate >= latestJournal.date)
      : null)
    ?? periods[0]
    ?? null
  const startDate = selectedPeriod?.startDate ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
  const endDate = selectedPeriod?.endDate ?? new Date()
  const amountLayer = normalizeLayer(params.amountLayer)
  const commonFilters = {
    subsidiaryId: params.subsidiaryId || null,
    includeChildren: params.includeChildren === 'true',
    amountLayer,
  }
  const [openingBalanceSheet, endingBalanceSheet, profitAndLoss, currencyLabel] = await Promise.all([
    buildFinancialStatementReport({
      statementType: 'balance_sheet',
      endDate: dateOnly(dayBefore(startDate)),
      ...commonFilters,
    }),
    buildFinancialStatementReport({
      statementType: 'balance_sheet',
      endDate: dateOnly(endDate),
      ...commonFilters,
    }),
    buildFinancialStatementReport({
      statementType: 'profit_and_loss',
      startDate: dateOnly(startDate),
      endDate: dateOnly(endDate),
      ...commonFilters,
    }),
    resolveFinancialStatementCurrencyLabel({
      amountLayer,
      subsidiaryId: params.subsidiaryId || null,
      includeChildren: params.includeChildren === 'true',
    }),
  ])
  const statement = buildIndirectCashFlowStatement({
    openingBalanceSheet,
    endingBalanceSheet,
    profitAndLoss,
  })
  const guardrailCount =
    openingBalanceSheet.missingLayerLineCount + endingBalanceSheet.missingLayerLineCount + profitAndLoss.missingLayerLineCount
  const tieOut = Math.round((statement.netCashProvided - statement.cashChange + Number.EPSILON) * 100) / 100

  return (
    <DerivedFinancialStatementView
      title="Indirect Cash Flow"
      subtitle="Cash movement for the selected month using the indirect method: net income, non-cash addbacks, working-capital movement, investing activity, and financing activity."
      statementLabel="Indirect Cash Flow Statement"
      amountHeading={selectedPeriod?.name ?? dateOnly(endDate)}
      currencyLabel={currencyLabel}
      basePath="/cash-flow"
      periods={periods.map((period) => ({ id: period.id, label: period.name }))}
      subsidiaries={subsidiaries.map((subsidiary) => ({
        id: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      }))}
      selectedPeriodId={selectedPeriod?.id ?? null}
      selectedSubsidiaryId={params.subsidiaryId || null}
      startDate={startDate}
      endDate={endDate}
      amountLayer={amountLayer}
      includeChildren={params.includeChildren === 'true'}
      sections={statement.sections}
      footerLines={[
        { label: 'Net increase / (decrease) in cash', amount: statement.netCashProvided, emphasis: 'total' },
        { label: 'Beginning cash', amount: statement.openingCash },
        { label: 'Ending cash', amount: statement.endingCash, emphasis: 'total' },
        ...(Math.abs(tieOut) >= 0.005 ? [{ label: 'Cash flow tie-out difference', amount: tieOut, emphasis: 'subtotal' as const }] : []),
      ]}
      guardrail={guardrailCount > 0 ? `${guardrailCount} journal lines are missing the selected amount layer.` : null}
    />
  )
}
