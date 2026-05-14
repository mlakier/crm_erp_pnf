import type { FinancialStatementReport } from '@/lib/financial-statement-report'

export type DerivedStatementLine = {
  label: string
  amount: number
  level?: 0 | 1 | 2
  emphasis?: 'normal' | 'subtotal' | 'total'
}

export type DerivedStatementSection = {
  label: string
  lines: DerivedStatementLine[]
  total: number
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function textForRow(row: FinancialStatementReport['rows'][number]) {
  return `${row.accountType} ${row.fsSection} ${row.fsGroup} ${row.fsCategory} ${row.accountName}`.toLowerCase()
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}

function sumRows(report: FinancialStatementReport, predicate: (row: FinancialStatementReport['rows'][number]) => boolean) {
  return roundMoney(report.rows.filter(predicate).reduce((sum, row) => sum + row.amount, 0))
}

function amountByAccount(report: FinancialStatementReport) {
  return new Map(report.rows.map((row) => [row.accountId, row]))
}

function rowAmount(report: FinancialStatementReport, accountId: string) {
  return amountByAccount(report).get(accountId)?.amount ?? 0
}

function balanceSheetMovement(opening: FinancialStatementReport, ending: FinancialStatementReport, predicate: (row: FinancialStatementReport['rows'][number]) => boolean) {
  return ending.rows
    .filter(predicate)
    .map((endingRow) => ({
      row: endingRow,
      openingAmount: rowAmount(opening, endingRow.accountId),
      endingAmount: endingRow.amount,
      movement: roundMoney(endingRow.amount - rowAmount(opening, endingRow.accountId)),
    }))
    .filter((entry) => Math.abs(entry.movement) >= 0.005)
}

export function buildProfitAndLossSummary(report: FinancialStatementReport) {
  const revenue = sumRows(report, (row) => {
    const text = textForRow(row)
    return !text.includes('other (income) expense') && (row.accountType.toLowerCase().includes('revenue') || row.fsSection.toLowerCase().includes('revenue'))
  })
  const costOfSales = sumRows(report, (row) => includesAny(textForRow(row), ['cost of sales', 'cost of goods', 'cogs', 'deferred cost amortization']))
  const depreciationAndAmortization = sumRows(report, (row) => includesAny(textForRow(row), ['depreciation', 'amortization']) && !textForRow(row).includes('deferred cost amortization'))
  const incomeTax = sumRows(report, (row) => row.accountType.toLowerCase().includes('expense') && includesAny(textForRow(row), ['income tax', 'tax expense']))
  const totalExpenses = sumRows(report, (row) => row.accountType.toLowerCase().includes('expense'))
  const grossMargin = roundMoney(revenue - costOfSales)
  const netIncome = roundMoney(revenue - totalExpenses)
  const ebt = roundMoney(netIncome + incomeTax)

  return {
    revenue,
    costOfSales,
    grossMargin,
    depreciationAndAmortization,
    incomeTax,
    ebt,
    netIncome,
  }
}

function isCash(row: FinancialStatementReport['rows'][number]) {
  const category = row.fsCategory.toLowerCase()
  return row.accountType.toLowerCase().includes('asset')
    && (category === 'cash' || category.includes('cash and cash equivalent'))
}

function isOperatingAsset(row: FinancialStatementReport['rows'][number]) {
  const text = textForRow(row)
  return row.accountType.toLowerCase().includes('asset')
    && !isCash(row)
    && includesAny(text, ['current assets', 'accounts receivable', 'inventory', 'prepaid', 'deferred tax assets', 'other current assets', 'intercompany receivable'])
}

function isOperatingLiability(row: FinancialStatementReport['rows'][number]) {
  const text = textForRow(row)
  return row.accountType.toLowerCase().includes('liability')
    && includesAny(text, ['current liabilities', 'accounts payable', 'accrued', 'deferred revenue', 'credit card', 'intercompany payable', 'other current liabilities'])
}

function isInvestingAsset(row: FinancialStatementReport['rows'][number]) {
  const text = textForRow(row)
  return row.accountType.toLowerCase().includes('asset')
    && !isCash(row)
    && includesAny(text, ['non-current assets', 'fixed assets', 'intangible', 'goodwill', 'investment', 'notes receivable', 'other non-current assets'])
}

function isFinancingRow(row: FinancialStatementReport['rows'][number]) {
  const text = textForRow(row)
  return row.accountType.toLowerCase().includes('equity')
    || includesAny(text, ['notes payable', 'debt', 'loan', 'non-current liabilities'])
}

function movementLine(label: string, amount: number): DerivedStatementLine {
  return { label, amount: roundMoney(amount), level: 1 }
}

export function buildIndirectCashFlowStatement({
  openingBalanceSheet,
  endingBalanceSheet,
  profitAndLoss,
}: {
  openingBalanceSheet: FinancialStatementReport
  endingBalanceSheet: FinancialStatementReport
  profitAndLoss: FinancialStatementReport
}) {
  const pnl = buildProfitAndLossSummary(profitAndLoss)
  const operatingLines: DerivedStatementLine[] = [
    { label: 'Net income', amount: pnl.netIncome, level: 0 },
    { label: 'Depreciation and amortization', amount: pnl.depreciationAndAmortization, level: 1 },
  ]

  for (const entry of balanceSheetMovement(openingBalanceSheet, endingBalanceSheet, isOperatingAsset)) {
    operatingLines.push(movementLine(`Change in ${entry.row.fsCategory}`, -entry.movement))
  }
  for (const entry of balanceSheetMovement(openingBalanceSheet, endingBalanceSheet, isOperatingLiability)) {
    operatingLines.push(movementLine(`Change in ${entry.row.fsCategory}`, entry.movement))
  }

  const investingLines = balanceSheetMovement(openingBalanceSheet, endingBalanceSheet, isInvestingAsset)
    .map((entry) => movementLine(`Change in ${entry.row.fsCategory}`, -entry.movement))
  const financingLines = balanceSheetMovement(openingBalanceSheet, endingBalanceSheet, isFinancingRow)
    .map((entry) => movementLine(`Change in ${entry.row.fsCategory}`, entry.movement))

  const operatingTotalBeforeTieOut = roundMoney(operatingLines.reduce((sum, line) => sum + line.amount, 0))
  const investingTotal = roundMoney(investingLines.reduce((sum, line) => sum + line.amount, 0))
  const financingTotal = roundMoney(financingLines.reduce((sum, line) => sum + line.amount, 0))
  const openingCash = sumRows(openingBalanceSheet, isCash)
  const endingCash = sumRows(endingBalanceSheet, isCash)
  const cashChange = roundMoney(endingCash - openingCash)
  const explainedChange = roundMoney(operatingTotalBeforeTieOut + investingTotal + financingTotal)
  const residual = roundMoney(cashChange - explainedChange)
  if (Math.abs(residual) >= 0.005) {
    operatingLines.push({
      label: 'Unclassified balance sheet movement',
      amount: residual,
      level: 1,
      emphasis: 'subtotal',
    })
  }

  const operatingTotal = roundMoney(operatingLines.reduce((sum, line) => sum + line.amount, 0))
  const sections: DerivedStatementSection[] = [
    { label: 'Cash Flows From Operating Activities', lines: operatingLines, total: operatingTotal },
    { label: 'Cash Flows From Investing Activities', lines: investingLines, total: investingTotal },
    { label: 'Cash Flows From Financing Activities', lines: financingLines, total: financingTotal },
  ]

  return {
    sections,
    openingCash,
    endingCash,
    cashChange,
    netCashProvided: roundMoney(operatingTotal + investingTotal + financingTotal),
  }
}

export function buildRetainedEarningsStatement({
  openingBalanceSheet,
  endingBalanceSheet,
  profitAndLoss,
}: {
  openingBalanceSheet: FinancialStatementReport
  endingBalanceSheet: FinancialStatementReport
  profitAndLoss: FinancialStatementReport
}) {
  const pnl = buildProfitAndLossSummary(profitAndLoss)
  const openingRetainedEarnings = sumRows(openingBalanceSheet, (row) => textForRow(row).includes('retained earnings'))
  const endingRetainedEarnings = sumRows(endingBalanceSheet, (row) => textForRow(row).includes('retained earnings'))
  const openingDividends = sumRows(openingBalanceSheet, (row) => includesAny(textForRow(row), ['dividend', 'distribution']))
  const endingDividends = sumRows(endingBalanceSheet, (row) => includesAny(textForRow(row), ['dividend', 'distribution']))
  const dividends = roundMoney(endingDividends - openingDividends)
  const calculatedEndingRetainedEarnings = roundMoney(openingRetainedEarnings + pnl.netIncome - dividends)
  const glTieOut = roundMoney(endingRetainedEarnings - calculatedEndingRetainedEarnings)

  return {
    lines: [
      { label: 'Beginning retained earnings', amount: openingRetainedEarnings, emphasis: 'subtotal' as const },
      { label: 'Net income', amount: pnl.netIncome },
      { label: 'Less dividends and distributions', amount: -dividends },
      { label: 'Calculated ending retained earnings', amount: calculatedEndingRetainedEarnings, emphasis: 'subtotal' as const },
      { label: 'Retained earnings per GL', amount: endingRetainedEarnings },
      { label: 'Unclosed current-period earnings / tie-out', amount: glTieOut, emphasis: 'total' as const },
    ],
    endingRetainedEarnings,
    calculatedEndingRetainedEarnings,
    glTieOut,
  }
}
