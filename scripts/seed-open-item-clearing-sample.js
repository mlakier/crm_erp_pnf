const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_TYPE = 'seed-prepaid-amortization'
const OPEN_ITEM_PREFIX = 'OI-'

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function roundMoney(value) {
  return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100
}

async function nextOpenItemNumber(tx) {
  const rows = await tx.openItem.findMany({
    where: { openItemNumber: { startsWith: OPEN_ITEM_PREFIX } },
    select: { openItemNumber: true },
    orderBy: { openItemNumber: 'desc' },
    take: 200,
  })
  const max = rows.reduce((current, row) => {
    const parsed = Number(row.openItemNumber.replace(OPEN_ITEM_PREFIX, ''))
    return Number.isFinite(parsed) ? Math.max(current, parsed) : current
  }, 0)
  return `${OPEN_ITEM_PREFIX}${String(max + 1).padStart(6, '0')}`
}

async function latestRateOnOrBefore(tx, fromCurrencyId, toCurrencyId, effectiveDate) {
  if (!fromCurrencyId || !toCurrencyId) return null
  if (fromCurrencyId === toCurrencyId) return { rate: 1, source: 'same currency', effectiveDate }

  const direct = await tx.exchangeRate.findFirst({
    where: {
      baseCurrencyId: fromCurrencyId,
      quoteCurrencyId: toCurrencyId,
      active: true,
      rateType: { in: ['spot', 'Spot'] },
      effectiveDate: { lte: effectiveDate },
    },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    select: { rate: true, source: true, effectiveDate: true },
  })
  if (direct) {
    return {
      rate: Number(direct.rate),
      source: direct.source ?? 'exchange_rates',
      effectiveDate: direct.effectiveDate,
    }
  }

  const inverse = await tx.exchangeRate.findFirst({
    where: {
      baseCurrencyId: toCurrencyId,
      quoteCurrencyId: fromCurrencyId,
      active: true,
      rateType: { in: ['spot', 'Spot'] },
      effectiveDate: { lte: effectiveDate },
    },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    select: { rate: true, source: true, effectiveDate: true },
  })
  if (inverse) {
    return {
      rate: 1 / Number(inverse.rate),
      source: inverse.source ?? 'exchange_rates',
      effectiveDate: inverse.effectiveDate,
    }
  }

  return null
}

async function translateAmount(tx, currencies, fromCurrencyId, toCurrencyId, amount, effectiveDate) {
  if (!fromCurrencyId || !toCurrencyId) return null
  if (fromCurrencyId === toCurrencyId) return roundMoney(amount)

  const direct = await latestRateOnOrBefore(tx, fromCurrencyId, toCurrencyId, effectiveDate)
  if (direct) return roundMoney(amount * direct.rate)

  const baseCurrencyId = currencies.find((currency) => currency.isBase)?.id
  if (!baseCurrencyId || fromCurrencyId === baseCurrencyId || toCurrencyId === baseCurrencyId) return null

  const fromToBase = await latestRateOnOrBefore(tx, fromCurrencyId, baseCurrencyId, effectiveDate)
  const baseToTarget = await latestRateOnOrBefore(tx, baseCurrencyId, toCurrencyId, effectiveDate)
  if (!fromToBase || !baseToTarget) return null

  return roundMoney(amount * fromToBase.rate * baseToTarget.rate)
}

async function deriveAmounts(tx, context, transactionAmount, effectiveDate) {
  return {
    originalLocalAmount: await translateAmount(
      tx,
      context.currencies,
      context.transactionCurrencyId,
      context.localCurrencyId,
      transactionAmount,
      effectiveDate,
    ),
    originalFunctionalAmount: await translateAmount(
      tx,
      context.currencies,
      context.transactionCurrencyId,
      context.functionalCurrencyId,
      transactionAmount,
      effectiveDate,
    ),
    originalGroupAmount: await translateAmount(
      tx,
      context.currencies,
      context.transactionCurrencyId,
      context.groupCurrencyId,
      transactionAmount,
      effectiveDate,
    ),
  }
}

async function upsertSampleOpenItem(tx, context, input) {
  const postingDate = dateOnly(input.postingDate)
  const amounts = await deriveAmounts(tx, context, input.transactionAmount, postingDate)
  const existing = await tx.openItem.findFirst({
    where: {
      sourceTransactionType: SOURCE_TYPE,
      sourceNumber: input.sourceNumber,
    },
    select: { id: true, openItemNumber: true },
  })

  const data = {
    openItemType: input.openItemType,
    status: 'open',
    accountType: input.accountType,
    accountId: context.accountId,
    subsidiaryId: context.subsidiaryId,
    transactionCurrencyId: context.transactionCurrencyId,
    localCurrencyId: context.localCurrencyId,
    functionalCurrencyId: context.functionalCurrencyId,
    groupCurrencyId: context.groupCurrencyId,
    sourceTransactionType: SOURCE_TYPE,
    sourceTransactionId: input.sourceNumber,
    sourceNumber: input.sourceNumber,
    counterpartyType: 'vendor',
    counterpartyId: context.vendorId,
    documentDate: postingDate,
    postingDate,
    dueDate: postingDate,
    originalTransactionAmount: input.transactionAmount,
    originalLocalAmount: amounts.originalLocalAmount,
    originalFunctionalAmount: amounts.originalFunctionalAmount,
    originalGroupAmount: amounts.originalGroupAmount,
    openItemEligible: true,
    isOpen: true,
    closedAt: null,
    memo: input.memo,
  }

  const openItem = existing
    ? await tx.openItem.update({
        where: { id: existing.id },
        data,
      })
    : await tx.openItem.create({
        data: {
          id: undefined,
          openItemNumber: await nextOpenItemNumber(tx),
          ...data,
        },
      })

  await tx.openItemEntry.deleteMany({ where: { openItemId: openItem.id } })
  await tx.openItemEntry.create({
    data: {
      openItemId: openItem.id,
      entryNumber: 1,
      entryType: 'original',
      effectiveDate: postingDate,
      postingDate,
      transactionAmount: input.transactionAmount,
      localAmount: amounts.originalLocalAmount,
      functionalAmount: amounts.originalFunctionalAmount,
      groupAmount: amounts.originalGroupAmount,
      sourceTransactionType: SOURCE_TYPE,
      sourceTransactionId: input.sourceNumber,
      memo: input.memo,
    },
  })

  return {
    openItemNumber: openItem.openItemNumber,
    sourceNumber: input.sourceNumber,
    transactionAmount: input.transactionAmount,
    ...amounts,
  }
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const [currencies, subsidiary, vendor, existingSample, prepaidAccount] = await Promise.all([
      tx.currency.findMany({ select: { id: true, code: true, isBase: true } }),
      tx.subsidiary.findFirst({
        where: { subsidiaryId: 'SUB-003' },
        select: {
          id: true,
          localCurrencyId: true,
          functionalCurrencyId: true,
          groupCurrencyId: true,
        },
      }),
      tx.vendor.findFirst({ where: { vendorNumber: 'VEND-000003' }, select: { id: true } }),
      tx.openItem.findFirst({
        where: { sourceTransactionType: SOURCE_TYPE },
        select: { accountId: true },
      }),
      tx.chartOfAccounts.findFirst({
        where: {
          OR: [
            { accountNumber: '14000' },
            { name: { contains: 'Prepaid' } },
          ],
        },
        select: { id: true },
      }),
    ])

    const gbp = currencies.find((currency) => currency.code === 'GBP')
    if (!subsidiary) throw new Error('SUB-003 subsidiary is required for the sample.')
    if (!vendor) throw new Error('VEND-000003 vendor is required for the sample.')
    if (!gbp) throw new Error('GBP currency is required for the sample.')

    const context = {
      currencies,
      subsidiaryId: subsidiary.id,
      vendorId: vendor.id,
      accountId: existingSample?.accountId ?? prepaidAccount?.id ?? null,
      transactionCurrencyId: gbp.id,
      localCurrencyId: subsidiary.localCurrencyId,
      functionalCurrencyId: subsidiary.functionalCurrencyId,
      groupCurrencyId: subsidiary.groupCurrencyId,
    }

    const rows = [
      {
        sourceNumber: 'PP-GBP-2026-Q1',
        openItemType: 'prepaid_asset',
        accountType: 'asset',
        transactionAmount: 3000,
        postingDate: '2026-01-01',
        memo: 'Seeded GBP prepaid asset for Q1 amortization clearing.',
      },
      {
        sourceNumber: 'AMORT-GBP-2026-01',
        openItemType: 'amortization_release',
        accountType: 'expense',
        transactionAmount: 1000,
        postingDate: '2026-01-31',
        memo: 'Seeded January GBP prepaid amortization release.',
      },
      {
        sourceNumber: 'AMORT-GBP-2026-02',
        openItemType: 'amortization_release',
        accountType: 'expense',
        transactionAmount: 1000,
        postingDate: '2026-02-28',
        memo: 'Seeded February GBP prepaid amortization release.',
      },
      {
        sourceNumber: 'AMORT-GBP-2026-03',
        openItemType: 'amortization_release',
        accountType: 'expense',
        transactionAmount: 1000,
        postingDate: '2026-03-31',
        memo: 'Seeded March GBP prepaid amortization release.',
      },
    ]

    const updated = []
    for (const row of rows) {
      updated.push(await upsertSampleOpenItem(tx, context, row))
    }
    return updated
  })

  console.log('Updated FX-backed open item clearing sample:')
  for (const row of result) {
    console.log(
      `- ${row.openItemNumber} ${row.sourceNumber}: txn=${row.transactionAmount}, local=${row.originalLocalAmount}, functional=${row.originalFunctionalAmount}, group=${row.originalGroupAmount}`,
    )
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
