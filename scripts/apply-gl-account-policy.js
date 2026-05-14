/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function containsAny(value, needles) {
  return needles.some((needle) => value.includes(needle))
}

function deriveRollforwardCategory(account) {
  const accountId = String(account.accountId ?? account.accountNumber ?? '').trim().toLowerCase()
  const accountNumber = String(account.accountNumber ?? '').trim().toLowerCase()
  const name = String(account.name ?? '').trim().toLowerCase()
  const accountType = String(account.accountType ?? '').trim().toLowerCase()
  const category = String(account.category ?? '').trim().toLowerCase()
  const existingRollforwardCategory = String(account.rollforwardCategory ?? '').trim()

  if (existingRollforwardCategory) return existingRollforwardCategory

  if (name.includes('intercompany')) return 'Intercompany'
  if (name.includes('fx revaluation') || name.includes('foreign exchange revaluation') || name.includes('unrealized fx')) return 'FX Revaluation'
  if (['1000', '1010'].includes(accountId) || ['1000', '1010'].includes(accountNumber) || name.includes('cash') || name.includes('bank') || name.includes('checking') || category.includes('bank')) return 'Cash and Cash Equivalents'
  if (name.includes('accounts receivable') || name.includes('a/r') || category.includes('accounts receivable') || accountId === '1100' || accountNumber === '1100') return 'Accounts Receivable'
  if (name.includes('inventory')) return 'Inventory'
  if (name.includes('prepaid') || name.includes('deferred cost')) return 'Prepaids and Other Current Assets'
  if (name.includes('fixed asset') || name.includes('property') || name.includes('equipment') || name.includes('capitalized software') || category.includes('fixed asset')) return 'Fixed Assets'
  if (name.includes('accumulated depreciation') || name.includes('accumulated amortization') || accountId === '1310' || accountNumber === '1310') return 'Accumulated Depreciation and Amortization'
  if (name.includes('accounts payable') || name.includes('a/p') || category.includes('accounts payable') || accountId === '2000' || accountNumber === '2000') return 'Accounts Payable'
  if (name.includes('accrued') || category.includes('accrued') || accountId === '2100' || accountNumber === '2100') return 'Accrued Expenses'
  if (name.includes('deferred revenue') || name.includes('customer deposit') || ['2200', '2210'].includes(accountId) || ['2200', '2210'].includes(accountNumber)) return 'Deferred Revenue'
  if (name.includes('debt') || name.includes('loan') || name.includes('note payable') || accountId === '2500' || accountNumber === '2500') return 'Debt'
  if (accountType === 'equity') return 'Equity'
  if (accountType === 'asset') return category.includes('other asset') ? 'Other Assets' : 'Not Applicable'
  if (accountType === 'liability') return category.includes('other liability') || category.includes('long term liability') ? 'Other Liabilities' : 'Not Applicable'
  return 'Not Applicable'
}

function deriveMonetaryClassification(account) {
  const accountId = String(account.accountId ?? account.accountNumber ?? '').trim()
  const accountNumber = String(account.accountNumber ?? account.accountId ?? '').trim()
  const name = String(account.name ?? '').trim().toLowerCase()
  const accountType = String(account.accountType ?? '').trim().toLowerCase()
  const category = String(account.category ?? '').trim().toLowerCase()
  const accountRole = String(account.accountRole ?? '').trim().toLowerCase()
  const financialStatementSection = String(account.financialStatementSection ?? '').trim().toLowerCase()
  const financialStatementGroup = String(account.financialStatementGroup ?? '').trim().toLowerCase()
  const financialStatementCategory = String(account.financialStatementCategory ?? '').trim().toLowerCase()
  const rollforwardCategory = String(deriveRollforwardCategory(account) ?? '').trim().toLowerCase()
  const searchText = [
    name,
    category,
    accountRole,
    financialStatementSection,
    financialStatementGroup,
    financialStatementCategory,
    rollforwardCategory,
  ].join(' ')
  const directAccountText = [name, category, accountRole].join(' ')

  if (accountType === 'revenue' || accountType === 'expense') return 'p_and_l_flow'
  if (accountType === 'equity' || containsAny(searchText, ['equity', 'retained earnings', 'cta', 'cumulative translation'])) return 'equity_historical'

  const isHistoricalRollforward =
    containsAny(rollforwardCategory, ['inventory', 'fixed asset', 'accumulated depreciation', 'accumulated amortization', 'deferred revenue'])
    || (rollforwardCategory.includes('prepaid') && containsAny(directAccountText, ['prepaid', 'deferred cost', 'contract cost']))

  const isHistoricalCostAccount =
    account.inventory
    || ['1200', '1210', '1220', '1230', '1300', '1310', '2200', '2210'].includes(accountId)
    || ['1200', '1210', '1220', '1230', '1300', '1310', '2200', '2210'].includes(accountNumber)
    || isHistoricalRollforward
    || containsAny(directAccountText, [
      'inventory',
      'prepaid',
      'deferred cost',
      'contract cost',
      'fixed asset',
      'property',
      'equipment',
      'capitalized software',
      'software development costs',
      'right of use',
      'rou asset',
      'goodwill',
      'intangibles',
      'patents',
      'trademarks',
      'accumulated depreciation',
      'accumulated amortization',
      'deferred tax',
      'deferred income tax',
      'deferred revenue',
      'customer deposit',
    ])

  if (accountType === 'asset' || accountType === 'liability') {
    return isHistoricalCostAccount ? 'non_monetary_historical_cost' : 'monetary'
  }

  if (isHistoricalCostAccount) {
    return 'non_monetary_historical_cost'
  }
  if (containsAny(searchText, ['income statement', 'p&l'])) return 'p_and_l_flow'
  if (containsAny(searchText, ['asset', 'liability', 'cash', 'receivable', 'payable', 'accrued', 'loan', 'debt', 'tax'])) return 'monetary'
  return null
}

function deriveTranslationTreatment(account) {
  const accountType = String(account.accountType ?? '').trim().toLowerCase()
  const classification = deriveMonetaryClassification(account)
  if (account.summary) return 'no_translation'
  if (classification === 'p_and_l_flow' || accountType === 'revenue' || accountType === 'expense') return 'average_rate'
  if (classification === 'equity_historical' || accountType === 'equity') return 'historical_rate'
  if (classification === 'monetary' || classification === 'non_monetary_historical_cost' || accountType === 'asset' || accountType === 'liability') return 'closing_rate'
  return null
}

async function main() {
  const accounts = await prisma.chartOfAccounts.findMany({
    orderBy: { accountId: 'asc' },
    select: {
      id: true,
      accountId: true,
      accountNumber: true,
      name: true,
      accountType: true,
      category: true,
      accountRole: true,
      financialStatementSection: true,
      financialStatementGroup: true,
      financialStatementCategory: true,
      rollforwardCategory: true,
      inventory: true,
      summary: true,
    },
  })

  const counts = new Map()

  for (const account of accounts) {
    const monetaryClassification = deriveMonetaryClassification(account)
    const translationTreatment = deriveTranslationTreatment(account)
    const revalueOpenBalance = monetaryClassification === 'monetary'
    const key = `${monetaryClassification ?? 'unclassified'} / ${translationTreatment ?? 'no treatment'} / ${revalueOpenBalance ? 'remeasure' : 'no remeasure'}`
    counts.set(key, (counts.get(key) ?? 0) + 1)

    await prisma.chartOfAccounts.update({
      where: { id: account.id },
      data: {
        revalueOpenBalance,
        monetaryClassification,
        translationTreatment,
      },
    })

    console.log([
      account.accountId,
      account.name,
      revalueOpenBalance ? 'remeasure' : 'no-remeasure',
      monetaryClassification ?? '-',
      translationTreatment ?? '-',
    ].join('\t'))
  }

  console.log(`Updated ${accounts.length} GL accounts.`)
  console.table(
    [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([policy, count]) => ({ policy, count })),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
