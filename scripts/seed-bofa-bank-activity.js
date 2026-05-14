const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ACCOUNT_SPECS = [
  {
    accountNumber: '11601',
    bankAccountId: 'BANK-BOFA-4172',
    name: 'BofA Checking 4172',
    maskedAccountNumber: '****4172',
    subsidiaryCode: 'SUB-002',
    currencyCode: 'USD',
  },
  {
    accountNumber: '11602',
    bankAccountId: 'BANK-BOFA-4177',
    name: 'BofA ACH Direct Debit 4177',
    maskedAccountNumber: '****4177',
    subsidiaryCode: 'SUB-002',
    currencyCode: 'USD',
  },
  {
    accountNumber: '11603',
    bankAccountId: 'BANK-BOFA-5019',
    name: 'BofA Luxembourg 5019',
    maskedAccountNumber: '****5019',
    subsidiaryCode: 'SUB-006',
    currencyCode: 'EUR',
  },
  {
    accountNumber: '11604',
    bankAccountId: 'BANK-BOFA-2011',
    name: 'BofA Spain 2011',
    maskedAccountNumber: '****2011',
    subsidiaryCode: 'SUB-003',
    currencyCode: 'EUR',
  },
]

function asDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

async function requireRecord(label, promise) {
  const record = await promise
  if (!record) throw new Error(`Missing required seed dependency: ${label}`)
  return record
}

async function upsertBankAccount(spec, connection) {
  const [glAccount, subsidiary, currency] = await Promise.all([
    requireRecord(`GL account ${spec.accountNumber}`, prisma.chartOfAccounts.findUnique({ where: { accountNumber: spec.accountNumber } })),
    requireRecord(`subsidiary ${spec.subsidiaryCode}`, prisma.subsidiary.findUnique({ where: { subsidiaryId: spec.subsidiaryCode } })),
    requireRecord(`currency ${spec.currencyCode}`, prisma.currency.findUnique({ where: { code: spec.currencyCode } })),
  ])

  await prisma.chartOfAccounts.update({
    where: { id: glAccount.id },
    data: {
      active: true,
      accountType: 'Asset',
      category: 'Bank Account',
      accountRole: 'Cash and Cash Equivalents',
      normalBalance: 'Debit',
      financialStatementSection: 'Balance Sheet',
      financialStatementGroup: 'Cash and Cash Equivalents',
      financialStatementCategory: 'Cash and Cash Equivalents',
      rollforwardCategory: 'Cash',
      monetaryClassification: 'monetary',
      revalueOpenBalance: true,
      translationTreatment: 'cta',
      bankAccountRequired: true,
      requiresMonthlyReconciliation: true,
      reconciliationType: 'bank_reconciliation',
      aiReviewEnabled: true,
      aiRiskLevel: 'medium',
      autoMatchStrategy: 'bank_statement_match',
    },
  })

  const data = {
    name: spec.name,
    bankName: 'Bank of America',
    accountType: 'checking',
    maskedAccountNumber: spec.maskedAccountNumber,
    statementSource: 'bank_feed',
    paymentFileFormat: 'ach_nacha',
    reconciliationStartDate: asDate('2026-01-01'),
    active: true,
    subsidiaryId: subsidiary.id,
    currencyId: currency.id,
    glAccountId: glAccount.id,
    connectionId: connection.id,
  }

  const existingById = await prisma.bankAccount.findUnique({ where: { bankAccountId: spec.bankAccountId } })
  if (existingById) {
    return prisma.bankAccount.update({ where: { id: existingById.id }, data })
  }

  const existingByGl = await prisma.bankAccount.findUnique({ where: { glAccountId: glAccount.id } })
  if (existingByGl) {
    return prisma.bankAccount.update({
      where: { id: existingByGl.id },
      data: { ...data, bankAccountId: spec.bankAccountId },
    })
  }

  return prisma.bankAccount.create({
    data: {
      bankAccountId: spec.bankAccountId,
      ...data,
    },
  })
}

async function upsertInvoiceSource({ invoiceNumber, customerId, subsidiaryCode, currencyCode, amount, date }) {
  const [customer, subsidiary, currency] = await Promise.all([
    requireRecord(`customer ${customerId}`, prisma.customer.findUnique({ where: { customerId } })),
    requireRecord(`subsidiary ${subsidiaryCode}`, prisma.subsidiary.findUnique({ where: { subsidiaryId: subsidiaryCode } })),
    requireRecord(`currency ${currencyCode}`, prisma.currency.findUnique({ where: { code: currencyCode } })),
  ])

  const invoice = await prisma.invoice.upsert({
    where: { number: invoiceNumber },
    update: {
      status: 'open',
      total: amount,
      createdAt: asDate(date),
      dueDate: asDate(date),
      customerId: customer.id,
      subsidiaryId: subsidiary.id,
      currencyId: currency.id,
    },
    create: {
      number: invoiceNumber,
      status: 'open',
      total: amount,
      createdAt: asDate(date),
      dueDate: asDate(date),
      customerId: customer.id,
      subsidiaryId: subsidiary.id,
      currencyId: currency.id,
    },
  })

  return { invoice, currency, amount, date }
}

async function upsertBillSource({ billNumber, vendorNumber, subsidiaryCode, currencyCode, amount, date }) {
  const [vendor, subsidiary, currency] = await Promise.all([
    requireRecord(`vendor ${vendorNumber}`, prisma.vendor.findUnique({ where: { vendorNumber } })),
    requireRecord(`subsidiary ${subsidiaryCode}`, prisma.subsidiary.findUnique({ where: { subsidiaryId: subsidiaryCode } })),
    requireRecord(`currency ${currencyCode}`, prisma.currency.findUnique({ where: { code: currencyCode } })),
  ])

  const bill = await prisma.bill.upsert({
    where: { number: billNumber },
    update: {
      status: 'approved',
      total: amount,
      date: asDate(date),
      dueDate: asDate(date),
      vendorId: vendor.id,
      subsidiaryId: subsidiary.id,
      currencyId: currency.id,
    },
    create: {
      number: billNumber,
      status: 'approved',
      total: amount,
      date: asDate(date),
      dueDate: asDate(date),
      vendorId: vendor.id,
      subsidiaryId: subsidiary.id,
      currencyId: currency.id,
    },
  })

  return { bill, currency, amount, date }
}

async function upsertFeedLine({ bankAccount, connection, currency, bankTransactionId, externalId, date, description, counterparty, amount, direction, suggestedRecordType, suggestedRecordId }) {
  return prisma.bankFeedTransaction.upsert({
    where: { bankTransactionId },
    update: {
      bankAccountId: bankAccount.id,
      connectionId: connection.id,
      externalId,
      transactionDate: asDate(date),
      postedDate: asDate(date),
      description,
      counterparty,
      amount,
      currencyId: currency.id,
      direction,
      status: suggestedRecordId ? 'suggested' : 'unmatched',
      matchedRecordType: null,
      matchedRecordId: null,
      matchConfidence: suggestedRecordId ? 95 : null,
      suggestedMatchReason: suggestedRecordId ? `Seeded BofA match candidate: ${suggestedRecordType}` : null,
    },
    create: {
      bankTransactionId,
      bankAccountId: bankAccount.id,
      connectionId: connection.id,
      externalId,
      transactionDate: asDate(date),
      postedDate: asDate(date),
      description,
      counterparty,
      amount,
      currencyId: currency.id,
      direction,
      status: suggestedRecordId ? 'suggested' : 'unmatched',
      matchConfidence: suggestedRecordId ? 95 : null,
      suggestedMatchReason: suggestedRecordId ? `Seeded BofA match candidate: ${suggestedRecordType}` : null,
    },
  })
}

async function main() {
  const connection = await prisma.bankConnection.upsert({
    where: { connectionId: 'BCON-BOFA-001' },
    update: {
      connectionCategory: 'direct_bank',
      provider: 'bank_api',
      institutionName: 'Bank of America',
      status: 'connected',
      health: 'healthy',
      syncFrequency: 'daily',
      lastSyncAt: new Date(),
      notes: 'Seeded BofA connection for bank account linking, activity import, and matching workflows.',
      active: true,
    },
    create: {
      connectionId: 'BCON-BOFA-001',
      connectionCategory: 'direct_bank',
      provider: 'bank_api',
      institutionName: 'Bank of America',
      status: 'connected',
      health: 'healthy',
      syncFrequency: 'daily',
      lastSyncAt: new Date(),
      notes: 'Seeded BofA connection for bank account linking, activity import, and matching workflows.',
      active: true,
    },
  })

  const bankAccounts = {}
  for (const spec of ACCOUNT_SPECS) {
    bankAccounts[spec.bankAccountId] = await upsertBankAccount(spec, connection)
  }

  await prisma.cashReceipt.deleteMany({ where: { number: { startsWith: 'RCPT-BOFA-' } } })
  await prisma.billPayment.deleteMany({ where: { number: { startsWith: 'BPAY-BOFA-' } } })

  const usdInvoice = await upsertInvoiceSource({
    invoiceNumber: 'INV-BOFA-USD-001',
    customerId: 'CUST-000001',
    subsidiaryCode: 'SUB-002',
    currencyCode: 'USD',
    amount: 1250,
    date: '2026-02-03',
  })

  const euroTradeInvoices = []
  for (const invoice of [
    { invoiceNumber: 'INV-BOFA-EUR-001', amount: 875, date: '2026-02-06' },
    { invoiceNumber: 'INV-BOFA-EUR-002', amount: 420, date: '2026-02-08' },
    { invoiceNumber: 'INV-BOFA-EUR-003', amount: 1290, date: '2026-02-10' },
    { invoiceNumber: 'INV-BOFA-EUR-004', amount: 315.5, date: '2026-02-12' },
    { invoiceNumber: 'INV-BOFA-EUR-005', amount: 980, date: '2026-02-15' },
  ]) {
    euroTradeInvoices.push(await upsertInvoiceSource({
      ...invoice,
      customerId: 'CUST-000002',
      subsidiaryCode: 'SUB-006',
      currencyCode: 'EUR',
    }))
  }
  const eurInvoice = euroTradeInvoices[0]

  const usdBill = await upsertBillSource({
    billNumber: 'BILL-BOFA-USD-001',
    vendorNumber: 'VEND-000001',
    subsidiaryCode: 'SUB-002',
    currencyCode: 'USD',
    amount: 642.35,
    date: '2026-02-04',
  })

  const eurBill = await upsertBillSource({
    billNumber: 'BILL-BOFA-EUR-001',
    vendorNumber: 'VEND-000002',
    subsidiaryCode: 'SUB-003',
    currencyCode: 'EUR',
    amount: 1180,
    date: '2026-02-07',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260203-001',
    externalId: 'INV-BOFA-USD-001',
    date: usdInvoice.date,
    description: 'ACH CREDIT ACME CORPORATION INV-BOFA-USD-001',
    counterparty: 'Acme Corporation',
    amount: usdInvoice.amount,
    direction: 'inflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-5019'],
    connection,
    currency: eurInvoice.currency,
    bankTransactionId: 'BFT-BOFA-5019-20260206-001',
    externalId: 'INV-BOFA-EUR-001',
    date: eurInvoice.date,
    description: 'SEPA CREDIT EURO TRADE PARTNERS INV-BOFA-EUR-001',
    counterparty: 'Euro Trade Partners',
    amount: eurInvoice.amount,
    direction: 'inflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4177'],
    connection,
    currency: usdBill.currency,
    bankTransactionId: 'BFT-BOFA-4177-20260204-001',
    externalId: 'BILL-BOFA-USD-001',
    date: usdBill.date,
    description: 'ACH DEBIT PACIFIC OFFICE SUPPLY BILL-BOFA-USD-001',
    counterparty: 'Pacific Office Supply',
    amount: -usdBill.amount,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-2011'],
    connection,
    currency: eurBill.currency,
    bankTransactionId: 'BFT-BOFA-2011-20260209-001',
    externalId: 'BILL-BOFA-EUR-001',
    date: '2026-02-09',
    description: 'SEPA DEBIT EURO COMPONENTS GMBH BILL-BOFA-EUR-001',
    counterparty: 'Euro Components GmbH',
    amount: -eurBill.amount,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260214-MERCH',
    externalId: 'BOFA-MERCH-20260214',
    date: '2026-02-14',
    description: 'STRIPE MERCHANT FEE FEBRUARY SETTLEMENT',
    counterparty: 'Stripe',
    amount: -42.18,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260205-FEE',
    externalId: 'BOFA-FEE-20260205',
    date: '2026-02-05',
    description: 'BANK OF AMERICA MONTHLY ANALYSIS FEE',
    counterparty: 'Bank of America',
    amount: -25,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260228-INT',
    externalId: 'BOFA-INT-20260228',
    date: '2026-02-28',
    description: 'BANK OF AMERICA INTEREST CREDIT',
    counterparty: 'Bank of America',
    amount: 18.42,
    direction: 'inflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4177'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4177-20260220-WIRE',
    externalId: 'BOFA-WIRE-20260220',
    date: '2026-02-20',
    description: 'BANK OF AMERICA OUTGOING WIRE FEE',
    counterparty: 'Bank of America',
    amount: -15,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260222-MISC',
    externalId: 'BOFA-MISC-20260222',
    date: '2026-02-22',
    description: 'MISC DEPOSIT CUSTOMER REF UNKNOWN',
    counterparty: 'Unknown customer',
    amount: 300,
    direction: 'inflow',
  })

  const miscIncomeAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      active: true,
      isPosting: true,
      OR: [
        { accountRole: { contains: 'Misc', mode: 'insensitive' } },
        { name: { contains: 'Misc', mode: 'insensitive' } },
        { name: { contains: 'Other Income', mode: 'insensitive' } },
      ],
    },
    orderBy: { accountNumber: 'asc' },
  })

  const seededDepositLine = await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260224-DEPOSIT',
    externalId: 'BDEP-BOFA-000001',
    date: '2026-02-24',
    description: 'REMOTE DEPOSIT CHECK BATCH BDEP-BOFA-000001',
    counterparty: 'Branch deposit',
    amount: 725,
    direction: 'inflow',
  })

  await prisma.bankDeposit.upsert({
    where: { depositNumber: 'BDEP-BOFA-000001' },
    update: {
      status: 'staged',
      depositDate: asDate('2026-02-24'),
      amount: 725,
      memo: 'Seeded bank deposit for matching/posting review.',
      bankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      offsetAccountId: miscIncomeAccount?.id ?? null,
      bankFeedTransactionId: seededDepositLine.id,
    },
    create: {
      depositNumber: 'BDEP-BOFA-000001',
      status: 'staged',
      depositDate: asDate('2026-02-24'),
      amount: 725,
      memo: 'Seeded bank deposit for matching/posting review.',
      bankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      offsetAccountId: miscIncomeAccount?.id ?? null,
      bankFeedTransactionId: seededDepositLine.id,
    },
  })

  const transferOutLine = await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260225-XFER-OUT',
    externalId: 'BTR-BOFA-000001',
    date: '2026-02-25',
    description: 'BOOK TRANSFER TO BOFA ACH 4177 BTR-BOFA-000001',
    counterparty: 'Bank of America',
    amount: -500,
    direction: 'outflow',
  })

  await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4177'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4177-20260225-XFER-IN',
    externalId: 'BTR-BOFA-000001',
    date: '2026-02-25',
    description: 'BOOK TRANSFER FROM BOFA CHECKING 4172 BTR-BOFA-000001',
    counterparty: 'Bank of America',
    amount: 500,
    direction: 'inflow',
  })

  await prisma.bankTransfer.upsert({
    where: { transferNumber: 'BTR-BOFA-000001' },
    update: {
      status: 'staged',
      transferDate: asDate('2026-02-25'),
      amount: 500,
      memo: 'Seeded bank-to-bank transfer for matching/posting review.',
      fromBankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      toBankAccountId: bankAccounts['BANK-BOFA-4177'].id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      bankFeedTransactionId: transferOutLine.id,
    },
    create: {
      transferNumber: 'BTR-BOFA-000001',
      status: 'staged',
      transferDate: asDate('2026-02-25'),
      amount: 500,
      memo: 'Seeded bank-to-bank transfer for matching/posting review.',
      fromBankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      toBankAccountId: bankAccounts['BANK-BOFA-4177'].id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      bankFeedTransactionId: transferOutLine.id,
    },
  })

  const checkVendor = await requireRecord('vendor VEND-000001', prisma.vendor.findUnique({ where: { vendorNumber: 'VEND-000001' } }))
  const checkPayment = await prisma.billPayment.upsert({
    where: { number: 'BPAY-BOFA-CHECK-001' },
    update: {
      amount: 215,
      date: asDate('2026-02-18'),
      method: 'check',
      reference: '100245',
      status: 'processed',
      notes: 'Seeded manually entered check awaiting bank match.',
      vendorId: checkVendor.id,
      billId: usdBill.bill.id,
      bankAccountId: bankAccounts['BANK-BOFA-4172'].glAccountId,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
    },
    create: {
      number: 'BPAY-BOFA-CHECK-001',
      amount: 215,
      date: asDate('2026-02-18'),
      method: 'check',
      reference: '100245',
      status: 'processed',
      notes: 'Seeded manually entered check awaiting bank match.',
      vendorId: checkVendor.id,
      billId: usdBill.bill.id,
      bankAccountId: bankAccounts['BANK-BOFA-4172'].glAccountId,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
    },
  })

  const checkFeedLine = await upsertFeedLine({
    bankAccount: bankAccounts['BANK-BOFA-4172'],
    connection,
    currency: usdInvoice.currency,
    bankTransactionId: 'BFT-BOFA-4172-20260226-CHECK-100245',
    externalId: 'BPAY-BOFA-CHECK-001',
    date: '2026-02-26',
    description: 'CHECK PAID 100245 PACIFIC OFFICE SUPPLY',
    counterparty: 'Pacific Office Supply',
    amount: -215,
    direction: 'outflow',
    suggestedRecordType: 'bill_payment',
    suggestedRecordId: checkPayment.id,
  })

  await prisma.bankCheck.upsert({
    where: { checkTransactionNumber: 'BCHK-BOFA-000001' },
    update: {
      checkNumber: '100245',
      status: 'issued',
      checkDate: asDate('2026-02-18'),
      amount: 215,
      payeeName: 'Pacific Office Supply',
      memo: 'Seeded check transaction; match to clearing bank feed line.',
      bankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      vendorId: checkVendor.id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      billPaymentId: checkPayment.id,
      bankFeedTransactionId: checkFeedLine.id,
    },
    create: {
      checkTransactionNumber: 'BCHK-BOFA-000001',
      checkNumber: '100245',
      status: 'issued',
      checkDate: asDate('2026-02-18'),
      amount: 215,
      payeeName: 'Pacific Office Supply',
      memo: 'Seeded check transaction; match to clearing bank feed line.',
      bankAccountId: bankAccounts['BANK-BOFA-4172'].id,
      vendorId: checkVendor.id,
      subsidiaryId: bankAccounts['BANK-BOFA-4172'].subsidiaryId,
      currencyId: usdInvoice.currency.id,
      billPaymentId: checkPayment.id,
      bankFeedTransactionId: checkFeedLine.id,
    },
  })

  const [bankAccountCount, feedLineCount, receiptCount, paymentCount, depositCount, transferCount, checkCount] = await Promise.all([
    prisma.bankAccount.count({ where: { connectionId: connection.id } }),
    prisma.bankFeedTransaction.count({ where: { connectionId: connection.id } }),
    prisma.cashReceipt.count({ where: { number: { startsWith: 'RCPT-BOFA-' } } }),
    prisma.billPayment.count({ where: { number: { startsWith: 'BPAY-BOFA-' } } }),
    prisma.bankDeposit.count({ where: { depositNumber: { startsWith: 'BDEP-BOFA-' } } }),
    prisma.bankTransfer.count({ where: { transferNumber: { startsWith: 'BTR-BOFA-' } } }),
    prisma.bankCheck.count({ where: { checkTransactionNumber: { startsWith: 'BCHK-BOFA-' } } }),
  ])

  console.log(
    JSON.stringify(
      {
        connection: connection.connectionId,
        bankAccounts: bankAccountCount,
        feedLines: feedLineCount,
        seededInvoiceReceipts: receiptCount,
        seededVendorPayments: paymentCount,
        seededBankDeposits: depositCount,
        seededBankTransfers: transferCount,
        seededChecks: checkCount,
      },
      null,
      2,
    ),
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
