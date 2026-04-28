import { prisma } from '@/lib/prisma'
import { loadListValues } from '@/lib/load-list-values'
import ReceiptCreatePageClient from '@/components/ReceiptCreatePageClient'
import { loadReceiptDetailCustomization } from '@/lib/receipt-detail-customization-store'

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [purchaseOrders, statusValues, customization, duplicateSource] = await Promise.all([
    prisma.purchaseOrder.findMany({
      select: { id: true, number: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    loadListValues('RECEIPT-STATUS'),
    loadReceiptDetailCustomization(),
    duplicateFrom
      ? prisma.receipt.findUnique({
          where: { id: duplicateFrom },
        })
      : Promise.resolve(null),
  ])

  return (
    <ReceiptCreatePageClient
      purchaseOrders={purchaseOrders.map((purchaseOrder) => ({
        id: purchaseOrder.id,
        number: purchaseOrder.number,
      }))}
      statusOptions={statusValues.map((value) => ({
        value: value.toLowerCase(),
        label: value,
      }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              purchaseOrderId: duplicateSource.purchaseOrderId,
              quantity: String(duplicateSource.quantity),
              date: duplicateSource.date.toISOString().slice(0, 10),
              status: duplicateSource.status,
              notes: duplicateSource.notes ?? '',
            }
          : undefined
      }
    />
  )
}
