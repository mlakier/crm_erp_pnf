import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function text(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).trim().toLowerCase() === 'true'
}

function dateValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

async function nextPriceBookId() {
  const last = await prisma.priceBook.findFirst({
    where: { priceBookId: { not: null } },
    orderBy: { priceBookId: 'desc' },
    select: { priceBookId: true },
  })
  const next = last?.priceBookId ? Number.parseInt(last.priceBookId.replace(/\D/g, ''), 10) + 1 : 1
  return `PB-${String(Number.isFinite(next) ? next : 1).padStart(5, '0')}`
}

export async function GET() {
  const rows = await prisma.priceBook.findMany({
    orderBy: [{ priceBookId: 'asc' }, { name: 'asc' }],
    include: {
      subsidiary: true,
      currency: true,
      defaultPriceLevel: true,
    },
  })
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const created = await prisma.priceBook.create({
      data: {
        priceBookId: text(body?.priceBookId) ?? await nextPriceBookId(),
        name,
        description: text(body?.description),
        bookType: text(body?.bookType),
        subsidiaryId: text(body?.subsidiaryId),
        includeChildren: bool(body?.includeChildren),
        currencyId: text(body?.currencyId),
        defaultPriceLevelId: text(body?.defaultPriceLevelId),
        approvalRequired: bool(body?.approvalRequired),
        approvalWorkflow: text(body?.approvalWorkflow),
        allowManualOverride: bool(body?.allowManualOverride, true),
        effectiveStartDate: dateValue(body?.effectiveStartDate),
        effectiveEndDate: dateValue(body?.effectiveEndDate),
        inactive: bool(body?.inactive),
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('price-book create failed', error)
    return NextResponse.json({ error: 'Unable to create price book.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body?.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      data.name = name
    }
    for (const key of ['priceBookId', 'description', 'bookType', 'subsidiaryId', 'currencyId', 'defaultPriceLevelId', 'approvalWorkflow'] as const) {
      if (body?.[key] !== undefined) data[key] = text(body[key])
    }
    for (const key of ['includeChildren', 'approvalRequired', 'allowManualOverride', 'inactive'] as const) {
      if (body?.[key] !== undefined) data[key] = bool(body[key], key === 'allowManualOverride')
    }
    for (const key of ['effectiveStartDate', 'effectiveEndDate'] as const) {
      if (body?.[key] !== undefined) data[key] = dateValue(body[key])
    }

    const updated = await prisma.priceBook.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('price-book update failed', error)
    return NextResponse.json({ error: 'Unable to update price book.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.priceBook.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('price-book delete failed', error)
    return NextResponse.json({ error: 'Unable to delete price book.' }, { status: 500 })
  }
}
