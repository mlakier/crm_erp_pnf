import { prisma } from '@/lib/prisma'
import { calcLineTotal, sumMoney, toDecimal } from '@/lib/money'

export async function syncBillTotal(billId: string) {
  const lineItems = await prisma.billLineItem.findMany({
    where: { billId },
    select: {
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  })

  const nextTotal = sumMoney(
    lineItems.map((line) => {
      const quantity = Number(line.quantity)
      const unitPrice = Number(line.unitPrice)
      const lineTotal = Number(line.lineTotal)
      return Number.isFinite(lineTotal) && lineTotal > 0 ? lineTotal : calcLineTotal(quantity, unitPrice)
    }),
  )

  return prisma.bill.update({
    where: { id: billId },
    data: { total: toDecimal(nextTotal) },
    include: {
      vendor: true,
      lineItems: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
