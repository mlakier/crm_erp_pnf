import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, logCommunicationActivity, logFieldChangeActivities } from '@/lib/activity'
import { canReceivePurchaseOrderLine } from '@/lib/item-business-rules'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json()
    if (searchParams.get('action') === 'send-email') {
      const {
        receiptId,
        userId,
        to,
        from,
        subject,
        preview,
        attachPdf,
      } = body as {
        receiptId?: string
        userId?: string | null
        to?: string
        from?: string
        subject?: string
        preview?: string
        attachPdf?: boolean
      }

      if (!receiptId || !to?.trim() || !subject?.trim()) {
        return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
      }

      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        select: { id: true },
      })

      if (!receipt) {
        return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
      }

      await logCommunicationActivity({
        entityType: 'receipt',
        entityId: receiptId,
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

    const { purchaseOrderId, quantity, date, status, notes, userId } = body

    if (!purchaseOrderId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedQuantity = Number.parseInt(String(quantity), 10)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 })
    }

    const purchaseOrderForReceipt = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: {
        number: true,
        lineItems: {
          select: {
            id: true,
            item: { select: { dropShipItem: true, specialOrderItem: true } },
          },
        },
      },
    })

    if (!purchaseOrderForReceipt) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const hasReceivableLine = purchaseOrderForReceipt.lineItems.some((line) => canReceivePurchaseOrderLine(line.item))
    if (!hasReceivableLine) {
      return NextResponse.json({ error: 'This purchase order has no receivable lines. Drop ship items cannot be received.' }, { status: 400 })
    }

    const receipt = await prisma.receipt.create({
      data: {
        purchaseOrderId,
        quantity: parsedQuantity,
        date: date ? new Date(date) : new Date(),
        status: status || 'pending',
        notes: notes || null,
      },
    })

    await logActivity({
      entityType: 'receipt',
      entityId: receipt.id,
      action: 'create',
      summary: `Created receipt ${receipt.id}`,
      userId,
    })

    await logActivity({
      entityType: 'purchase-order',
      entityId: purchaseOrderId,
      action: 'update',
      summary: `Recorded receipt for purchase order ${purchaseOrderForReceipt.number ?? purchaseOrderId}`,
      userId,
    })

    return NextResponse.json(receipt, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing receipt id' }, { status: 400 })
    }

    const existing = await prisma.receipt.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    await prisma.receipt.delete({ where: { id } })

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: existing.purchaseOrderId },
      select: { number: true, userId: true },
    })

    await logActivity({
      entityType: 'receipt',
      entityId: existing.id,
      action: 'delete',
      summary: `Deleted receipt ${existing.id}`,
      userId: purchaseOrder?.userId,
    })

    await logActivity({
      entityType: 'purchase-order',
      entityId: existing.purchaseOrderId,
      action: 'update',
      summary: `Deleted receipt from purchase order ${purchaseOrder?.number ?? existing.purchaseOrderId}`,
      userId: purchaseOrder?.userId,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing receipt id' }, { status: 400 })

    const body = await request.json()
    const before = await prisma.receipt.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.quantity !== undefined) data.quantity = Number(body.quantity)
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.date !== undefined) data.date = new Date(body.date)

    const receipt = await prisma.receipt.update({ where: { id }, data })

    const changes = [
      body.status !== undefined && before.status !== receipt.status
        ? { fieldName: 'Status', oldValue: before.status, newValue: receipt.status }
        : null,
      body.quantity !== undefined && before.quantity !== receipt.quantity
        ? { fieldName: 'Quantity', oldValue: String(before.quantity), newValue: String(receipt.quantity) }
        : null,
      body.notes !== undefined && (before.notes ?? '') !== (receipt.notes ?? '')
        ? { fieldName: 'Notes', oldValue: before.notes ?? '-', newValue: receipt.notes ?? '-' }
        : null,
      body.date !== undefined && before.date.toISOString() !== receipt.date.toISOString()
        ? { fieldName: 'Date', oldValue: before.date.toISOString().slice(0, 10), newValue: receipt.date.toISOString().slice(0, 10) }
        : null,
    ].filter((change): change is { fieldName: string; oldValue: string; newValue: string } => Boolean(change))

    await logFieldChangeActivities({
      entityType: 'receipt',
      entityId: receipt.id,
      context: 'Receipt Details',
      changes,
    })

    await logActivity({
      entityType: 'receipt',
      entityId: receipt.id,
      action: 'update',
      summary: `Updated receipt ${id}`,
    })

    return NextResponse.json(receipt)
  } catch {
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 })
  }
}
