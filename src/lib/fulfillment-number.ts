import { prisma } from '@/lib/prisma'

const db = prisma as any

export async function generateFulfillmentNumber(): Promise<string> {
  const all = await db.fulfillment.findMany({ select: { number: true } })
  const nums = all.map((f: any) => parseInt(f.number.replace('FUL-', ''), 10)).filter((n: number) => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return 'FUL-' + String(next).padStart(6, '0')
}