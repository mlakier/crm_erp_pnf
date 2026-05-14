import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function text(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function decimalText(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? normalized : null
}

function dateValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

async function nextPriceBookItemId() {
  const last = await prisma.priceBookItem.findFirst({
    where: { priceBookItemId: { not: null } },
    orderBy: { priceBookItemId: 'desc' },
    select: { priceBookItemId: true },
  })
  const next = last?.priceBookItemId ? Number.parseInt(last.priceBookItemId.replace(/\D/g, ''), 10) + 1 : 1
  return `PBI-${String(Number.isFinite(next) ? next : 1).padStart(5, '0')}`
}

function cleanLinePayload(body: Record<string, unknown>) {
  const itemId = text(body.itemId)
  const unitPrice = decimalText(body.unitPrice)
  if (!itemId) return { error: 'Item is required' }
  if (!unitPrice) return { error: 'Unit price is required and must be numeric' }

  const minimumQuantity = decimalText(body.minimumQuantity)
  const maximumQuantity = decimalText(body.maximumQuantity)
  if (minimumQuantity && maximumQuantity && Number(minimumQuantity) > Number(maximumQuantity)) {
    return { error: 'Minimum quantity cannot be greater than maximum quantity' }
  }

  return {
    data: {
      itemId,
      unitPrice,
      currencyId: text(body.currencyId),
      uom: text(body.uom),
      minimumQuantity,
      maximumQuantity,
      effectiveStartDate: dateValue(body.effectiveStartDate),
      effectiveEndDate: dateValue(body.effectiveEndDate),
      status: text(body.status) ?? 'active',
      priceSource: text(body.priceSource) ?? 'manual',
      marginFloorPct: decimalText(body.marginFloorPct),
    },
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const priceBookId = searchParams.get('priceBookId')
  const rows = await prisma.priceBookItem.findMany({
    where: priceBookId ? { priceBookId } : undefined,
    orderBy: [{ item: { itemId: 'asc' } }, { minimumQuantity: 'asc' }],
    include: {
      item: { select: { id: true, itemId: true, name: true, uom: true } },
      currency: { select: { id: true, code: true, name: true } },
    },
  })
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const priceBookId = text(body.priceBookId)
    if (!priceBookId) return NextResponse.json({ error: 'Price book is required' }, { status: 400 })

    const cleaned = cleanLinePayload(body)
    if ('error' in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 })

    const created = await prisma.priceBookItem.create({
      data: {
        priceBookItemId: text(body.priceBookItemId) ?? await nextPriceBookItemId(),
        priceBookId,
        ...cleaned.data,
      },
      include: {
        item: { select: { id: true, itemId: true, name: true, uom: true } },
        currency: { select: { id: true, code: true, name: true } },
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('price-book item create failed', error)
    return NextResponse.json({ error: 'Unable to create price book item.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json() as Record<string, unknown>
    const cleaned = cleanLinePayload(body)
    if ('error' in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 })

    const updated = await prisma.priceBookItem.update({
      where: { id },
      data: {
        priceBookItemId: body.priceBookItemId !== undefined ? text(body.priceBookItemId) : undefined,
        ...cleaned.data,
      },
      include: {
        item: { select: { id: true, itemId: true, name: true, uom: true } },
        currency: { select: { id: true, code: true, name: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('price-book item update failed', error)
    return NextResponse.json({ error: 'Unable to update price book item.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.priceBookItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('price-book item delete failed', error)
    return NextResponse.json({ error: 'Unable to delete price book item.' }, { status: 500 })
  }
}
