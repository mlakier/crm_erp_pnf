import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isFieldRequiredServer } from '@/lib/form-requirements-store'

export async function GET() {
  const data = await prisma.item.findMany({
    include: {
      currency: true,
      entity: true,
      defaultRevRecTemplate: true,
      incomeAccount: true,
      deferredRevenueAccount: true,
      inventoryAccount: true,
      cogsExpenseAccount: true,
      deferredCostAccount: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    const itemId = String(body?.itemId ?? '').trim() || null
    const sku = String(body?.sku ?? '').trim() || null
    const itemType = String(body?.itemType ?? 'service').trim() || 'service'
    const uom = String(body?.uom ?? '').trim() || null
    const listPrice = Number(body?.listPrice ?? 0)
    const revenueStream = String(body?.revenueStream ?? '').trim() || null
    const recognitionMethod = String(body?.recognitionMethod ?? '').trim() || null
    const recognitionTrigger = String(body?.recognitionTrigger ?? '').trim() || null
    const defaultRevRecTemplateId = String(body?.defaultRevRecTemplateId ?? '').trim() || null
    const defaultTermMonthsRaw = String(body?.defaultTermMonths ?? '').trim()
    const defaultTermMonths = defaultTermMonthsRaw ? Number(defaultTermMonthsRaw) : null
    const standaloneSellingPriceRaw = String(body?.standaloneSellingPrice ?? '').trim()
    const standaloneSellingPrice = standaloneSellingPriceRaw ? Number(standaloneSellingPriceRaw) : null
    const billingType = String(body?.billingType ?? '').trim() || null
    const standardCostRaw = String(body?.standardCost ?? '').trim()
    const standardCost = standardCostRaw ? Number(standardCostRaw) : null
    const averageCostRaw = String(body?.averageCost ?? '').trim()
    const averageCost = averageCostRaw ? Number(averageCostRaw) : null
    const currencyId = String(body?.currencyId ?? '').trim() || null
    const entityId = String(body?.entityId ?? '').trim() || null
    const incomeAccountId = String(body?.incomeAccountId ?? '').trim() || null
    const deferredRevenueAccountId = String(body?.deferredRevenueAccountId ?? '').trim() || null
    const inventoryAccountId = String(body?.inventoryAccountId ?? '').trim() || null
    const cogsExpenseAccountId = String(body?.cogsExpenseAccountId ?? '').trim() || null
    const deferredCostAccountId = String(body?.deferredCostAccountId ?? '').trim() || null
    const directRevenuePosting = String(body?.directRevenuePosting ?? 'false').trim().toLowerCase() === 'true'
    const inactive = String(body?.inactive ?? 'false').trim().toLowerCase() === 'true'

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const missing: string[] = []
    const requiredFields = [
      ['name', name],
      ['itemId', itemId],
      ['sku', sku],
      ['itemType', itemType],
      ['uom', uom],
      ['listPrice', String(body?.listPrice ?? '')],
      ['revenueStream', revenueStream],
      ['recognitionMethod', recognitionMethod],
      ['recognitionTrigger', recognitionTrigger],
      ['defaultRevRecTemplateId', defaultRevRecTemplateId],
      ['defaultTermMonths', defaultTermMonthsRaw],
      ['standaloneSellingPrice', standaloneSellingPriceRaw],
      ['billingType', billingType],
      ['standardCost', standardCostRaw],
      ['averageCost', averageCostRaw],
      ['entityId', entityId],
      ['currencyId', currencyId],
      ['incomeAccountId', incomeAccountId],
      ['inventoryAccountId', inventoryAccountId],
      ['cogsExpenseAccountId', cogsExpenseAccountId],
    ] as const

    for (const [fieldName, fieldValue] of requiredFields) {
      if ((await isFieldRequiredServer('itemCreate', fieldName)) && !String(fieldValue ?? '').trim()) {
        missing.push(fieldName)
      }
    }

    if ((await isFieldRequiredServer('itemCreate', 'deferredRevenueAccountId')) && !directRevenuePosting && !deferredRevenueAccountId) {
      missing.push('deferredRevenueAccountId')
    }

    if ((await isFieldRequiredServer('itemCreate', 'deferredCostAccountId')) && !directRevenuePosting && !deferredCostAccountId) {
      missing.push('deferredCostAccountId')
    }

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    const normalizedDeferredRevenueAccountId = directRevenuePosting ? null : deferredRevenueAccountId
    const normalizedDeferredCostAccountId = directRevenuePosting ? null : deferredCostAccountId

    const created = await prisma.item.create({
      data: {
        name,
        itemId,
        sku,
        itemType,
        uom,
        listPrice: Number.isFinite(listPrice) ? listPrice : 0,
        revenueStream,
        recognitionMethod,
        recognitionTrigger,
        defaultRevRecTemplateId,
        defaultTermMonths: Number.isFinite(defaultTermMonths) ? defaultTermMonths : null,
        standaloneSellingPrice: Number.isFinite(standaloneSellingPrice) ? standaloneSellingPrice : null,
        billingType,
        standardCost: Number.isFinite(standardCost) ? standardCost : null,
        averageCost: Number.isFinite(averageCost) ? averageCost : null,
        currencyId,
        entityId,
        incomeAccountId,
        deferredRevenueAccountId: normalizedDeferredRevenueAccountId,
        inventoryAccountId,
        cogsExpenseAccountId,
        deferredCostAccountId: normalizedDeferredCostAccountId,
        directRevenuePosting,
        active: !inactive,
      },
      include: {
        currency: true,
        entity: true,
        defaultRevRecTemplate: true,
        incomeAccount: true,
        deferredRevenueAccount: true,
        inventoryAccount: true,
        cogsExpenseAccount: true,
        deferredCostAccount: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create item.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const name = body?.name !== undefined ? String(body.name).trim() : undefined
    const itemId = body?.itemId !== undefined ? (String(body.itemId).trim() || null) : undefined
    const sku = body?.sku !== undefined ? (String(body.sku).trim() || null) : undefined
    const itemType = body?.itemType !== undefined ? String(body.itemType).trim() : undefined
    const uom = body?.uom !== undefined ? (String(body.uom).trim() || null) : undefined
    const listPrice = body?.listPrice !== undefined ? Number(body.listPrice) : undefined
    const description = body?.description !== undefined ? (String(body.description).trim() || null) : undefined
    const revenueStream = body?.revenueStream !== undefined ? (String(body.revenueStream).trim() || null) : undefined
    const recognitionMethod = body?.recognitionMethod !== undefined ? (String(body.recognitionMethod).trim() || null) : undefined
    const recognitionTrigger = body?.recognitionTrigger !== undefined ? (String(body.recognitionTrigger).trim() || null) : undefined
    const defaultRevRecTemplateId = body?.defaultRevRecTemplateId !== undefined ? (String(body.defaultRevRecTemplateId).trim() || null) : undefined
    const defaultTermMonths = body?.defaultTermMonths !== undefined
      ? (String(body.defaultTermMonths).trim() ? Number(body.defaultTermMonths) : null)
      : undefined
    const standaloneSellingPrice = body?.standaloneSellingPrice !== undefined
      ? (String(body.standaloneSellingPrice).trim() ? Number(body.standaloneSellingPrice) : null)
      : undefined
    const billingType = body?.billingType !== undefined ? (String(body.billingType).trim() || null) : undefined
    const standardCost = body?.standardCost !== undefined
      ? (String(body.standardCost).trim() ? Number(body.standardCost) : null)
      : undefined
    const averageCost = body?.averageCost !== undefined
      ? (String(body.averageCost).trim() ? Number(body.averageCost) : null)
      : undefined
    const currencyId = body?.currencyId !== undefined ? (String(body.currencyId).trim() || null) : undefined
    const entityId = body?.entityId !== undefined ? (String(body.entityId).trim() || null) : undefined
    const incomeAccountId = body?.incomeAccountId !== undefined ? (String(body.incomeAccountId).trim() || null) : undefined
    const deferredRevenueAccountId = body?.deferredRevenueAccountId !== undefined ? (String(body.deferredRevenueAccountId).trim() || null) : undefined
    const inventoryAccountId = body?.inventoryAccountId !== undefined ? (String(body.inventoryAccountId).trim() || null) : undefined
    const cogsExpenseAccountId = body?.cogsExpenseAccountId !== undefined ? (String(body.cogsExpenseAccountId).trim() || null) : undefined
    const deferredCostAccountId = body?.deferredCostAccountId !== undefined ? (String(body.deferredCostAccountId).trim() || null) : undefined
    const directRevenuePosting = body?.directRevenuePosting !== undefined
      ? String(body.directRevenuePosting).trim().toLowerCase() === 'true'
      : undefined
    const inactive = body?.inactive !== undefined
      ? String(body.inactive).trim().toLowerCase() === 'true'
      : undefined
    const active = inactive !== undefined
      ? !inactive
      : body?.active !== undefined
        ? String(body.active).trim().toLowerCase() === 'true'
        : undefined

    const normalizedDeferredRevenueAccountId = directRevenuePosting === true
      ? null
      : deferredRevenueAccountId
    const normalizedDeferredCostAccountId = directRevenuePosting === true
      ? null
      : deferredCostAccountId

    const updated = await prisma.item.update({
      where: { id },
      data: Object.fromEntries(
        Object.entries({
          name,
          itemId,
          sku,
          itemType,
          uom,
          listPrice,
          description,
          revenueStream,
          recognitionMethod,
          recognitionTrigger,
          defaultRevRecTemplateId,
          defaultTermMonths,
          standaloneSellingPrice,
          billingType,
          standardCost,
          averageCost,
          currencyId,
          entityId,
          incomeAccountId,
          deferredRevenueAccountId: normalizedDeferredRevenueAccountId,
          inventoryAccountId,
          cogsExpenseAccountId,
          deferredCostAccountId: normalizedDeferredCostAccountId,
          directRevenuePosting,
          active,
        }).filter(([, value]) => value !== undefined)
      ),
      include: {
        currency: true,
        entity: true,
        defaultRevRecTemplate: true,
        incomeAccount: true,
        deferredRevenueAccount: true,
        inventoryAccount: true,
        cogsExpenseAccount: true,
        deferredCostAccount: true,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unable to update item.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.item.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete item.' }, { status: 500 })
  }
}
