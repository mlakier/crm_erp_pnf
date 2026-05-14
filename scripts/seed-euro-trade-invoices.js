const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function asDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

async function requireRecord(label, promise) {
  const record = await promise
  if (!record) throw new Error(`Missing required seed dependency: ${label}`)
  return record
}

async function main() {
  const [customer, subsidiary, currency] = await Promise.all([
    requireRecord('customer CUST-000002', prisma.customer.findUnique({ where: { customerId: 'CUST-000002' } })),
    requireRecord('subsidiary SUB-006', prisma.subsidiary.findUnique({ where: { subsidiaryId: 'SUB-006' } })),
    requireRecord('currency EUR', prisma.currency.findUnique({ where: { code: 'EUR' } })),
  ])

  const invoices = [
    { number: 'INV-BOFA-EUR-001', amount: 875, date: '2026-02-06' },
    { number: 'INV-BOFA-EUR-002', amount: 420, date: '2026-02-08' },
    { number: 'INV-BOFA-EUR-003', amount: 1290, date: '2026-02-10' },
    { number: 'INV-BOFA-EUR-004', amount: 315.5, date: '2026-02-12' },
    { number: 'INV-BOFA-EUR-005', amount: 980, date: '2026-02-15' },
  ]

  for (const invoice of invoices) {
    await prisma.invoice.upsert({
      where: { number: invoice.number },
      update: {
        status: 'open',
        total: invoice.amount,
        createdAt: asDate(invoice.date),
        dueDate: asDate(invoice.date),
        customerId: customer.id,
        subsidiaryId: subsidiary.id,
        currencyId: currency.id,
      },
      create: {
        number: invoice.number,
        status: 'open',
        total: invoice.amount,
        createdAt: asDate(invoice.date),
        dueDate: asDate(invoice.date),
        customerId: customer.id,
        subsidiaryId: subsidiary.id,
        currencyId: currency.id,
      },
    })
  }

  const seeded = await prisma.invoice.findMany({
    where: {
      customerId: customer.id,
      currencyId: currency.id,
      number: { startsWith: 'INV-BOFA-EUR-' },
    },
    select: { number: true, status: true, total: true, createdAt: true, dueDate: true },
    orderBy: { number: 'asc' },
  })

  console.log(JSON.stringify(seeded.map((invoice) => ({
    number: invoice.number,
    status: invoice.status,
    total: String(invoice.total),
    invoiceDate: invoice.createdAt?.toISOString().slice(0, 10) ?? null,
    dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
  })), null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
