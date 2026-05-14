import Link from 'next/link'

import FinancialStatementFilters from '@/components/FinancialStatementFilters'
import {
  slugSectionId,
  type FinancialStatementCustomizationConfig,
} from '@/lib/financial-statement-customization'
import type { FinancialStatementReport } from '@/lib/financial-statement-report'
import { fmtDateOnly } from '@/lib/format'

type Option = {
  id: string
  label: string
}

function formatAmount(value: number) {
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `(${formatted})` : formatted
}

function dateInputValue(value: Date | null | undefined) {
  if (!value) return ''
  return value.toISOString().slice(0, 10)
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}

function rowSearchText(row: FinancialStatementReport['rows'][number]) {
  return `${row.accountType} ${row.fsSection} ${row.fsGroup} ${row.fsCategory} ${row.accountName}`.toLowerCase()
}

function sumRows(rows: FinancialStatementReport['rows'], predicate: (row: FinancialStatementReport['rows'][number]) => boolean) {
  return Math.round(rows.filter(predicate).reduce((sum, row) => sum + row.amount, 0) * 100) / 100
}

function buildProfitAndLossMetrics(report: FinancialStatementReport) {
  const revenue = sumRows(report.rows, (row) => {
    const text = rowSearchText(row)
    return !text.includes('other (income) expense') && (row.accountType.toLowerCase().includes('revenue') || row.fsSection.toLowerCase().includes('revenue'))
  })
  const costOfSales = sumRows(report.rows, (row) => {
    const text = rowSearchText(row)
    return includesAny(text, ['cost of sales', 'cost of goods', 'cogs', 'deferred cost amortization'])
  })
  const depreciationAndAmortization = sumRows(report.rows, (row) => {
    const text = rowSearchText(row)
    return includesAny(text, ['depreciation', 'amortization']) && !text.includes('deferred cost amortization')
  })
  const excludedFromOperatingExpense = [
    'cost of sales',
    'cost of goods',
    'cogs',
    'deferred cost amortization',
    'depreciation',
    'amortization',
    'interest',
    'tax',
    'realized',
    'unrealized',
    'fx',
    'other (income) expense',
  ]
  const operatingExpenses = sumRows(report.rows, (row) => {
    const text = rowSearchText(row)
    return row.accountType.toLowerCase().includes('expense') && !includesAny(text, excludedFromOperatingExpense)
  })
  const incomeTax = sumRows(report.rows, (row) => {
    const text = rowSearchText(row)
    return row.accountType.toLowerCase().includes('expense') && includesAny(text, ['income tax', 'tax expense'])
  })
  const totalExpenses = sumRows(report.rows, (row) => row.accountType.toLowerCase().includes('expense'))
  const grossMargin = Math.round((revenue - costOfSales) * 100) / 100
  const ebitda = Math.round((grossMargin - operatingExpenses) * 100) / 100
  const ebit = Math.round((ebitda - depreciationAndAmortization) * 100) / 100
  const netIncome = Math.round((revenue - totalExpenses) * 100) / 100
  const ebt = Math.round((netIncome + incomeTax) * 100) / 100

  return { grossMargin, ebitda, ebit, ebt, netIncome }
}

const statementAmountRowBaseClass = 'mx-auto grid w-full gap-2'

function profitAndLossMetricValue(
  metrics: ReturnType<typeof buildProfitAndLossMetrics> | undefined,
  metricId: string,
) {
  if (!metrics) return 0
  const metricById: Record<string, number> = {
    'gross-margin': metrics.grossMargin,
    ebitda: metrics.ebitda,
    ebit: metrics.ebit,
    ebt: metrics.ebt,
    'net-income': metrics.netIncome,
  }
  return metricById[metricId] ?? 0
}

export default function FinancialStatementReportView({
  title,
  subtitle,
  report,
  comparisonReports,
  subsidiaries,
  selectedSubsidiaryId,
  periods,
  selectedPeriodId,
  basePath,
  customizeHref,
  showStartDate,
  dateMode,
  showAccountDetail,
  customization,
  currencyLabel,
}: {
  title: string
  subtitle: string
  report: FinancialStatementReport
  comparisonReports?: Array<{ key: string; label: string; report: FinancialStatementReport }>
  subsidiaries: Option[]
  selectedSubsidiaryId: string | null
  periods: Option[]
  selectedPeriodId: string | null
  basePath: string
  customizeHref: string
  showStartDate: boolean
  dateMode?: 'asOf' | 'range' | 'month'
  showAccountDetail: boolean
  customization: FinancialStatementCustomizationConfig
  currencyLabel: string
}) {
  const amountColumns = comparisonReports && comparisonReports.length > 0
    ? comparisonReports
    : [{ key: 'primary', label: report.statementType === 'balance_sheet'
      ? fmtDateOnly(report.endDate)
      : `${fmtDateOnly(report.startDate)} - ${fmtDateOnly(report.endDate)}`, report }]
  const statementAmountRowClass = `${statementAmountRowBaseClass} ${amountColumns.length > 1 ? 'max-w-[46rem]' : 'max-w-[34rem]'}`
  const statementAmountRowStyle = {
    gridTemplateColumns: `minmax(0,1fr) repeat(${amountColumns.length}, 7.5rem)`,
  }
  const queryBase = new URLSearchParams({
    ...(selectedPeriodId ? { periodId: selectedPeriodId } : {}),
    ...(selectedSubsidiaryId ? { subsidiaryId: selectedSubsidiaryId } : {}),
    ...(report.includeChildren ? { includeChildren: 'true' } : {}),
    ...(showAccountDetail ? { showAccountDetail: 'true' } : {}),
    amountLayer: report.amountLayer,
    ...(report.startDate ? { startDate: dateInputValue(report.startDate) } : {}),
    endDate: dateInputValue(report.endDate),
  })

  function drillHref(accountId: string) {
    const params = new URLSearchParams(queryBase)
    params.set('accountId', accountId)
    return `${basePath}?${params.toString()}`
  }

  const statementLabel = report.statementType === 'balance_sheet' ? 'Balance Sheet' : 'Profit & Loss'
  const layerName = {
    transaction: 'transaction',
    local: 'local',
    functional: 'functional',
    group: 'group',
  }[report.amountLayer]
  const hasLayerIssue = report.missingLayerLineCount > 0
  const hasMappingIssue = report.missingMappingAccounts.length > 0
  const profitAndLossMetrics = report.statementType === 'profit_and_loss' ? buildProfitAndLossMetrics(report) : null
  const sectionConfigById = new Map(customization.sections.map((section) => [section.id, section]))
  const orderedSections = report.sections
    .map((section, originalIndex) => {
      const config = sectionConfigById.get(slugSectionId(section.section))
      return {
        section,
        config,
        order: config?.order ?? 10_000 + originalIndex,
        visible: config?.visible ?? true,
        showHeader: config?.showHeader ?? true,
        showTotal: config?.showTotal ?? true,
      }
    })
    .sort((a, b) => a.order - b.order || a.section.section.localeCompare(b.section.section))

  function configuredGroups(section: FinancialStatementReport['sections'][number], sectionId: string) {
    const sectionConfig = sectionConfigById.get(sectionId)
    const groupConfigById = new Map((sectionConfig?.groups ?? []).map((group) => [group.id, group]))
    return section.groups
      .map((group, originalIndex) => {
        const config = groupConfigById.get(slugSectionId(group.group))
        return {
          group,
          config,
          order: config?.order ?? 10_000 + originalIndex,
          visible: config?.visible ?? true,
          showHeader: config?.showHeader ?? true,
          showTotal: config?.showTotal ?? true,
        }
      })
      .sort((a, b) => a.order - b.order || a.group.group.localeCompare(b.group.group))
  }

  function configuredCategories(
    group: FinancialStatementReport['sections'][number]['groups'][number],
    sectionId: string,
    groupId: string,
  ) {
    const sectionConfig = sectionConfigById.get(sectionId)
    const groupConfig = sectionConfig?.groups.find((entry) => entry.id === groupId)
    const categoryConfigById = new Map((groupConfig?.categories ?? []).map((category) => [category.id, category]))
    return group.categories
      .map((category, originalIndex) => {
        const config = categoryConfigById.get(slugSectionId(category.category))
        return {
          category,
          config,
          order: config?.order ?? 10_000 + originalIndex,
          visible: config?.visible ?? true,
          showHeader: config?.showHeader ?? true,
          showTotal: config?.showTotal ?? true,
        }
      })
      .filter((entry) => entry.visible)
      .sort((a, b) => a.order - b.order || a.category.category.localeCompare(b.category.category))
  }

  function amountForAccount(columnReport: FinancialStatementReport, accountId: string) {
    return columnReport.rows.find((row) => row.accountId === accountId)?.amount ?? 0
  }

  function amountForCategory(columnReport: FinancialStatementReport, section: string, group: string, category: string) {
    return columnReport.rows
      .filter((row) => row.fsSection === section && row.fsGroup === group && row.fsCategory === category)
      .reduce((sum, row) => sum + row.amount, 0)
  }

  function amountForGroup(columnReport: FinancialStatementReport, section: string, group: string) {
    return columnReport.rows
      .filter((row) => row.fsSection === section && row.fsGroup === group)
      .reduce((sum, row) => sum + row.amount, 0)
  }

  function amountForSection(columnReport: FinancialStatementReport, section: string) {
    return columnReport.rows
      .filter((row) => row.fsSection === section)
      .reduce((sum, row) => sum + row.amount, 0)
  }

  function amountCells(getAmount: (columnReport: FinancialStatementReport) => number, className = 'text-right') {
    return amountColumns.map((column) => (
      <span key={column.key} className={className}>
        {formatAmount(getAmount(column.report))}
      </span>
    ))
  }

  function renderCalculatedRows(afterSectionId: string | null) {
    if (!profitAndLossMetrics) return []
    const metricByColumn = new Map(amountColumns.map((column) => [column.key, buildProfitAndLossMetrics(column.report)]))

    return (customization.calculatedRows ?? [])
      .filter((row) => row.visible && row.afterSectionId === afterSectionId)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
      .map((row) => (
        <div key={`calculated-${row.id}`} className={`${statementAmountRowClass} py-0.5 text-sm font-semibold leading-5 text-white`} style={statementAmountRowStyle}>
          <span>{row.label}</span>
          {amountColumns.map((column) => (
            <span key={column.key} className="text-right">
              {formatAmount(profitAndLossMetricValue(metricByColumn.get(column.key), row.id))}
            </span>
          ))}
        </div>
      ))
  }

  return (
    <div className="mx-auto min-h-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 max-w-3xl text-xs" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
        <Link
          href={customizeHref}
          className="rounded-lg border px-3 py-2 text-xs font-semibold text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          Customize
        </Link>
      </div>

      <FinancialStatementFilters
        basePath={basePath}
        periods={periods}
        subsidiaries={subsidiaries}
        selectedPeriodId={selectedPeriodId}
        selectedSubsidiaryId={selectedSubsidiaryId}
        startDate={report.startDate}
        endDate={report.endDate}
        amountLayer={report.amountLayer}
        includeChildren={report.includeChildren}
        showAccountDetail={showAccountDetail}
        showStartDate={showStartDate}
        dateMode={dateMode}
      />

      {(hasMappingIssue || hasLayerIssue) ? (
        <section
          className="mb-6 rounded-2xl border px-5 py-4 text-sm"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'var(--warning)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--warning)' }}>
            Reporting Guardrails
          </h2>
          {hasMappingIssue ? (
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              {report.missingMappingAccounts.length} account{report.missingMappingAccounts.length === 1 ? '' : 's'} need FS mapping review.
            </p>
          ) : null}
          {hasLayerIssue ? (
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              {report.missingLayerLineCount} journal line{report.missingLayerLineCount === 1 ? '' : 's'} are missing {layerName} amount-layer values. The report is using only lines with populated {layerName} amounts; fix the source posting/FX layer backfill before relying on this layer for close reporting.
            </p>
          ) : null}
        </section>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold uppercase tracking-wide text-white">
            {statementLabel}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {showAccountDetail ? 'Click an account amount to review the journal lines behind it.' : 'Turn on account detail above to review posting accounts under each category.'}
          </p>
          <div className={`${statementAmountRowClass} mt-6 text-[11px] font-bold uppercase tracking-wide`} style={{ ...statementAmountRowStyle, color: 'var(--text-secondary)' }}>
            <span />
            {amountColumns.map((column) => (
              <span key={column.key} className="text-right underline underline-offset-4">
                {column.label} <span className="ml-1">{currencyLabel}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          {orderedSections.map(({ section, visible: sectionVisible, showHeader, showTotal }) => {
            const sectionId = slugSectionId(section.section)
            const groups = configuredGroups(section, sectionId).map((groupEntry) => {
              const groupId = slugSectionId(groupEntry.group.group)
              const categories = configuredCategories(groupEntry.group, sectionId, groupId)
              return {
                ...groupEntry,
                groupId,
                categories,
              }
            }).filter((groupEntry) => (
              groupEntry.categories.length > 0 || (groupEntry.visible && (groupEntry.showHeader || groupEntry.showTotal))
            ))
            const calculatedRows = renderCalculatedRows(sectionId)
            const hasSectionChrome = sectionVisible && (showHeader || showTotal)
            return (
            <div key={section.section}>
              {groups.length > 0 || (sectionVisible && (showHeader || showTotal)) ? (
                <div className={hasSectionChrome ? 'px-5 py-2' : 'px-5 py-0.5'}>
              {sectionVisible && showHeader ? (
                    <div className={`${statementAmountRowClass} py-0.5 text-sm font-semibold text-white`} style={statementAmountRowStyle}>
                      <h3>{section.section}</h3>
                    </div>
                  ) : null}
              {groups.map(({ group, categories, visible, showHeader: showGroupHeader, showTotal: showGroupTotal }) => {
                const hasGroupChrome = visible && (showGroupHeader || showGroupTotal)
                return (
                <div key={`${section.section}-${group.group}`} className={hasGroupChrome ? 'mt-1.5' : 'mt-0'}>
                  {visible && showGroupHeader ? (
                    <div className={`${statementAmountRowClass} py-0.5 pl-4 text-xs font-semibold`} style={{ ...statementAmountRowStyle, color: 'var(--text-secondary)' }}>
                      <span>{group.group}</span>
                    </div>
                  ) : null}
                  {categories.map(({ category, showHeader: showCategoryHeader, showTotal: showCategoryTotal }) => {
                    const shouldShowCategoryHeader = showCategoryHeader || (!showAccountDetail && !showCategoryTotal)
                    const categoryIndentClass = (sectionVisible && showHeader) || (visible && showGroupHeader) ? 'pl-8' : 'pl-4'
                    const accountIndentClass = categoryIndentClass === 'pl-8' ? 'pl-12' : 'pl-8'
                    return (
                    <div key={`${section.section}-${group.group}-${category.category}`}>
                      {shouldShowCategoryHeader ? (
                        <div className={`${statementAmountRowClass} py-0.5 ${categoryIndentClass} text-xs`} style={{ ...statementAmountRowStyle, color: 'var(--text-secondary)' }}>
                          <span>{category.category}</span>
                          {amountCells((columnReport) => amountForCategory(columnReport, section.section, group.group, category.category))}
                        </div>
                      ) : null}
                      {showAccountDetail ? (
                        category.accounts.map((account) => (
                          <div key={account.accountId} className={`${statementAmountRowClass} py-0.5 ${accountIndentClass} text-xs`} style={{ ...statementAmountRowStyle, color: 'var(--text-secondary)' }}>
                            <div>
                              <Link href={`/chart-of-accounts/${account.accountId}`} className="text-blue-400 hover:underline">
                                {account.accountNumber}
                              </Link>
                              <span className="ml-2">{account.accountName}</span>
                              {account.missingMapping ? (
                                <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px]" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                                  mapping
                                </span>
                              ) : null}
                            </div>
                            {amountColumns.map((column) => (
                              <Link key={column.key} href={drillHref(account.accountId)} className="text-right font-semibold text-blue-400 hover:underline">
                                {formatAmount(amountForAccount(column.report, account.accountId))}
                              </Link>
                            ))}
                          </div>
                        ))
                      ) : null}
                      {showCategoryTotal ? (
                        <div className={`${statementAmountRowClass} py-0.5 ${categoryIndentClass} text-xs font-semibold text-white`} style={statementAmountRowStyle}>
                          <span>Total {category.category}</span>
                          {amountCells((columnReport) => amountForCategory(columnReport, section.section, group.group, category.category))}
                        </div>
                      ) : null}
                    </div>
                  )})}
                  {visible && showGroupTotal ? (
                    <div className={`${statementAmountRowClass} py-0.5 pl-4 text-xs font-semibold text-white`} style={statementAmountRowStyle}>
                      <span>Total {group.group}</span>
                      {amountCells((columnReport) => amountForGroup(columnReport, section.section, group.group))}
                    </div>
                  ) : null}
                </div>
              )})}
              {sectionVisible && showTotal ? (
                <div className={`${statementAmountRowClass} py-0.5 text-sm font-semibold text-white`} style={statementAmountRowStyle}>
                  <span>Total {section.section}</span>
                  {amountCells((columnReport) => amountForSection(columnReport, section.section))}
                </div>
              ) : null}
                </div>
              ) : null}
              {calculatedRows.length > 0 ? (
                <div className="px-5 py-0.5">
                  {calculatedRows}
                </div>
              ) : null}
            </div>
          )})}
          {report.statementType === 'balance_sheet' ? (
            <div className="px-5 pb-4 pt-1">
              <div className={`${statementAmountRowClass} py-0.5 text-sm font-semibold text-white`} style={statementAmountRowStyle}>
                <span>Total Liabilities & Equity</span>
                {amountCells((columnReport) => columnReport.totals.liabilities + columnReport.totals.equity)}
              </div>
              <div className={`${statementAmountRowClass} py-0.5 text-xs font-semibold`} style={{ ...statementAmountRowStyle, color: report.totals.balanceCheck === 0 ? 'var(--success)' : 'var(--warning)' }}>
                <span>Balance Check</span>
                {amountCells((columnReport) => columnReport.totals.balanceCheck)}
              </div>
            </div>
          ) : null}
          {profitAndLossMetrics ? (
            <div className="px-5 pb-4 pt-1">
              {renderCalculatedRows(null)}
            </div>
          ) : null}
        </div>
      </section>

      {report.drillLines.length > 0 ? (
        <section
          className="mt-6 overflow-hidden rounded-2xl border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Drill Lines
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  {['Date', 'Journal', 'Description', 'Debit', 'Credit', 'Amount'].map((label) => (
                    <th key={label} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.drillLines.map((line) => (
                  <tr key={`${line.journalEntryId}-${line.accountId}-${line.amount}-${line.journalDate.toISOString()}`} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDateOnly(line.journalDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/journals/${line.journalEntryId}`} className="text-blue-400 hover:underline">
                        {line.journalNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{line.description ?? line.journalDescription ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(line.debit)}</td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{formatAmount(line.credit)}</td>
                    <td className="px-4 py-3 text-right text-sm text-white">{formatAmount(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
