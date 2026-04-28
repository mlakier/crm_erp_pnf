import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBillPaymentNumber } from '@/lib/bill-payment-number'
import { logActivity, logCommunicationActivity, logFieldChangeActivities } from '@/lib/activity'
import { parseMoneyValue } from '@/lib/money'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await prisma.billPayment.findUnique({ where: { id }, include: { bill: { include: { vendor: true } } } })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rows = await prisma.billPayment.findMany({ include: { bill: { include: { vendor: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const body = await req.json()
  if (action === 'send-email') {
    const {
      billPaymentId,
      userId,
      to,
      from,
      subject,
      preview,
      attachPdf,
    } = body as {
      billPaymentId?: string
      userId?: string | null
      to?: string
      from?: string
      subject?: string
      preview?: string
      attachPdf?: boolean
    }

    if (!billPaymentId || !to?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
    }

    const payment = await prisma.billPayment.findUnique({
      where: { id: billPaymentId },
      select: { id: true },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
    }

    await logCommunicationActivity({
      entityType: 'bill-payment',
      entityId: billPaymentId,
      userId: userId ?? null,
      context: 'UI',
      channel: 'Email',
      direction: 'Outbound',
      subject: subject.trim(),
      from: from?.trim() || '-',
      to: to.trim(),
      status: attachPdf ? 'Prepared (PDF)' : 'Prepared',
      preview: preview?.trim() || '',
    })

    return NextResponse.json({ success: true })
  }
  const number = await generateBillPaymentNumber()
  if (body.amount !== undefined) body.amount = parseMoneyValue(body.amount)
  if (body.date) body.date = new Date(body.date)
  const row = await prisma.billPayment.create({ data: { number, ...body } })
  await logActivity({
    entityType: 'bill-payment',
    entityId: row.id,
    action: 'create',
    summary: `Created bill payment ${row.number}`,
  })
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await req.json()
  const before = await prisma.billPayment.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
  if (body.amount !== undefined) body.amount = parseMoneyValue(body.amount)
  if (body.date) body.date = new Date(body.date)
  const row = await prisma.billPayment.update({ where: { id }, data: body })
  const changes = [
    body.billId !== undefined && before.billId !== row.billId
      ? { fieldName: 'Bill', oldValue: before.billId, newValue: row.billId }
      : null,
    body.amount !== undefined && String(before.amount) !== String(row.amount)
      ? { fieldName: 'Amount', oldValue: String(before.amount), newValue: String(row.amount) }
      : null,
    body.date !== undefined && before.date.toISOString() !== row.date.toISOString()
      ? { fieldName: 'Date', oldValue: before.date.toISOString().slice(0, 10), newValue: row.date.toISOString().slice(0, 10) }
      : null,
    body.method !== undefined && (before.method ?? '') !== (row.method ?? '')
      ? { fieldName: 'Method', oldValue: before.method ?? '-', newValue: row.method ?? '-' }
      : null,
    body.reference !== undefined && (before.reference ?? '') !== (row.reference ?? '')
      ? { fieldName: 'Reference', oldValue: before.reference ?? '-', newValue: row.reference ?? '-' }
      : null,
    body.status !== undefined && before.status !== row.status
      ? { fieldName: 'Status', oldValue: before.status, newValue: row.status }
      : null,
    body.notes !== undefined && (before.notes ?? '') !== (row.notes ?? '')
      ? { fieldName: 'Notes', oldValue: before.notes ?? '-', newValue: row.notes ?? '-' }
      : null,
  ].filter((change): change is { fieldName: string; oldValue: string; newValue: string } => Boolean(change))

  await logFieldChangeActivities({
    entityType: 'bill-payment',
    entityId: row.id,
    context: 'Bill Payment Details',
    changes,
  })
  await logActivity({
    entityType: 'bill-payment',
    entityId: row.id,
    action: 'update',
    summary: `Updated bill payment ${row.number}`,
  })
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.billPayment.findUnique({
      where: { id },
      select: { id: true, number: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
    }

    const row = await prisma.billPayment.delete({ where: { id } })
    await logActivity({
      entityType: 'bill-payment',
      entityId: row.id,
      action: 'delete',
      summary: `Deleted bill payment ${row.number}`,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Transaction has the following child records:\n\nUnable to delete because dependent records exist.' },
      { status: 409 },
    )
  }
}
