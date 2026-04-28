import { prisma } from '@/lib/prisma'
import { generateNextBillNumber } from '@/lib/bill-number'
import { toNumericValue } from '@/lib/format'
import { loadBillDetailCustomization } from '@/lib/bill-detail-customization-store'
import BillCreatePageClient from '@/components/BillCreatePageClient'

export default async function NewBillPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [adminUser, vendors, purchaseOrders, subsidiaries, currencies, items, nextNumber, duplicateSource, customization] = await Promise.all([
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
    loadBillDetailCustomization(),
  ])

  return (
    <BillCreatePageClient
      nextNumber={nextNumber}
      userId={adminUser?.id ?? ''}
      vendors={vendors}
      purchaseOrders={purchaseOrders}
      subsidiaries={subsidiaries}
      currencies={currencies}
      items={items.map((item) => ({ ...item, listPrice: toNumericValue(item.listPrice, 0) }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              number: nextNumber,
              vendorId: duplicateSource.vendorId,
              purchaseOrderId: duplicateSource.purchaseOrderId ?? '',
              subsidiaryId: duplicateSource.subsidiaryId ?? '',
              currencyId: duplicateSource.currencyId ?? '',
              date: duplicateSource.date.toISOString().slice(0, 10),
              dueDate: duplicateSource.dueDate ? duplicateSource.dueDate.toISOString().slice(0, 10) : '',
              status: duplicateSource.status,
              notes: duplicateSource.notes ?? '',
            }
          : undefined
      }
      initialDraftRows={
        duplicateSource
          ? duplicateSource.lineItems.map((line, index) => ({
              itemId: line.itemId,
              description: line.description,
              notes: line.notes ?? null,
              quantity: line.quantity,
              unitPrice: toNumericValue(line.unitPrice, 0),
              lineTotal: toNumericValue(line.lineTotal, 0),
              displayOrder: index,
            }))
          : undefined
      }
    />
  )
}
