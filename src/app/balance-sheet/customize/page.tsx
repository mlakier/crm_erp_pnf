import FinancialStatementCustomizeClient from '@/components/FinancialStatementCustomizeClient'
import { FINANCIAL_STATEMENT_LABELS } from '@/lib/financial-statement-customization'
import { loadFinancialStatementCustomization } from '@/lib/financial-statement-customization-store'
import { prisma } from '@/lib/prisma'

function isBalanceSheetAccount(accountType: string, fsSection: string | null) {
  const text = `${accountType} ${fsSection ?? ''}`.toLowerCase()
  return text.includes('asset') || text.includes('liability') || text.includes('equity') || text.includes('balance sheet')
}

function buildOutline(accounts: Array<{
  accountType: string
  financialStatementSection: string | null
  financialStatementGroup: string | null
  financialStatementCategory: string | null
}>) {
  const sectionMap = new Map<string, Map<string, Set<string>>>()
  for (const account of accounts) {
    if (!isBalanceSheetAccount(account.accountType, account.financialStatementSection)) continue
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

export default async function BalanceSheetCustomizePage() {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { active: true, isPosting: true },
    select: {
      accountType: true,
      financialStatementSection: true,
      financialStatementGroup: true,
      financialStatementCategory: true,
    },
  })
  const config = await loadFinancialStatementCustomization('balance_sheet', buildOutline(accounts))

  return (
    <FinancialStatementCustomizeClient
      statementType="balance_sheet"
      title={FINANCIAL_STATEMENT_LABELS.balance_sheet}
      reportHref="/balance-sheet"
      initialConfig={config}
    />
  )
}
