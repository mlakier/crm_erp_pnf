import { prisma } from '@/lib/prisma'

function parseSequence(value: string | null | undefined) {
  if (!value) return 0
  const match = value.match(/^CRF-(\d+)$/i)
  return match ? Number.parseInt(match[1], 10) || 0 : 0
}

export async function generateCustomerRefundNumber(): Promise<string> {
  const existing = await prisma.customerRefund.findMany({
    where: { number: { startsWith: 'CRF-' } },
    select: { number: true },
    orderBy: { number: 'desc' },
    take: 200,
  })

  const nextSequence = existing.reduce((max, record) => Math.max(max, parseSequence(record.number)), 0) + 1
  return `CRF-${nextSequence}`
}
