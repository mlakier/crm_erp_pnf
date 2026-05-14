import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBillingMasterDataConfig, type BillingMasterDataKey } from '@/lib/billing-subscription-master-data'

function text(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).trim().toLowerCase() === 'true'
}

function intValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function decimalValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function nextBusinessId(key: BillingMasterDataKey) {
  const config = getBillingMasterDataConfig(key)
  const model = prisma[config.prismaModel] as any
  const last = await model.findFirst({
    where: { [config.idField]: { not: null } },
    orderBy: { [config.idField]: 'desc' },
    select: { [config.idField]: true },
  })
  const raw = last?.[config.idField]
  const next = raw ? Number.parseInt(String(raw).replace(/\D/g, ''), 10) + 1 : 1
  return `${config.idPrefix}-${String(Number.isFinite(next) ? next : 1).padStart(5, '0')}`
}

function buildData(key: BillingMasterDataKey, body: any, existingId?: string | null) {
  const config = getBillingMasterDataConfig(key)
  const data: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.readOnly || field.key === config.idField || body?.[field.key] === undefined) continue
    if (field.type === 'select' && field.sourceType === 'system') {
      data[field.key] = bool(body[field.key])
    } else if (field.type === 'number') {
      data[field.key] = intValue(body[field.key])
    } else if (field.type === 'money') {
      data[field.key] = decimalValue(body[field.key])
    } else {
      data[field.key] = text(body[field.key])
    }
  }
  if (!existingId) data[config.idField] = text(body?.[config.idField])
  return data
}

export async function getBillingMasterDataRows(key: BillingMasterDataKey) {
  const config = getBillingMasterDataConfig(key)
  const model = prisma[config.prismaModel] as any
  const rows = await model.findMany({ orderBy: config.orderBy, include: config.includes })
  return NextResponse.json(rows)
}

export async function createBillingMasterDataRow(key: BillingMasterDataKey, request: Request) {
  try {
    const config = getBillingMasterDataConfig(key)
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const model = prisma[config.prismaModel] as any
    const created = await model.create({
      data: {
        ...buildData(key, body),
        [config.idField]: text(body?.[config.idField]) ?? await nextBusinessId(key),
        name,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error(`${key} create failed`, error)
    return NextResponse.json({ error: `Unable to create ${getBillingMasterDataConfig(key).singularTitle}.` }, { status: 500 })
  }
}

export async function updateBillingMasterDataRow(key: BillingMasterDataKey, request: Request) {
  try {
    const config = getBillingMasterDataConfig(key)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const data = buildData(key, body, id)
    if (body?.[config.idField] !== undefined) data[config.idField] = text(body[config.idField])
    if (body?.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      data.name = name
    }

    const model = prisma[config.prismaModel] as any
    const updated = await model.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error(`${key} update failed`, error)
    return NextResponse.json({ error: `Unable to update ${getBillingMasterDataConfig(key).singularTitle}.` }, { status: 500 })
  }
}

export async function deleteBillingMasterDataRow(key: BillingMasterDataKey, request: Request) {
  try {
    const config = getBillingMasterDataConfig(key)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const model = prisma[config.prismaModel] as any
    await model.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`${key} delete failed`, error)
    return NextResponse.json({ error: `Unable to delete ${getBillingMasterDataConfig(key).singularTitle}.` }, { status: 500 })
  }
}
