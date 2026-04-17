import { prisma } from '@/lib/prisma'

const db = prisma as any

export async function generateBillPaymentNumber(): Promise<string> {
  const all = await db.billPayment.findMany({ select: { number: true } })
  const nums = all.map((b: any) => parseInt(b.number.replace('BP-', ''), 10)).filter((n: number) => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return 'BP-' + String(next).padStart(6, '0')
}