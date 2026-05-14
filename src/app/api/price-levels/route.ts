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

function decimal(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function dateValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

async function nextPriceLevelId() {
  const last = await prisma.priceLevel.findFirst({
    where: { priceLevelId: { not: null } },
    orderBy: { priceLevelId: 'desc' },
    select: { priceLevelId: true },
  })
  const next = last?.priceLevelId ? Number.parseInt(last.priceLevelId.replace(/\D/g, ''), 10) + 1 : 1
  return `PL-${String(Number.isFinite(next) ? next : 1).padStart(5, '0')}`
}

export async function GET() {
  const rows = await prisma.priceLevel.findMany({
    orderBy: [{ priceLevelId: 'asc' }, { name: 'asc' }],
    include: { subsidiary: true },
  })
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const created = await prisma.priceLevel.create({
      data: {
        priceLevelId: text(body?.priceLevelId) ?? await nextPriceLevelId(),
        name,
        description: text(body?.description),
        levelType: text(body?.levelType),
        subsidiaryId: text(body?.subsidiaryId),
        includeChildren: bool(body?.includeChildren),
        defaultDiscountPct: decimal(body?.defaultDiscountPct),
        minimumMarginPct: decimal(body?.minimumMarginPct),
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
    console.error('price-level create failed', error)
    return NextResponse.json({ error: 'Unable to create price level.' }, { status: 500 })
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
    for (const key of ['priceLevelId', 'description', 'levelType', 'subsidiaryId', 'approvalWorkflow'] as const) {
      if (body?.[key] !== undefined) data[key] = text(body[key])
    }
    for (const key of ['includeChildren', 'approvalRequired', 'allowManualOverride', 'inactive'] as const) {
      if (body?.[key] !== undefined) data[key] = bool(body[key], key === 'allowManualOverride')
    }
    for (const key of ['defaultDiscountPct', 'minimumMarginPct'] as const) {
      if (body?.[key] !== undefined) data[key] = decimal(body[key])
    }
    for (const key of ['effectiveStartDate', 'effectiveEndDate'] as const) {
      if (body?.[key] !== undefined) data[key] = dateValue(body[key])
    }

    const updated = await prisma.priceLevel.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('price-level update failed', error)
    return NextResponse.json({ error: 'Unable to update price level.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.priceLevel.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('price-level delete failed', error)
    return NextResponse.json({ error: 'Unable to delete price level.' }, { status: 500 })
  }
}
