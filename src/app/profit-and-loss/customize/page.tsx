import FinancialStatementCustomizeClient from '@/components/FinancialStatementCustomizeClient'
import { FINANCIAL_STATEMENT_LABELS } from '@/lib/financial-statement-customization'
import { loadFinancialStatementCustomization } from '@/lib/financial-statement-customization-store'
import { prisma } from '@/lib/prisma'

function isProfitAndLossAccount(accountType: string, fsSection: string | null) {
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

function buildOutline(accounts: Array<{
  accountType: string
  financialStatementSection: string | null
  financialStatementGroup: string | null
  financialStatementCategory: string | null
}>) {
  const sectionMap = new Map<string, Map<string, Set<string>>>()
  for (const account of accounts) {
    if (!isProfitAndLossAccount(account.accountType, account.financialStatementSection)) continue
    const section = account.financialStatementSection?.trim() || account.accountType
    const group = account.financialStatementGroup?.trim() || 'Unmapped'
    const category = account.financialStatementCategory?.trim() || 'Unmapped'
    if (!sectionMap.has(section)) sectionMap.set(section, new Map())
    const groupMap = sectionMap.get(section)!
    if (!groupMap.has(group)) groupMap.set(group, new Set())
    groupMap.get(group)!.add(category)
  }
  return Array.from(sectionMap.entries()).map(([label, groups]) => ({
    label,
    groups: Array.from(groups.entries()).map(([groupLabel, categories]) => ({
      label: groupLabel,
      categories: Array.from(categories),
    })),
  }))
}

export default async function ProfitAndLossCustomizePage() {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { active: true, isPosting: true },
    select: {
      accountType: true,
      financialStatementSection: true,
      financialStatementGroup: true,
      financialStatementCategory: true,
    },
  })
  const config = await loadFinancialStatementCustomization('profit_and_loss', buildOutline(accounts))

  return (
    <FinancialStatementCustomizeClient
      statementType="profit_and_loss"
      title={FINANCIAL_STATEMENT_LABELS.profit_and_loss}
      reportHref="/profit-and-loss"
      initialConfig={config}
    />
  )
}
