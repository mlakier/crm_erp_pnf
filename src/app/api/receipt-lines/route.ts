import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { canReceivePurchaseOrderLine } from '@/lib/item-business-rules'
import { syncReceiptQuantity } from '@/lib/receipt-quantity'

function parseQuantity(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

async function getOpenQuantityForPurchaseOrderLine(
  purchaseOrderLineItemId: string,
  currentReceiptLineId?: string,
) {
  const purchaseOrderLine = await prisma.purchaseOrderLineItem.findUnique({
    where: { id: purchaseOrderLineItemId },
    include: {
      item: {
        select: {
          dropShipItem: true,
          specialOrderItem: true,
        },
      },
      receiptLines: {
        select: { id: true, quantity: true },
      },
    },
  })

  if (!purchaseOrderLine) return null
  if (!canReceivePurchaseOrderLine(purchaseOrderLine.item)) {
    return { purchaseOrderLine, openQuantity: 0, receivable: false }
  }

  const alreadyReceived = purchaseOrderLine.receiptLines.reduce(
    (sum, line) => sum + (line.id === currentReceiptLineId ? 0 : line.quantity),
    0,
  )

  return {
    purchaseOrderLine,
    openQuantity: Math.max(0, purchaseOrderLine.quantity - alreadyReceived),
    receivable: true,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const receiptId = typeof body.receiptId === 'string' ? body.receiptId.trim() : ''
    const purchaseOrderLineItemId =
      typeof body.purchaseOrderLineItemId === 'string' ? body.purchaseOrderLineItemId.trim() : ''
    const quantity = parseQuantity(body.quantity)
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    const userId = typeof body.userId === 'string' ? body.userId : null

    if (!receiptId || !purchaseOrderLineItemId || quantity <= 0) {
      return NextResponse.json(
        { error: 'receiptId, purchaseOrderLineItemId, and quantity are required' },
        { status: 400 },
      )
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { purchaseOrder: { select: { userId: true, number: true } } },
    })
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const availability = await getOpenQuantityForPurchaseOrderLine(purchaseOrderLineItemId)
    if (!availability) {
      return NextResponse.json({ error: 'Purchase order line not found' }, { status: 404 })
    }
    if (!availability.receivable) {
      return NextResponse.json({ error: 'This purchase order line cannot be received' }, { status: 400 })
    }
    if (quantity > availability.openQuantity) {
      return NextResponse.json({ error: 'Receipt quantity exceeds the remaining open quantity' }, { status: 400 })
    }

    const line = await prisma.receiptLine.create({
      data: {
        receiptId,
        purchaseOrderLineItemId,
        quantity,
        notes,
      },
    })

    await syncReceiptQuantity(receiptId)

    await logActivity({
      entityType: 'receipt',
      entityId: receiptId,
      action: 'update',
      summary: `Added receipt line to ${receipt.purchaseOrder.number ?? receiptId}`,
      userId: userId ?? receipt.purchaseOrder?.userId,
    })

    return NextResponse.json(line, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create receipt line' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing receipt line id' }, { status: 400 })
    }

    const body = await request.json()
    const purchaseOrderLineItemId =
      typeof body.purchaseOrderLineItemId === 'string' ? body.purchaseOrderLineItemId.trim() : ''
    const quantity = parseQuantity(body.quantity)
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    const userId = typeof body.userId === 'string' ? body.userId : null

    const existing = await prisma.receiptLine.findUnique({
      where: { id },
      include: {
        receipt: {
          include: {
            purchaseOrder: { select: { userId: true, number: true } },
          },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Receipt line not found' }, { status: 404 })
    }

    if (!purchaseOrderLineItemId || quantity <= 0) {
      return NextResponse.json(
        { error: 'purchaseOrderLineItemId and quantity are required' },
        { status: 400 },
      )
    }

    const availability = await getOpenQuantityForPurchaseOrderLine(purchaseOrderLineItemId, id)
    if (!availability) {
      return NextResponse.json({ error: 'Purchase order line not found' }, { status: 404 })
    }
    if (!availability.receivable) {
      return NextResponse.json({ error: 'This purchase order line cannot be received' }, { status: 400 })
    }
    if (quantity > availability.openQuantity) {
      return NextResponse.json({ error: 'Receipt quantity exceeds the remaining open quantity' }, { status: 400 })
    }

    const updated = await prisma.receiptLine.update({
      where: { id },
      data: {
        purchaseOrderLineItemId,
        quantity,
        notes,
      },
    })

    await syncReceiptQuantity(existing.receiptId)

    await logActivity({
      entityType: 'receipt',
      entityId: existing.receiptId,
      action: 'update',
      summary: `Updated receipt line on ${existing.receipt.purchaseOrder.number ?? existing.receiptId}`,
      userId: userId ?? existing.receipt.purchaseOrder?.userId,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update receipt line' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing receipt line id' }, { status: 400 })
    }

    const existing = await prisma.receiptLine.findUnique({
      where: { id },
      include: {
        receipt: {
          include: {
            purchaseOrder: { select: { userId: true, number: true } },
          },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Receipt line not found' }, { status: 404 })
    }

    await prisma.receiptLine.delete({ where: { id } })
    await syncReceiptQuantity(existing.receiptId)

    await logActivity({
      entityType: 'receipt',
      entityId: existing.receiptId,
      action: 'update',
      summary: `Removed receipt line from ${existing.receipt.purchaseOrder.number ?? existing.receiptId}`,
      userId: existing.receipt.purchaseOrder?.userId,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete receipt line' }, { status: 500 })
  }
}
