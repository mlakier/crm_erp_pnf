const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function byCurrency(code) {
  return prisma.currency.findFirst({ where: { code } })
}

async function bySubsidiary(subsidiaryId) {
  return prisma.subsidiary.findFirst({ where: { subsidiaryId } })
}

async function byCustomer(name) {
  return prisma.customer.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
}

async function byPriceBook(name) {
  return prisma.priceBook.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
}

async function byPriceLevel(nameOrType) {
  return prisma.priceLevel.findFirst({
    where: {
      OR: [
        { name: { equals: nameOrType, mode: 'insensitive' } },
        { levelType: { equals: nameOrType, mode: 'insensitive' } },
      ],
    },
  })
}

async function byItem(name) {
  return prisma.item.findFirst({ where: { name: { contains: name, mode: 'insensitive' } } })
}

async function byAccountNumber(accountNumber) {
  return prisma.chartOfAccounts.findFirst({ where: { accountNumber } })
}

async function upsertBillingSchedule(data) {
  return prisma.billingSchedule.upsert({
    where: { billingScheduleId: data.billingScheduleId },
    update: data,
    create: data,
  })
}

async function upsertBillingAccount(data) {
  return prisma.billingAccount.upsert({
    where: { billingAccountId: data.billingAccountId },
    update: data,
    create: data,
  })
}

async function upsertSubscriptionPlan(data) {
  return prisma.subscriptionPlan.upsert({
    where: { subscriptionPlanId: data.subscriptionPlanId },
    update: data,
    create: data,
  })
}

async function main() {
  const [usd, eur, gbp] = await Promise.all([byCurrency('USD'), byCurrency('EUR'), byCurrency('GBP')])
  const [sub002, sub003, sub007] = await Promise.all([
    bySubsidiary('SUB-002'),
    bySubsidiary('SUB-003'),
    bySubsidiary('SUB-007'),
  ])
  const [standardBook, standardLevel] = await Promise.all([
    byPriceBook('Global Standard'),
    byPriceLevel('Standard'),
  ])

  const monthlyAdvance = await upsertBillingSchedule({
    billingScheduleId: 'BSCH-00001',
    name: 'Monthly in Advance',
    description: 'Bills recurring subscription charges on the first day of each monthly service period.',
    scheduleType: 'recurring',
    frequency: 'monthly',
    billingTiming: 'advance',
    billingAnchor: 'calendar_month',
    billingDay: 1,
    prorationPolicy: 'daily',
    renewalMode: 'auto',
    invoiceGroupingPolicy: 'by_billing_account',
    graceDays: 0,
    minimumBillAmount: null,
    currencyId: usd?.id ?? null,
    inactive: false,
  })

  const annualCalendar = await upsertBillingSchedule({
    billingScheduleId: 'BSCH-00002',
    name: 'Annual Calendar Year Prorated',
    description: 'Bills annually on a calendar-year basis with first-year proration.',
    scheduleType: 'recurring',
    frequency: 'annual',
    billingTiming: 'advance',
    billingAnchor: 'calendar_year',
    billingDay: 1,
    prorationPolicy: 'daily',
    renewalMode: 'auto',
    invoiceGroupingPolicy: 'by_billing_account',
    graceDays: 0,
    minimumBillAmount: null,
    currencyId: usd?.id ?? null,
    inactive: false,
  })

  const usageArrears = await upsertBillingSchedule({
    billingScheduleId: 'BSCH-00003',
    name: 'Usage Monthly in Arrears',
    description: 'Rates measured usage at month end and bills in arrears.',
    scheduleType: 'usage',
    frequency: 'monthly',
    billingTiming: 'arrears',
    billingAnchor: 'usage_period_end',
    billingDay: null,
    prorationPolicy: 'none',
    renewalMode: 'manual',
    invoiceGroupingPolicy: 'by_billing_account',
    graceDays: 3,
    minimumBillAmount: null,
    currencyId: usd?.id ?? null,
    inactive: false,
  })

  const [acme, euroTrade, britannia] = await Promise.all([
    byCustomer('Acme Corporation'),
    byCustomer('Euro Trade Partners'),
    byCustomer('Britannia Retail Group'),
  ])

  await upsertBillingAccount({
    billingAccountId: 'BA-00001',
    name: 'Acme Default Billing',
    description: 'Default consolidated billing account for Acme subscriptions and usage.',
    customerId: acme?.id ?? null,
    accountType: 'consolidated',
    status: 'active',
    subsidiaryId: sub002?.id ?? null,
    includeChildren: false,
    currencyId: usd?.id ?? null,
    defaultBillingScheduleId: monthlyAdvance.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    invoiceDeliveryMethod: 'email',
    billingEmail: acme?.email ?? null,
    billingAddress: acme?.address ?? null,
    paymentTerms: 'net_30',
    paymentMethod: 'ach',
    paymentInstrumentId: null,
    directDebitEnabled: true,
    consolidateInvoices: true,
    requiresPurchaseOrder: false,
    poNumber: null,
    taxable: true,
    taxCode: 'AVATAX-SVC',
    taxRegistrationStatus: 'registered',
    creditHold: false,
    collectionsHold: false,
    inactive: false,
  })

  await upsertBillingAccount({
    billingAccountId: 'BA-00002',
    name: 'Euro Trade Billing',
    description: 'EUR billing account for Euro Trade recurring services.',
    customerId: euroTrade?.id ?? null,
    accountType: 'consolidated',
    status: 'active',
    subsidiaryId: sub003?.id ?? null,
    includeChildren: false,
    currencyId: eur?.id ?? null,
    defaultBillingScheduleId: usageArrears.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    invoiceDeliveryMethod: 'email',
    billingEmail: euroTrade?.email ?? null,
    billingAddress: euroTrade?.address ?? null,
    paymentTerms: 'net_30',
    paymentMethod: 'sepa',
    paymentInstrumentId: null,
    directDebitEnabled: true,
    consolidateInvoices: true,
    requiresPurchaseOrder: false,
    poNumber: null,
    taxable: true,
    taxCode: 'AVATAX-SVC',
    taxRegistrationStatus: 'registered',
    creditHold: false,
    collectionsHold: false,
    inactive: false,
  })

  await upsertBillingAccount({
    billingAccountId: 'BA-00003',
    name: 'Britannia Annual Billing',
    description: 'GBP annual calendar-year billing account.',
    customerId: britannia?.id ?? null,
    accountType: 'parent_child',
    status: 'active',
    subsidiaryId: sub007?.id ?? null,
    includeChildren: true,
    currencyId: gbp?.id ?? null,
    defaultBillingScheduleId: annualCalendar.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    invoiceDeliveryMethod: 'email',
    billingEmail: britannia?.email ?? null,
    billingAddress: britannia?.address ?? null,
    paymentTerms: 'net_45',
    paymentMethod: 'ach',
    paymentInstrumentId: null,
    directDebitEnabled: false,
    consolidateInvoices: true,
    requiresPurchaseOrder: true,
    poNumber: null,
    taxable: true,
    taxCode: 'AVATAX-SVC',
    taxRegistrationStatus: 'registered',
    creditHold: false,
    collectionsHold: false,
    inactive: false,
  })

  const [platformItem, usageItem, supportItem] = await Promise.all([
    byItem('Digital Commerce'),
    byItem('Usage'),
    byItem('Support'),
  ])
  const [revenueAccount, deferredRevenueAccount, cogsAccount, deferredCostAccount] = await Promise.all([
    byAccountNumber('31110'),
    byAccountNumber('24100'),
    byAccountNumber('51000'),
    byAccountNumber('14200'),
  ])

  await upsertSubscriptionPlan({
    subscriptionPlanId: 'SPLAN-00001',
    name: 'Digital Commerce Platform',
    description: 'Annual SaaS platform plan with ratable revenue recognition.',
    planType: 'recurring',
    billingModel: 'fixed_recurring',
    status: 'active',
    itemId: platformItem?.id ?? null,
    subsidiaryId: sub002?.id ?? null,
    includeChildren: true,
    currencyId: usd?.id ?? null,
    defaultBillingScheduleId: annualCalendar.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    termMonths: 12,
    autoRenew: true,
    renewalMode: 'auto',
    renewalTermMonths: 12,
    usageRatingModel: 'none',
    includedQuantity: null,
    overageRate: null,
    minimumCommitAmount: null,
    setupFeeAmount: null,
    revenueRecognitionPolicy: 'ratable',
    revenueAccountId: revenueAccount?.id ?? null,
    deferredRevenueAccountId: deferredRevenueAccount?.id ?? null,
    costAccountId: cogsAccount?.id ?? null,
    deferredCostAccountId: deferredCostAccount?.id ?? null,
    inactive: false,
  })

  await upsertSubscriptionPlan({
    subscriptionPlanId: 'SPLAN-00002',
    name: 'Usage API Transactions',
    description: 'Usage-based plan for transaction volume rated monthly in arrears.',
    planType: 'usage',
    billingModel: 'usage_based',
    status: 'active',
    itemId: usageItem?.id ?? null,
    subsidiaryId: sub003?.id ?? null,
    includeChildren: false,
    currencyId: eur?.id ?? null,
    defaultBillingScheduleId: usageArrears.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    termMonths: 12,
    autoRenew: true,
    renewalMode: 'auto',
    renewalTermMonths: 12,
    usageRatingModel: 'tiered',
    includedQuantity: 10000,
    overageRate: 0.04,
    minimumCommitAmount: 500,
    setupFeeAmount: null,
    revenueRecognitionPolicy: 'usage_as_billed',
    revenueAccountId: revenueAccount?.id ?? null,
    deferredRevenueAccountId: deferredRevenueAccount?.id ?? null,
    costAccountId: cogsAccount?.id ?? null,
    deferredCostAccountId: deferredCostAccount?.id ?? null,
    inactive: false,
  })

  await upsertSubscriptionPlan({
    subscriptionPlanId: 'SPLAN-00003',
    name: 'Premium Support',
    description: 'Recurring support plan that can be bundled with platform subscriptions.',
    planType: 'recurring',
    billingModel: 'fixed_recurring',
    status: 'active',
    itemId: supportItem?.id ?? null,
    subsidiaryId: sub007?.id ?? null,
    includeChildren: false,
    currencyId: gbp?.id ?? null,
    defaultBillingScheduleId: monthlyAdvance.id,
    defaultPriceBookId: standardBook?.id ?? null,
    defaultPriceLevelId: standardLevel?.id ?? null,
    termMonths: 12,
    autoRenew: true,
    renewalMode: 'auto',
    renewalTermMonths: 12,
    usageRatingModel: 'none',
    includedQuantity: null,
    overageRate: null,
    minimumCommitAmount: null,
    setupFeeAmount: null,
    revenueRecognitionPolicy: 'ratable',
    revenueAccountId: revenueAccount?.id ?? null,
    deferredRevenueAccountId: deferredRevenueAccount?.id ?? null,
    costAccountId: cogsAccount?.id ?? null,
    deferredCostAccountId: deferredCostAccount?.id ?? null,
    inactive: false,
  })

  console.log('Seeded billing schedules, billing accounts, and subscription plans.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
