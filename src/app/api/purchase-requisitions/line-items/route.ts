import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { toNumericValue } from '@/lib/format'
import { calcLineTotal, parseMoneyValue, parseQuantity, sumMoney } from '@/lib/money'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requisitionId, description, quantity, unitPrice, notes, itemId } = body

    if (!requisitionId || !description) {
      return NextResponse.json({ error: 'requisitionId and description are required' }, { status: 400 })
    }

    const qty = parseQuantity(quantity)
    const price = parseMoneyValue(unitPrice)
    const lineTotal = calcLineTotal(qty, price)

    const lineItem = await prisma.requisitionLineItem.create({
      data: {
        requisitionId,
        description,
        quantity: qty,
        unitPrice: price,
        lineTotal,
        notes: notes || null,
        itemId: itemId || null,
      },
    })

    // Recalculate total on the requisition
    const allItems = await prisma.requisitionLineItem.findMany({ where: { requisitionId } })
    const total = sumMoney(allItems.map((item) => toNumericValue(item.lineTotal)))
    const requisition = await prisma.requisition.update({ where: { id: requisitionId }, data: { total } })

    await logActivity({
      entityType: 'purchase-requisition',
      entityId: requisitionId,
      action: 'update',
      summary: `Added line item to purchase requisition ${requisition.number}`,
      userId: requisition.userId,
    })

    return NextResponse.json(lineItem, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create line item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing line item id' }, { status: 400 })
    }

    const body = await request.json()
    const { itemId, description, quantity, unitPrice, notes, userId } = body

    const existing = await prisma.requisitionLineItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    const parsedQuantity = parseQuantity(quantity)
    const parsedUnitPrice = parseMoneyValue(unitPrice, Number.NaN)

    if (!description || !String(description).trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      return NextResponse.json({ error: 'Unit price must be zero or greater' }, { status: 400 })
    }

    const updated = await prisma.requisitionLineItem.update({
      where: { id },
      data: {
        itemId: itemId || null,
        description: String(description).trim(),
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice,
        lineTotal: calcLineTotal(parsedQuantity, parsedUnitPrice),
        notes: notes || null,
      },
    })

    const allItems = await prisma.requisitionLineItem.findMany({ where: { requisitionId: existing.requisitionId } })
    const total = sumMoney(allItems.map((item) => toNumericValue(item.lineTotal)))
    const requisition = await prisma.requisition.update({
      where: { id: existing.requisitionId },
      data: { total },
    })

    await logActivity({
      entityType: 'purchase-requisition',
      entityId: existing.requisitionId,
      action: 'update',
      summary: `Updated line item on purchase requisition ${requisition.number}`,
      userId: userId ?? requisition.userId,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const lineItem = await prisma.requisitionLineItem.findUnique({ where: { id } })
    if (!lineItem) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.requisitionLineItem.delete({ where: { id } })

    // Recalculate total
    const allItems = await prisma.requisitionLineItem.findMany({ where: { requisitionId: lineItem.requisitionId } })
    const total = sumMoney(allItems.map((item) => toNumericValue(item.lineTotal)))
    const requisition = await prisma.requisition.update({ where: { id: lineItem.requisitionId }, data: { total } })

    await logActivity({
      entityType: 'purchase-requisition',
      entityId: lineItem.requisitionId,
      action: 'update',
      summary: `Removed line item from purchase requisition ${requisition.number}`,
      userId: requisition.userId,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
  }
}
