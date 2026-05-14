const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const SOURCE_TYPE = 'seed-ending-balance-sheet-2025'
const JOURNAL_DATE = new Date(Date.UTC(2025, 11, 31))

const SUBSIDIARY_SEEDS = [
  {
    subsidiaryCode: 'SUB-002',
    description: 'Seeded 12/31/2025 ending balance sheet across all posting balance sheet accounts',
    accountNumbers: null,
    scale: 1,
  },
  {
    subsidiaryCode: 'SUB-003',
    description: 'Seeded 12/31/2025 local opening balance sheet - Tillster Espana',
    accountNumbers: ['11420', '12100', '13100', '14100', '16080', '16580', '21100', '23410', '24100', '27100', '29100', '29700', '29900'],
    scale: 0.22,
  },
  {
    subsidiaryCode: 'SUB-004',
    description: 'Seeded 12/31/2025 local opening balance sheet - Tillster North America',
    accountNumbers: ['11601', '12100', '14200', '16040', '16540', '21100', '23110', '24100', '29100', '29700'],
    scale: 0.18,
  },
  {
    subsidiaryCode: 'SUB-006',
    description: 'Seeded 12/31/2025 local opening balance sheet - Tillster Services EMEA',
    accountNumbers: ['11603', '12100', '14100', '15546', '19090', '19590', '21100', '25246', '27200', '29100', '29700', '29900'],
    scale: 0.16,
  },
  {
    subsidiaryCode: 'SUB-007',
    description: 'Seeded 12/31/2025 local opening balance sheet - Tillster UK Services',
    accountNumbers: ['11510', '12100', '14100', '16080', '16580', '21100', '23410', '24100', '27100', '29100', '29700', '29900'],
    scale: 0.14,
  },
]

const FX_TO_GROUP_USD = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.34,
}

const FX_TO_FUNCTIONAL = {
  'GBP:EUR': 1.15,
}

function money(value) {
  return Math.round(value * 100) / 100
}

function normalized(text) {
  return String(text ?? '').toLowerCase()
}

function isContraAsset(account) {
  const text = `${account.name} ${account.financialStatementCategory ?? ''} ${account.accountRole ?? ''}`.toLowerCase()
  return /(accumulated|allowance|reserve|valuation allowance|amortization|depreciation)/.test(text)
}

function seededSignedBalance(account, ordinal) {
  const category = normalized(account.financialStatementCategory)
  const group = normalized(account.financialStatementGroup)
  const name = normalized(account.name)
  const n = Number.parseInt(account.accountNumber, 10) || ordinal
  const jitter = (n % 23) * 137

  if (account.accountType === 'Asset') {
    let base = 5000 + jitter
    if (category.includes('cash')) base = 4500 + (n % 41) * 515
    else if (category.includes('accounts receivable')) base = 28000 + (n % 13) * 1850
    else if (category.includes('inventory')) base = 42000 + (n % 7) * 3250
    else if (category.includes('prepaid')) base = 24000 + (n % 9) * 1200
    else if (category.includes('intercompany')) base = 65000
    else if (category.includes('deferred tax')) base = 16000 + (n % 5) * 1400
    else if (category.includes('fixed')) base = 85000 + (n % 11) * 7200
    else if (category.includes('notes receivable')) base = 52500
    else if (group.includes('non-current')) base = 37500 + (n % 17) * 2600
    else if (category.includes('other current')) base = 9500 + (n % 19) * 800

    if (isContraAsset(account)) return -money(Math.max(2500, base * 0.28))
    if (name.includes('unapplied cash')) return 1200
    return money(base)
  }

  if (account.accountType === 'Liability') {
    let base = 7000 + jitter
    if (category.includes('accounts payable')) base = 36000 + (n % 7) * 2800
    else if (category.includes('credit card')) base = 9250
    else if (category.includes('accrued')) base = 6200 + (n % 19) * 975
    else if (category.includes('deferred revenue')) base = 31000 + (n % 11) * 2700
    else if (category.includes('intercompany')) base = 65000
    else if (category.includes('notes payable')) base = 115000
    else if (category.includes('non-current deferred')) base = 42000 + (n % 5) * 3500
    else if (category.includes('other current')) base = 3800 + (n % 17) * 650
    return money(base)
  }

  if (account.accountType === 'Equity') {
    if (name.includes('retained earnings')) return 0
    if (name.includes('common stock') && name.includes('apic')) return 185000
    if (name.includes('preferred stock') && name.includes('apic')) return 95000
    if (name.includes('common stock')) return 100000
    if (name.includes('preferred stock')) return 65000
    if (name.includes('dividend')) return -15000
    if (name.includes('currency translation')) return 8500
    return 25000 + jitter
  }

  return 0
}

function getRate(fromCode, toCode) {
  if (!fromCode || !toCode || fromCode === toCode) return 1
  return FX_TO_FUNCTIONAL[`${fromCode}:${toCode}`] ?? FX_TO_GROUP_USD[fromCode] ?? 1
}

function debitCreditForSignedBalance(account, signedBalance) {
  const normal = String(account.normalBalance ?? 'debit').toLowerCase()
  const debit = normal === 'credit' ? Math.max(0, -signedBalance) : Math.max(0, signedBalance)
  const credit = normal === 'credit' ? Math.max(0, signedBalance) : Math.max(0, -signedBalance)
  return { debit: money(debit), credit: money(credit) }
}

function buildLine(account, signedBalance, displayOrder, subsidiary, localCode, functionalCode, groupCode) {
  const transaction = debitCreditForSignedBalance(account, signedBalance)
  const local = transaction
  const functionalRate = getRate(localCode, functionalCode)
  const groupRate = getRate(localCode, groupCode)

  return {
    displayOrder,
    description: `12/31/2025 ending balance - ${subsidiary.subsidiaryId} - ${account.accountNumber} ${account.name}`,
    memo: 'Seeded 12/31/2025 ending balance sheet account balance',
    debit: transaction.debit,
    credit: transaction.credit,
    localDebit: local.debit,
    localCredit: local.credit,
    functionalDebit: money(local.debit * functionalRate),
    functionalCredit: money(local.credit * functionalRate),
    groupDebit: money(local.debit * groupRate),
    groupCredit: money(local.credit * groupRate),
    accountId: account.id,
    subsidiaryId: subsidiary.id,
  }
}

async function nextSystemJournalNumber(tx) {
  const latest = await tx.journalEntry.findMany({
    where: { number: { startsWith: 'SJE-' } },
    select: { number: true },
    orderBy: { number: 'desc' },
    take: 500,
  })
  const max = latest.reduce((current, entry) => {
    const match = /^SJE-(\d+)$/.exec(entry.number)
    return match ? Math.max(current, Number(match[1])) : current
  }, 0)
  return `SJE-${max + 1}`
}

async function ensureDecemberPeriod() {
  let period = await prisma.accountingPeriod.findFirst({
    where: { name: { in: ['December 2025', 'Dec 2025'] }, subsidiaryId: null },
    select: { id: true },
  })
  if (period) {
    period = await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { name: 'December 2025' },
      select: { id: true },
    })
  }
  if (!period) {
    period = await prisma.accountingPeriod.create({
      data: {
        name: 'December 2025',
        startDate: new Date(Date.UTC(2025, 11, 1)),
        endDate: JOURNAL_DATE,
        status: 'open',
        closed: false,
      },
      select: { id: true },
    })
  }
  return period
}

function selectAccounts(allAccounts, seed) {
  if (!seed.accountNumbers) return allAccounts
  const selected = allAccounts.filter((account) => seed.accountNumbers.includes(account.accountNumber))
  const missing = seed.accountNumbers.filter((accountNumber) => !selected.some((account) => account.accountNumber === accountNumber))
  if (missing.length > 0) {
    throw new Error(`${seed.subsidiaryCode} seed is missing GL accounts: ${missing.join(', ')}`)
  }
  return selected
}

function buildSignedBalances(accounts, seed) {
  const retained = accounts.find((account) => account.accountNumber === '29700')
    ?? accounts.find((account) => normalized(account.name).includes('retained earnings'))
  if (!retained) throw new Error(`Retained earnings account not found for ${seed.subsidiaryCode}`)

  const signedBalances = new Map(accounts.map((account, index) => {
    if (account.id === retained.id) return [account.id, 0]
    return [account.id, money(seededSignedBalance(account, index + 1) * seed.scale)]
  }))
  const totalByType = (type) => money(accounts
    .filter((account) => account.accountType === type)
    .reduce((sum, account) => sum + (signedBalances.get(account.id) || 0), 0))

  let assets = totalByType('Asset')
  const liabilities = totalByType('Liability')
  const equityExRetained = money(accounts
    .filter((account) => account.accountType === 'Equity' && account.id !== retained.id)
    .reduce((sum, account) => sum + (signedBalances.get(account.id) || 0), 0))
  let retainedPlug = money(assets - liabilities - equityExRetained)

  if (retainedPlug < 5000) {
    const firstCash = accounts.find((account) => account.accountType === 'Asset' && normalized(account.financialStatementCategory).includes('cash'))
      ?? accounts.find((account) => account.accountType === 'Asset')
    if (!firstCash) throw new Error(`Could not find a cash/asset plug account for ${seed.subsidiaryCode}`)
    signedBalances.set(firstCash.id, money((signedBalances.get(firstCash.id) || 0) + 5000 - retainedPlug + 15000))
    assets = totalByType('Asset')
    retainedPlug = money(assets - liabilities - equityExRetained)
  }
  signedBalances.set(retained.id, retainedPlug)

  return signedBalances
}

async function main() {
  const period = await ensureDecemberPeriod()
  const allAccounts = await prisma.chartOfAccounts.findMany({
    where: {
      active: true,
      isPosting: true,
      summary: false,
      accountType: { in: ['Asset', 'Liability', 'Equity'] },
    },
    orderBy: [{ accountNumber: 'asc' }],
    select: {
      id: true,
      accountNumber: true,
      name: true,
      accountType: true,
      normalBalance: true,
      financialStatementGroup: true,
      financialStatementCategory: true,
      accountRole: true,
    },
  })

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.journalEntry.findMany({ where: { sourceType: SOURCE_TYPE }, select: { id: true } })
    if (existing.length > 0) {
      await tx.journalEntryLineItem.deleteMany({ where: { journalEntryId: { in: existing.map((entry) => entry.id) } } })
      await tx.journalEntry.deleteMany({ where: { id: { in: existing.map((entry) => entry.id) } } })
    }

    const journals = []
    for (const seed of SUBSIDIARY_SEEDS) {
      const subsidiary = await tx.subsidiary.findFirst({
        where: { subsidiaryId: seed.subsidiaryCode },
        include: { localCurrency: true, functionalCurrency: true, groupCurrency: true },
      })
      if (!subsidiary) throw new Error(`${seed.subsidiaryCode} subsidiary not found`)
      if (seed.subsidiaryCode === 'SUB-001' || seed.subsidiaryCode === 'SUB-005') {
        throw new Error(`${seed.subsidiaryCode} is consolidation-only and should not receive direct seed postings`)
      }

      const localCurrency = subsidiary.localCurrency ?? subsidiary.functionalCurrency ?? subsidiary.groupCurrency
      if (!localCurrency) throw new Error(`${seed.subsidiaryCode} does not have a local/function/group currency configured`)

      const accounts = selectAccounts(allAccounts, seed)
      const signedBalances = buildSignedBalances(accounts, seed)
      const lines = accounts.map((account, index) => buildLine(
        account,
        signedBalances.get(account.id) || 0,
        index + 1,
        subsidiary,
        localCurrency.code,
        subsidiary.functionalCurrency?.code ?? localCurrency.code,
        subsidiary.groupCurrency?.code ?? localCurrency.code,
      ))
      const debits = money(lines.reduce((sum, line) => sum + line.debit, 0))
      const credits = money(lines.reduce((sum, line) => sum + line.credit, 0))
      if (debits !== credits) throw new Error(`${seed.subsidiaryCode} seed journal not balanced: debits ${debits}, credits ${credits}`)

      const journal = await tx.journalEntry.create({
        data: {
          number: await nextSystemJournalNumber(tx),
          date: JOURNAL_DATE,
          description: seed.description,
          journalType: 'seed_opening_balance_sheet',
          status: 'posted',
          total: debits,
          accountingPeriodId: period.id,
          sourceType: SOURCE_TYPE,
          sourceId: `2025-12-31-ending-balance-sheet-${seed.subsidiaryCode}`,
          subsidiaryId: subsidiary.id,
          currencyId: localCurrency.id,
          lineItems: { create: lines },
        },
        select: { id: true, number: true },
      })

      const assetTotal = money(accounts
        .filter((account) => account.accountType === 'Asset')
        .reduce((sum, account) => sum + (signedBalances.get(account.id) || 0), 0))
      const liabilityTotal = money(accounts
        .filter((account) => account.accountType === 'Liability')
        .reduce((sum, account) => sum + (signedBalances.get(account.id) || 0), 0))
      const equityTotal = money(accounts
        .filter((account) => account.accountType === 'Equity')
        .reduce((sum, account) => sum + (signedBalances.get(account.id) || 0), 0))

      journals.push({
        subsidiary: seed.subsidiaryCode,
        journal,
        currency: localCurrency.code,
        lineCount: lines.length,
        debits,
        credits,
        balanceCheck: money(assetTotal - liabilityTotal - equityTotal),
      })
    }

    return journals
  }, { timeout: 120000, maxWait: 120000 })

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
