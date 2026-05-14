import { Prisma } from '@prisma/client'
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

type FinancialStatementFactRow = {
  lineItemId: string
  journalEntryId: string
  journalNumber: string
  journalDate: Date
  journalDescription: string | null
  sourceType: string | null
  sourceId: string | null
  accountId: string
  accountNumber: string
  accountName: string
  accountType: string
  normalBalance: string | null
  financialStatementSection: string | null
  financialStatementGroup: string | null
  financialStatementCategory: string | null
  lineDescription: string | null
  transactionDebit: AmountLike
  transactionCredit: AmountLike
  localDebit: AmountLike
  localCredit: AmountLike
  functionalDebit: AmountLike
  functionalCredit: AmountLike
  groupDebit: AmountLike
  groupCredit: AmountLike
  transactionAmount: AmountLike
  localAmount: AmountLike
  functionalAmount: AmountLike
  groupAmount: AmountLike
  missingLocalLayer: boolean
  missingFunctionalLayer: boolean
  missingGroupLayer: boolean
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

function getLayerAmounts(line: FinancialStatementFactRow, amountLayer: FinancialStatementAmountLayer) {
  switch (amountLayer) {
    case 'local':
      return { amount: line.localAmount, debit: line.localDebit, credit: line.localCredit, missingSelectedLayer: line.missingLocalLayer }
    case 'functional':
      return { amount: line.functionalAmount, debit: line.functionalDebit, credit: line.functionalCredit, missingSelectedLayer: line.missingFunctionalLayer }
    case 'group':
      return { amount: line.groupAmount, debit: line.groupDebit, credit: line.groupCredit, missingSelectedLayer: line.missingGroupLayer }
    case 'transaction':
    default:
      return { amount: line.transactionAmount, debit: line.transactionDebit, credit: line.transactionCredit, missingSelectedLayer: false }
  }
}

function signedAmountForNormalBalance(line: FinancialStatementFactRow, amountLayer: FinancialStatementAmountLayer) {
  const layer = getLayerAmounts(line, amountLayer)
  const debit = toNumericValue(layer.debit, 0)
  const credit = toNumericValue(layer.credit, 0)
  const amount = toNumericValue(layer.amount, 0)

  return { amount, debit, credit, missingSelectedLayer: layer.missingSelectedLayer }
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
  const statementPredicate = filters.statementType === 'balance_sheet'
    ? Prisma.sql`(
        lower(fact."account_type") LIKE '%asset%'
        OR lower(fact."account_type") LIKE '%liabil%'
        OR lower(fact."account_type") LIKE '%equity%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%asset%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%liabil%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%equity%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%balance sheet%'
      )`
    : Prisma.sql`(
        lower(fact."account_type") LIKE '%revenue%'
        OR lower(fact."account_type") LIKE '%income%'
        OR lower(fact."account_type") LIKE '%expense%'
        OR lower(fact."account_type") LIKE '%cost of goods%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%revenue%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%income%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%expense%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%cost of goods%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%p&l%'
        OR lower(COALESCE(fact."financial_statement_section", '')) LIKE '%profit%'
      )`
  const datePredicate = filters.startDate
    ? Prisma.sql`fact."journal_date" BETWEEN ${filters.startDate} AND ${filters.endDate}`
    : Prisma.sql`fact."journal_date" <= ${filters.endDate}`
  const subsidiaryPredicate = filters.subsidiaryIds.length > 0
    ? Prisma.sql`AND fact."journal_subsidiary_id" IN (${Prisma.join(filters.subsidiaryIds)})`
    : Prisma.empty

  return prisma.$queryRaw<FinancialStatementFactRow[]>`
    SELECT
      fact."journal_entry_line_item_id" AS "lineItemId",
      fact."journal_entry_id" AS "journalEntryId",
      fact."journal_number" AS "journalNumber",
      fact."journal_date" AS "journalDate",
      fact."journal_description" AS "journalDescription",
      fact."source_type" AS "sourceType",
      fact."source_id" AS "sourceId",
      fact."account_id" AS "accountId",
      fact."account_number" AS "accountNumber",
      fact."account_name" AS "accountName",
      fact."account_type" AS "accountType",
      fact."normal_balance" AS "normalBalance",
      fact."financial_statement_section" AS "financialStatementSection",
      fact."financial_statement_group" AS "financialStatementGroup",
      fact."financial_statement_category" AS "financialStatementCategory",
      fact."line_description" AS "lineDescription",
      fact."transaction_debit" AS "transactionDebit",
      fact."transaction_credit" AS "transactionCredit",
      fact."local_debit" AS "localDebit",
      fact."local_credit" AS "localCredit",
      fact."functional_debit" AS "functionalDebit",
      fact."functional_credit" AS "functionalCredit",
      fact."group_debit" AS "groupDebit",
      fact."group_credit" AS "groupCredit",
      fact."transaction_amount" AS "transactionAmount",
      fact."local_amount" AS "localAmount",
      fact."functional_amount" AS "functionalAmount",
      fact."group_amount" AS "groupAmount",
      fact."missing_local_layer" AS "missingLocalLayer",
      fact."missing_functional_layer" AS "missingFunctionalLayer",
      fact."missing_group_layer" AS "missingGroupLayer"
    FROM "financial_statement_line_facts" fact
    WHERE ${datePredicate}
      AND fact."journal_status" IN ('approved', 'posted')
      AND fact."account_active" = true
      AND fact."account_is_posting" = true
      ${subsidiaryPredicate}
      AND ${statementPredicate}
    ORDER BY fact."account_number" ASC, fact."journal_date" ASC, fact."journal_number" ASC, fact."display_order" ASC
  `
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
    const { amount, debit, credit, missingSelectedLayer } = signedAmountForNormalBalance(line, amountLayer)
    if (missingSelectedLayer) missingLayerLineCount += 1
    if (Math.abs(amount) < 0.005) continue

    const missingMapping = !line.financialStatementSection || !line.financialStatementGroup || !line.financialStatementCategory
    const fsSection = normalizeStatementSection(line.financialStatementSection, line.accountType, filters.statementType)
    const fsGroup = line.financialStatementGroup?.trim() || 'Unmapped'
    const fsCategory = line.financialStatementCategory?.trim() || 'Unmapped'
    const existing = rowsByAccount.get(line.accountId)
    if (existing) {
      existing.amount = roundMoney(existing.amount + amount)
      existing.lineCount += 1
    } else {
      rowsByAccount.set(line.accountId, {
        accountId: line.accountId,
        accountNumber: line.accountNumber,
        accountName: line.accountName,
        accountType: line.accountType,
        fsSection,
        fsGroup,
        fsCategory,
        amount,
        lineCount: 1,
        missingMapping,
      })
    }

    if (filters.drillAccountId && filters.drillAccountId === line.accountId) {
      drillLines.push({
        journalEntryId: line.journalEntryId,
        journalNumber: line.journalNumber,
        journalDate: line.journalDate,
        accountId: line.accountId,
        accountNumber: line.accountNumber,
        accountName: line.accountName,
        amount,
        debit,
        credit,
        description: line.lineDescription,
        journalDescription: line.journalDescription,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
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
