import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBillPaymentNumber } from '@/lib/bill-payment-number'
import { logActivity } from '@/lib/activity'

const db = prisma as any

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await db.billPayment.findUnique({ where: { id }, include: { bill: { include: { vendor: true } } } })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rows = await db.billPayment.findMany({ include: { bill: { include: { vendor: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const number = await generateBillPaymentNumber()
  if (body.amount) body.amount = parseFloat(body.amount)
  if (body.date) body.date = new Date(body.date)
  const row = await db.billPayment.create({ data: { number, ...body } })
  await logActivity({ action: 'Created Bill Payment', target: number })
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await req.json()
  if (body.amount) body.amount = parseFloat(body.amount)
  if (body.date) body.date = new Date(body.date)
  const row = await db.billPayment.update({ where: { id }, data: body })
  await logActivity({ action: 'Updated Bill Payment', target: row.number })
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const row = await db.billPayment.delete({ where: { id } })
  await logActivity({ action: 'Deleted Bill Payment', target: row.number })
  return NextResponse.json({ ok: true })
}
