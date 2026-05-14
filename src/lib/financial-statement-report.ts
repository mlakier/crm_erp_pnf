import { prisma } from '@/lib/prisma'
import { toNumericValue } from '@/lib/format'
import { resolveSubsidiaryScope } from '@/lib/subsidiary-scope'

export type FinancialStatementType = 'balance_sheet' | 'profit_and_loss'
export type FinancialStatementAmountLayer = 'transaction' | 'local' | 'functional' | 'group'

type AmountLike =
  | number
  | string
  | null
  | undefined
  | {
      toString(): string
      toNumber?: () => number
    }

type LineWithAccount = Awaited<ReturnType<typeof loadStatementLines>>[number]

export type FinancialStatementAccountRow = {
  accountId: string
  accountNumber: string
  accountName: string
  accountType: string
  fsSection: string
  fsGroup: string
  fsCategory: string
  amount: number
  lineCount: number
  missingMapping: boolean
}

export type FinancialStatementSection = {
  section: string
  amount: number
  groups: Array<{
    group: string
    amount: number
    categories: Array<{
      category: string
      amount: number
      accounts: FinancialStatementAccountRow[]
    }>
  }>
}

export type FinancialStatementDrillLine = {
  journalEntryId: string
  journalNumber: string
  journalDate: Date
  accountId: string
  accountNumber: string
  accountName: string
  amount: number
  debit: number
  credit: number
  description: string | null
  journalDescription: string | null
  sourceType: string | null
  sourceId: string | null
}

export type FinancialStatementReport = {
  statementType: FinancialStatementType
  amountLayer: FinancialStatementAmountLayer
  startDate: Date | null
  endDate: Date
  subsidiaryIds: string[]
  includeChildren: boolean
  sections: FinancialStatementSection[]
  rows: FinancialStatementAccountRow[]
  drillLines: FinancialStatementDrillLine[]
  missingMappingAccounts: FinancialStatementAccountRow[]
  missingLayerLineCount: number
  totals: {
    assets: number
    liabilities: number
    equity: number
    revenue: number
    expenses: number
    netIncome: number
    balanceCheck: number
  }
}

function normalizeDateOnly(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function getLayerAmounts(line: {
  debit: AmountLike
  credit: AmountLike
  localDebit: AmountLike
  localCredit: AmountLike
  functionalDebit: AmountLike
  functionalCredit: AmountLike
  groupDebit: AmountLike
  groupCredit: AmountLike
}, amountLayer: FinancialStatementAmountLayer) {
  switch (amountLayer) {
    case 'local':
      return { debit: line.localDebit, credit: line.localCredit }
    case 'functional':
      return { debit: line.functionalDebit, credit: line.functionalCredit }
    case 'group':
      return { debit: line.groupDebit, credit: line.groupCredit }
    case 'transaction':
    default:
      return { debit: line.debit, credit: line.credit }
  }
}

function signedAmountForNormalBalance(
  line: {
    debit: AmountLike
    credit: AmountLike
    localDebit: AmountLike
    localCredit: AmountLike
    functionalDebit: AmountLike
    functionalCredit: AmountLike
    groupDebit: AmountLike
    groupCredit: AmountLike
    account: { normalBalance: string | null }
  },
  amountLayer: FinancialStatementAmountLayer,
) {
  const layer = getLayerAmounts(line, amountLayer)
  const debit = toNumericValue(layer.debit, 0)
  const credit = toNumericValue(layer.credit, 0)
  const missingSelectedLayer =
    amountLayer !== 'transaction'
    && layer.debit == null
    && layer.credit == null
    && (toNumericValue(line.debit, 0) !== 0 || toNumericValue(line.credit, 0) !== 0)

  const normalBalance = String(line.account.normalBalance ?? 'debit').trim().toLowerCase()
  const amount = normalBalance === 'credit' ? credit - debit : debit - credit

  return { amount, debit, credit, missingSelectedLayer }
}

function isBalanceSheetAccount(accountType: string, fsSection: string | null | undefined) {
  const text = `${accountType} ${fsSection ?? ''}`.toLowerCase()
  return text.includes('asset') || text.includes('liability') || text.includes('equity') || text.includes('balance sheet')
}

function isProfitAndLossAccount(accountType: string, fsSection: string | null | undefined) {
  const text = `${accountType} ${fsSection ?? ''}`.toLowerCase()
  return (
    text.includes('revenue')
    || text.includes('income')
    || text.includes('expense')
    || text.includes('cost of goods')
    || text.includes('p&l')
    || text.includes('profit')
  )
}

function defaultSection(accountType: string, statementType: FinancialStatementType) {
  const type = accountType.toLowerCase()
  if (statementType === 'balance_sheet') {
    if (type.includes('asset')) return 'Assets'
    if (type.includes('liability')) return 'Liabilities'
    if (type.includes('equity')) return 'Equity'
    return 'Unmapped Balance Sheet'
  }
  if (type.includes('revenue') || type.includes('income')) return 'Revenue'
  if (type.includes('cost of sales') || type.includes('cost of goods')) return 'Cost of Sales'
  if (type.includes('expense')) return 'Expenses'
  return 'Unmapped P&L'
}

function normalizeStatementSection(
  rawSection: string | null | undefined,
  accountType: string,
  statementType: FinancialStatementType,
) {
  const section = rawSection?.trim()
  const normalized = section?.toLowerCase()
  if (
    !section
    || normalized === 'balance sheet'
    || normalized === 'income statement'
    || normalized === 'profit and loss'
    || normalized === 'p&l'
    || normalized === 'pnl'
  ) {
    return defaultSection(accountType, statementType)
  }
  return section
}

function sectionSortValue(section: string) {
  const normalized = section.toLowerCase()
  if (normalized.includes('asset')) return 10
  if (normalized.includes('liabil')) return 20
  if (normalized.includes('equity')) return 30
  if (normalized.includes('revenue') || normalized.includes('income')) return 40
  if (normalized.includes('cost of sales') || normalized.includes('cost of goods')) return 50
  if (normalized.includes('expense')) return 60
  return 90
}

function groupSortValue(group: string) {
  const normalized = group.toLowerCase()
  if (normalized.includes('current asset')) return 10
  if (normalized.includes('long-term asset') || normalized.includes('non-current asset')) return 20
  if (normalized.includes('current liabil')) return 30
  if (normalized.includes('long-term liabil') || normalized.includes('non-current liabil')) return 40
  if (normalized.includes('equity')) return 50
  if (normalized.includes('revenue')) return 60
  if (normalized.includes('cost of sales') || normalized.includes('cost of goods')) return 70
  if (normalized.includes('operating expense')) return 80
  if (normalized.includes('other income') || normalized.includes('other expense')) return 90
  if (normalized.includes('tax')) return 100
  return 900
}

function categorySortValue(category: string) {
  const normalized = category.toLowerCase()
  if (normalized === 'cash' || normalized.includes('cash and cash equivalent')) return 10
  if (normalized.includes('accounts receivable')) return 20
  if (normalized.includes('inventory')) return 30
  if (normalized.includes('prepaid')) return 40
  if (normalized.includes('contract asset')) return 50
  if (normalized.includes('other current asset')) return 60
  if (normalized.includes('fixed asset')) return 70
  if (normalized.includes('accumulated depreciation') || normalized.includes('accumulated amortization')) return 80
  if (normalized.includes('accounts payable')) return 110
  if (normalized.includes('accrued')) return 120
  if (normalized.includes('tax payable')) return 130
  if (normalized.includes('deferred revenue')) return 140
  if (normalized.includes('debt')) return 150
  if (normalized.includes('common stock')) return 210
  if (normalized.includes('paid-in capital')) return 220
  if (normalized.includes('retained earnings')) return 230
  if (normalized.includes('cta')) return 240
  if (normalized.includes('product revenue')) return 310
  if (normalized.includes('service revenue')) return 320
  if (normalized.includes('subscription revenue')) return 330
  if (normalized.includes('contra revenue') || normalized.includes('discount')) return 340
  if (normalized.includes('cost of goods')) return 410
  if (normalized.includes('payroll')) return 510
  if (normalized.includes('rent')) return 520
  if (normalized.includes('professional')) return 530
  if (normalized.includes('depreciation') || normalized.includes('amortization')) return 540
  if (normalized.includes('interest')) return 610
  if (normalized.includes('fx')) return 620
  if (normalized.includes('tax expense')) return 700
  return 900
}

async function resolveSubsidiaryIds(subsidiaryId: string | null, includeChildren: boolean) {
  if (!subsidiaryId) return []
  if (!includeChildren) return [subsidiaryId]
  const scope = await resolveSubsidiaryScope(subsidiaryId, true)
  return scope.map((subsidiary) => subsidiary.id)
}

async function loadStatementLines(filters: {
  statementType: FinancialStatementType
  subsidiaryIds: string[]
  startDate: Date | null
  endDate: Date
}) {
  return prisma.journalEntryLineItem.findMany({
    where: {
      journalEntry: {
        date: filters.startDate ? { gte: filters.startDate, lte: filters.endDate } : { lte: filters.endDate },
        status: { in: ['approved', 'posted'] },
        ...(filters.subsidiaryIds.length > 0 ? { subsidiaryId: { in: filters.subsidiaryIds } } : {}),
      },
      account: {
        active: true,
        isPosting: true,
      },
    },
    select: {
      id: true,
      description: true,
      debit: true,
      credit: true,
      localDebit: true,
      localCredit: true,
      functionalDebit: true,
      functionalCredit: true,
      groupDebit: true,
      groupCredit: true,
      account: {
        select: {
          id: true,
          accountNumber: true,
          name: true,
          accountType: true,
          normalBalance: true,
          financialStatementSection: true,
          financialStatementGroup: true,
          financialStatementCategory: true,
        },
      },
      journalEntry: {
        select: {
          id: true,
          number: true,
          date: true,
          description: true,
          sourceType: true,
          sourceId: true,
        },
      },
    },
    orderBy: [
      { account: { accountNumber: 'asc' } },
      { journalEntry: { date: 'asc' } },
      { journalEntry: { number: 'asc' } },
      { displayOrder: 'asc' },
    ],
  })
}

function includeLineForStatement(line: LineWithAccount, statementType: FinancialStatementType) {
  if (statementType === 'balance_sheet') {
    return isBalanceSheetAccount(line.account.accountType, line.account.financialStatementSection)
  }
  return isProfitAndLossAccount(line.account.accountType, line.account.financialStatementSection)
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function buildSections(rows: FinancialStatementAccountRow[]) {
  const sectionsByName = new Map<string, FinancialStatementSection>()

  for (const row of rows) {
    const section = sectionsByName.get(row.fsSection) ?? {
      section: row.fsSection,
      amount: 0,
      groups: [],
    }
    section.amount = roundMoney(section.amount + row.amount)

    let group = section.groups.find((entry) => entry.group === row.fsGroup)
    if (!group) {
      group = { group: row.fsGroup, amount: 0, categories: [] }
      section.groups.push(group)
    }
    group.amount = roundMoney(group.amount + row.amount)

    let category = group.categories.find((entry) => entry.category === row.fsCategory)
    if (!category) {
      category = { category: row.fsCategory, amount: 0, accounts: [] }
      group.categories.push(category)
    }
    category.amount = roundMoney(category.amount + row.amount)
    category.accounts.push(row)

    sectionsByName.set(row.fsSection, section)
  }

  return Array.from(sectionsByName.values())
    .sort((a, b) => sectionSortValue(a.section) - sectionSortValue(b.section) || a.section.localeCompare(b.section))
    .map((section) => ({
      ...section,
      groups: section.groups
        .sort((a, b) => groupSortValue(a.group) - groupSortValue(b.group) || a.group.localeCompare(b.group))
        .map((group) => ({
          ...group,
          categories: group.categories
            .sort((a, b) => categorySortValue(a.category) - categorySortValue(b.category) || a.category.localeCompare(b.category))
            .map((category) => ({
              ...category,
              accounts: category.accounts.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
            })),
        })),
    }))
}

export async function buildFinancialStatementReport(filters: {
  statementType: FinancialStatementType
  startDate?: Date | string | null
  endDate: Date | string
  subsidiaryId?: string | null
  includeChildren?: boolean
  amountLayer?: FinancialStatementAmountLayer
  drillAccountId?: string | null
}): Promise<FinancialStatementReport> {
  const endDate = normalizeDateOnly(filters.endDate)
  if (!endDate) throw new Error('A valid statement end date is required.')
  const startDate = filters.statementType === 'profit_and_loss' ? normalizeDateOnly(filters.startDate) : null
  if (filters.statementType === 'profit_and_loss' && !startDate) {
    throw new Error('A valid P&L start date is required.')
  }

  const amountLayer = filters.amountLayer ?? 'functional'
  const subsidiaryIds = await resolveSubsidiaryIds(filters.subsidiaryId ?? null, filters.includeChildren === true)
  const lines = await loadStatementLines({
    statementType: filters.statementType,
    subsidiaryIds,
    startDate,
    endDate,
  })

  const rowsByAccount = new Map<string, FinancialStatementAccountRow>()
  const drillLines: FinancialStatementDrillLine[] = []
  let missingLayerLineCount = 0

  for (const line of lines) {
    if (!includeLineForStatement(line, filters.statementType)) continue
    const { amount, debit, credit, missingSelectedLayer } = signedAmountForNormalBalance(line, amountLayer)
    if (missingSelectedLayer) missingLayerLineCount += 1
    if (Math.abs(amount) < 0.005) continue

    const missingMapping = !line.account.financialStatementSection || !line.account.financialStatementGroup || !line.account.financialStatementCategory
    const fsSection = normalizeStatementSection(line.account.financialStatementSection, line.account.accountType, filters.statementType)
    const fsGroup = line.account.financialStatementGroup?.trim() || 'Unmapped'
    const fsCategory = line.account.financialStatementCategory?.trim() || 'Unmapped'
    const existing = rowsByAccount.get(line.account.id)
    if (existing) {
      existing.amount = roundMoney(existing.amount + amount)
      existing.lineCount += 1
    } else {
      rowsByAccount.set(line.account.id, {
        accountId: line.account.id,
        accountNumber: line.account.accountNumber,
        accountName: line.account.name,
        accountType: line.account.accountType,
        fsSection,
        fsGroup,
        fsCategory,
        amount,
        lineCount: 1,
        missingMapping,
      })
    }

    if (filters.drillAccountId && filters.drillAccountId === line.account.id) {
      drillLines.push({
        journalEntryId: line.journalEntry.id,
        journalNumber: line.journalEntry.number,
        journalDate: line.journalEntry.date,
        accountId: line.account.id,
        accountNumber: line.account.accountNumber,
        accountName: line.account.name,
        amount,
        debit,
        credit,
        description: line.description,
        journalDescription: line.journalEntry.description,
        sourceType: line.journalEntry.sourceType,
        sourceId: line.journalEntry.sourceId,
      })
    }
  }

  const rows = Array.from(rowsByAccount.values())
    .map((row) => ({ ...row, amount: roundMoney(row.amount) }))
    .filter((row) => Math.abs(row.amount) >= 0.005)
    .sort((a, b) => (
      sectionSortValue(a.fsSection) - sectionSortValue(b.fsSection)
      || a.fsSection.localeCompare(b.fsSection)
      || groupSortValue(a.fsGroup) - groupSortValue(b.fsGroup)
      || a.fsGroup.localeCompare(b.fsGroup)
      || categorySortValue(a.fsCategory) - categorySortValue(b.fsCategory)
      || a.fsCategory.localeCompare(b.fsCategory)
      || a.accountNumber.localeCompare(b.accountNumber)
    ))

  const sections = buildSections(rows)
  const totals = rows.reduce(
    (aggregate, row) => {
      const section = row.fsSection.toLowerCase()
      const type = row.accountType.toLowerCase()
      if (section.includes('asset') || type.includes('asset')) aggregate.assets += row.amount
      else if (section.includes('liabil') || type.includes('liability')) aggregate.liabilities += row.amount
      else if (section.includes('equity') || type.includes('equity')) aggregate.equity += row.amount
      else if (section.includes('revenue') || section.includes('income') || type.includes('revenue') || type.includes('income')) aggregate.revenue += row.amount
      else if (section.includes('expense') || section.includes('cost of goods') || type.includes('expense')) aggregate.expenses += row.amount
      return aggregate
    },
    {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0,
      netIncome: 0,
      balanceCheck: 0,
    },
  )
  totals.assets = roundMoney(totals.assets)
  totals.liabilities = roundMoney(totals.liabilities)
  totals.equity = roundMoney(totals.equity)
  totals.revenue = roundMoney(totals.revenue)
  totals.expenses = roundMoney(totals.expenses)
  totals.netIncome = roundMoney(totals.revenue - totals.expenses)
  totals.balanceCheck = roundMoney(totals.assets - totals.liabilities - totals.equity)

  return {
    statementType: filters.statementType,
    amountLayer,
    startDate,
    endDate,
    subsidiaryIds,
    includeChildren: filters.includeChildren === true,
    sections,
    rows,
    drillLines,
    missingMappingAccounts: rows.filter((row) => row.missingMapping),
    missingLayerLineCount,
    totals,
  }
}
