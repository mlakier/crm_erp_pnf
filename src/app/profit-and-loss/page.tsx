import FinancialStatementReportView from '@/components/FinancialStatementReportView'
import { resolveFinancialStatementConsolidationContext } from '@/lib/consolidation-policy'
import { resolveFinancialStatementCurrencyLabel } from '@/lib/financial-statement-currency'
import { loadFinancialStatementCustomization } from '@/lib/financial-statement-customization-store'
import { buildFinancialStatementReport, type FinancialStatementAmountLayer } from '@/lib/financial-statement-report'
import { prisma } from '@/lib/prisma'

type SearchParams = {
  periodId?: string
  subsidiaryId?: string
  includeChildren?: string
  amountLayer?: string
  startDate?: string
  endDate?: string
  accountId?: string
  showAccountDetail?: string
}

function normalizeLayer(value: string | undefined): FinancialStatementAmountLayer {
  if (value === 'transaction' || value === 'local' || value === 'functional' || value === 'group') return value
  return 'functional'
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function startOfQuarter(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1))
}

function startOfYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [periods, subsidiaries, latestPnlActivityJournal] = await Promise.all([
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
      where: {
        status: { in: ['approved', 'posted'] },
        lineItems: {
          some: {
            account: {
              OR: [
                { accountType: { contains: 'Revenue' } },
                { accountType: { contains: 'Expense' } },
                { financialStatementSection: { contains: 'Revenue' } },
                { financialStatementSection: { contains: 'Income' } },
                { financialStatementSection: { contains: 'Expense' } },
                { financialStatementSection: { contains: 'Cost of Sales' } },
              ],
            },
          },
        },
      },
      select: { date: true },
      orderBy: { date: 'desc' },
    }),
  ])

  const dateFromLegacyParams = params.endDate ? new Date(params.endDate) : null
  const selectedPeriod =
    periods.find((period) => period.id === params.periodId)
    ?? (dateFromLegacyParams
      ? periods.find((period) => period.startDate <= dateFromLegacyParams && period.endDate >= dateFromLegacyParams)
      : null)
    ?? (latestPnlActivityJournal
      ? periods.find((period) => period.startDate <= latestPnlActivityJournal.date && period.endDate >= latestPnlActivityJournal.date)
      : null)
    ?? periods[0]
    ?? null
  const selectedMonthStart = selectedPeriod?.startDate ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
  const selectedMonthEnd = selectedPeriod?.endDate ?? new Date()
  const amountLayer = normalizeLayer(params.amountLayer)
  const includeChildren = params.includeChildren === 'true'
  const consolidationContext = await resolveFinancialStatementConsolidationContext({
    subsidiaryId: params.subsidiaryId || null,
    includeChildren,
    amountLayer,
  })
  const commonFilters = {
    statementType: 'profit_and_loss' as const,
    subsidiaryId: params.subsidiaryId || null,
    includeChildren,
    amountLayer: consolidationContext.effectiveAmountLayer,
    drillAccountId: params.accountId || null,
  }
  const [report, qtdReport, ytdReport, currencyLabel] = await Promise.all([
    buildFinancialStatementReport({
      ...commonFilters,
      startDate: dateOnly(selectedMonthStart),
      endDate: dateOnly(selectedMonthEnd),
    }),
    buildFinancialStatementReport({
      ...commonFilters,
      startDate: dateOnly(startOfQuarter(selectedMonthEnd)),
      endDate: dateOnly(selectedMonthEnd),
    }),
    buildFinancialStatementReport({
      ...commonFilters,
      startDate: dateOnly(startOfYear(selectedMonthEnd)),
      endDate: dateOnly(selectedMonthEnd),
    }),
    consolidationContext.currencyLabelOverride
      ?? resolveFinancialStatementCurrencyLabel({
        amountLayer: consolidationContext.effectiveAmountLayer,
        subsidiaryId: params.subsidiaryId || null,
        includeChildren,
      }),
  ])
  /*
  const report = await buildFinancialStatementReport({
    statementType: 'profit_and_loss',
    startDate,
    endDate,
    subsidiaryId: params.subsidiaryId || null,
    includeChildren: params.includeChildren === 'true',
    amountLayer: normalizeLayer(params.amountLayer),
    drillAccountId: params.accountId || null,
  })
  */
  const customization = await loadFinancialStatementCustomization(
    'profit_and_loss',
    report.sections.map((section) => ({
      label: section.section,
      groups: section.groups.map((group) => ({
        label: group.group,
        categories: group.categories.map((category) => category.category),
      })),
    })),
  )

  return (
    <FinancialStatementReportView
      title="Profit & Loss"
      subtitle="Revenue and expenses for the selected month, with MTD, QTD, and YTD columns driven from posted GL and account FS mapping."
      report={report}
      comparisonReports={[
        { key: 'mtd', label: 'MTD', report },
        { key: 'qtd', label: 'QTD', report: qtdReport },
        { key: 'ytd', label: 'YTD', report: ytdReport },
      ]}
      subsidiaries={subsidiaries.map((subsidiary) => ({
        id: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      }))}
      selectedSubsidiaryId={params.subsidiaryId || null}
      periods={periods.map((period) => ({ id: period.id, label: period.name }))}
      selectedPeriodId={selectedPeriod?.id ?? null}
      basePath="/profit-and-loss"
      customizeHref="/profit-and-loss/customize"
      showStartDate={false}
      dateMode="month"
      showAccountDetail={params.showAccountDetail === 'true'}
      customization={customization}
      currencyLabel={currencyLabel}
    />
  )
}
