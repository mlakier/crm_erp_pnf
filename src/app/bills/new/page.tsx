import { prisma } from '@/lib/prisma'
import { generateNextBillNumber } from '@/lib/bill-number'
import { toNumericValue } from '@/lib/format'
import { loadBillDetailCustomization } from '@/lib/bill-detail-customization-store'
import BillCreatePageClient from '@/components/BillCreatePageClient'

function normalizeMatchText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b(inc|inc\.|corp|corporation|ltd|limited|llc|gmbh|s\.l\.|sl)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactMatchText(value: string | null | undefined) {
  return normalizeMatchText(value).replace(/\s/g, '')
}

function findPrefillVendor<TVendor extends { name: string; vendorNumber: string | null }>(
  vendors: TVendor[],
  bankText: string,
) {
  const normalizedBankText = normalizeMatchText(bankText)
  const compactBankText = compactMatchText(bankText)
  return vendors
    .map((vendor) => {
      const vendorName = normalizeMatchText(vendor.name)
      const compactVendorName = compactMatchText(vendor.name)
      const vendorNumber = normalizeMatchText(vendor.vendorNumber)
      let score = 0
      if (vendorNumber && normalizedBankText.includes(vendorNumber)) score += 75
      if (vendorName && normalizedBankText.includes(vendorName)) score += 100
      if (compactVendorName && compactBankText.includes(compactVendorName)) score += 90
      for (const token of vendorName.split(' ').filter((part) => part.length >= 4)) {
        if (normalizedBankText.includes(token)) score += 12
      }
      return { vendor, score }
    })
    .filter((entry) => entry.score >= 35)
    .sort((left, right) => right.score - left.score)[0]?.vendor ?? null
}

function findPrefillExpenseAccount<TAccount extends { id: string; accountNumber?: string | null; name: string }>(
  accounts: TAccount[],
  bankText: string,
) {
  const text = normalizeMatchText(bankText)
  const scored = accounts
    .map((account) => {
      const accountText = normalizeMatchText(`${account.accountNumber ?? ''} ${account.name}`)
      let score = 0
      if (text.includes('fee') && accountText.includes('fee')) score += 80
      if (text.includes('supply') && accountText.includes('suppl')) score += 75
      if (text.includes('software') && accountText.includes('software')) score += 75
      if (text.includes('legal') && accountText.includes('legal')) score += 75
      if (text.includes('rent') && accountText.includes('rent')) score += 75
      if (text.includes('travel') && accountText.includes('travel')) score += 75
      if (accountText.includes('misc') || accountText.includes('other')) score += 10
      return { account, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
  return scored[0]?.account ?? accounts[0] ?? null
}

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

export default async function NewBillPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string; bankFeedTransactionId?: string }>
}) {
  const params = await searchParams
  const duplicateFrom = params?.duplicateFrom?.trim()
  const bankFeedTransactionId = params?.bankFeedTransactionId?.trim()

  const [adminUser, vendors, purchaseOrders, subsidiaries, currencies, items, expenseAccounts, nextNumber, duplicateSource, bankFeedSource, customization] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    prisma.vendor.findMany({
      orderBy: { vendorNumber: 'asc' },
      where: { inactive: false },
      select: {
        id: true,
        name: true,
        vendorNumber: true,
        subsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        currency: { select: { id: true, currencyId: true, code: true, name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, number: true, vendorId: true },
      take: 200,
    }),
    prisma.subsidiary.findMany({
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.currency.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, currencyId: true, code: true, name: true },
    }),
    prisma.item.findMany({
      orderBy: [{ itemId: 'asc' }, { name: 'asc' }],
      select: { id: true, itemId: true, name: true, listPrice: true },
    }),
    prisma.chartOfAccounts.findMany({
      where: {
        active: true,
        isPosting: true,
        accountType: { contains: 'expense', mode: 'insensitive' },
      },
      orderBy: [{ accountNumber: 'asc' }, { accountId: 'asc' }],
      select: { id: true, accountId: true, accountNumber: true, name: true },
      take: 500,
    }),
    generateNextBillNumber(),
    duplicateFrom
      ? prisma.bill.findUnique({
          where: { id: duplicateFrom },
          include: {
            lineItems: {
              orderBy: [{ createdAt: 'asc' }],
            },
          },
        })
      : Promise.resolve(null),
    bankFeedTransactionId
      ? prisma.bankFeedTransaction.findUnique({
          where: { id: bankFeedTransactionId },
          include: {
            bankAccount: { select: { subsidiaryId: true } },
            currency: { select: { id: true, currencyId: true, code: true, name: true } },
          },
        })
      : Promise.resolve(null),
    loadBillDetailCustomization(),
  ])
  const bankFeedAmount = bankFeedSource ? Math.abs(toNumericValue(bankFeedSource.amount, 0)) : 0
  const bankFeedText = bankFeedSource
    ? [bankFeedSource.counterparty, bankFeedSource.description, bankFeedSource.externalId, bankFeedSource.bankTransactionId]
        .filter(Boolean)
        .join(' ')
    : ''
  const bankFeedVendor = bankFeedSource ? findPrefillVendor(vendors, bankFeedText) : null
  const bankFeedExpenseAccount = bankFeedSource ? findPrefillExpenseAccount(expenseAccounts, bankFeedText) : null
  const bankFeedDate = dateInputValue(bankFeedSource?.postedDate ?? bankFeedSource?.transactionDate)
  const bankFeedInitialHeaderValues = bankFeedSource
    ? {
        number: nextNumber,
        vendorBillNumber: bankFeedSource.externalId || bankFeedSource.bankTransactionId,
        vendorBillDate: bankFeedDate,
        vendorId: bankFeedVendor?.id ?? '',
        purchaseOrderId: '',
        subsidiaryId: bankFeedVendor?.subsidiary?.id ?? bankFeedSource.bankAccount.subsidiaryId ?? '',
        currencyId: bankFeedVendor?.currency?.id ?? bankFeedSource.currencyId,
        date: bankFeedDate,
        dueDate: bankFeedDate,
        status: 'received',
        notes: `Created from bank activity ${bankFeedSource.bankTransactionId}: ${bankFeedSource.description}`,
      }
    : undefined
  const bankFeedInitialDraftRows = bankFeedSource
    ? [{
        lineType: 'expense' as const,
        itemId: null,
        expenseAccountId: bankFeedExpenseAccount?.id ?? null,
        description: bankFeedSource.description,
        notes: [
          bankFeedSource.counterparty ? `Counterparty: ${bankFeedSource.counterparty}` : '',
          bankFeedSource.externalId ? `External reference: ${bankFeedSource.externalId}` : '',
        ].filter(Boolean).join(' | ') || null,
        quantity: 1,
        unitPrice: bankFeedAmount,
        lineTotal: bankFeedAmount,
        displayOrder: 0,
      }]
    : undefined

  return (
    <BillCreatePageClient
      nextNumber={nextNumber}
      userId={adminUser?.id ?? ''}
      vendors={vendors}
      purchaseOrders={purchaseOrders}
      subsidiaries={subsidiaries}
      currencies={currencies}
      items={items.map((item) => ({ ...item, listPrice: toNumericValue(item.listPrice, 0) }))}
      expenseAccounts={expenseAccounts}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              number: nextNumber,
              vendorBillNumber: duplicateSource.vendorBillNumber ?? '',
              vendorBillDate: duplicateSource.vendorBillDate ? duplicateSource.vendorBillDate.toISOString().slice(0, 10) : '',
              vendorId: duplicateSource.vendorId,
              purchaseOrderId: duplicateSource.purchaseOrderId ?? '',
              subsidiaryId: duplicateSource.subsidiaryId ?? '',
              currencyId: duplicateSource.currencyId ?? '',
              date: duplicateSource.date.toISOString().slice(0, 10),
              dueDate: duplicateSource.dueDate ? duplicateSource.dueDate.toISOString().slice(0, 10) : '',
              status: duplicateSource.status,
              notes: duplicateSource.notes ?? '',
            }
          : bankFeedInitialHeaderValues
      }
      initialDraftRows={
        duplicateSource
          ? duplicateSource.lineItems.map((line, index) => ({
              lineType: (line.lineType === 'expense' ? 'expense' : 'item') as 'item' | 'expense',
              itemId: line.itemId,
              expenseAccountId: line.expenseAccountId ?? null,
              description: line.description,
              notes: line.notes ?? null,
              quantity: line.quantity,
              unitPrice: toNumericValue(line.unitPrice, 0),
              lineTotal: toNumericValue(line.lineTotal, 0),
              displayOrder: index,
            }))
          : bankFeedInitialDraftRows
      }
    />
  )
}
