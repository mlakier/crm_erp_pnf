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
  endDate?: string
  accountId?: string
  showAccountDetail?: string
}

function normalizeLayer(value: string | undefined): FinancialStatementAmountLayer {
  if (value === 'transaction' || value === 'local' || value === 'functional' || value === 'group') return value
  return 'functional'
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [periods, subsidiaries] = await Promise.all([
    prisma.accountingPeriod.findMany({
      select: { id: true, name: true, endDate: true },
      orderBy: [{ endDate: 'desc' }, { name: 'asc' }],
    }),
    prisma.subsidiary.findMany({
      where: { active: true },
      select: { id: true, subsidiaryId: true, name: true },
      orderBy: [{ subsidiaryId: 'asc' }],
    }),
  ])

  const selectedPeriod = periods.find((period) => period.id === params.periodId) ?? periods[0] ?? null
  const endDate =
    params.periodId && selectedPeriod
      ? selectedPeriod.endDate.toISOString().slice(0, 10)
      : params.endDate || selectedPeriod?.endDate.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10)
  const amountLayer = normalizeLayer(params.amountLayer)
  const includeChildren = params.includeChildren === 'true'
  const consolidationContext = await resolveFinancialStatementConsolidationContext({
    subsidiaryId: params.subsidiaryId || null,
    includeChildren,
    amountLayer,
  })
  const [report, currencyLabel] = await Promise.all([
    buildFinancialStatementReport({
    statementType: 'balance_sheet',
    endDate,
    subsidiaryId: params.subsidiaryId || null,
    includeChildren,
    amountLayer: consolidationContext.effectiveAmountLayer,
    drillAccountId: params.accountId || null,
    }),
    consolidationContext.currencyLabelOverride
      ?? resolveFinancialStatementCurrencyLabel({
        amountLayer: consolidationContext.effectiveAmountLayer,
        subsidiaryId: params.subsidiaryId || null,
        includeChildren,
      }),
  ])
  const customization = await loadFinancialStatementCustomization(
    'balance_sheet',
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
      title="Balance Sheet"
      subtitle="Assets, liabilities, and equity as of a selected date. This is the first ERP-grade reporting foundation pass, driven directly from posted GL and account FS mapping."
      report={report}
      subsidiaries={subsidiaries.map((subsidiary) => ({
        id: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      }))}
      selectedSubsidiaryId={params.subsidiaryId || null}
      periods={periods.map((period) => ({ id: period.id, label: period.name }))}
      selectedPeriodId={selectedPeriod?.id ?? null}
      basePath="/balance-sheet"
      customizeHref="/balance-sheet/customize"
      showStartDate={false}
      showAccountDetail={params.showAccountDetail === 'true'}
      customization={customization}
      currencyLabel={currencyLabel}
    />
  )
}
