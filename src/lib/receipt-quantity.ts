import { prisma } from '@/lib/prisma'

export async function syncReceiptQuantity(receiptId: string) {
  const lines = await prisma.receiptLine.findMany({
    where: { receiptId },
    select: { quantity: true },
  })
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  return prisma.receipt.update({
    where: { id: receiptId },
    data: { quantity },
  })
}
