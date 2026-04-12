import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  ListOptionsConfig,
  ListPageKey,
  LIST_OPTIONS_DEFAULTS,
  ListValueRow,
  ListValueRowsConfig,
  mergeListConfig,
  sanitizeListValues,
} from '@/lib/list-options'

type ListInputRow = {
  id?: string
  value: string
}

type ListStoreClient = Prisma.TransactionClient | typeof prisma

function getListCode(page: ListPageKey, list: string): string {
  if (page === 'customer' && list === 'industry') return 'CUST-IND'
  if (page === 'item' && list === 'type') return 'ITEM-TYPE'
  if (page === 'lead' && list === 'source') return 'LEAD-SRC'
  if (page === 'lead' && list === 'rating') return 'LEAD-RAT'
  if (page === 'opportunity' && list === 'stage') return 'OPP-STAGE'
  throw new Error(`Unsupported list ${page}.${list}`)
}

function formatListId(code: string, sequence: number): string {
  return `LIST-${code}-${String(sequence).padStart(4, '0')}`
}

function parseListIdSequence(id: string, code: string): number | null {
  const match = id.match(new RegExp(`^LIST-${code}-(\\d{4})$`))
  if (!match) return null
  const sequence = Number.parseInt(match[1], 10)
  return Number.isNaN(sequence) ? null : sequence
}

function createSeedRows(values: string[], code: string) {
  return values.map((value, index) => ({
    id: formatListId(code, index + 1),
    value,
    sortOrder: index,
  }))
}

function toListValueRows(rows: Array<{ id: string; value: string; sortOrder: number }>): ListValueRow[] {
  return rows.map((row) => ({ id: row.id, value: row.value, sortOrder: row.sortOrder }))
}

function getListDefaults(page: ListPageKey, list: string): string[] {
  const pageDefaults = LIST_OPTIONS_DEFAULTS[page] as Record<string, string[]>
  const fallback = pageDefaults[Object.keys(pageDefaults)[0] ?? ''] ?? []
  return pageDefaults[list] ?? fallback
}

function sanitizeListRows(rows: unknown, values: unknown, fallback: string[]): ListInputRow[] {
  if (Array.isArray(rows)) {
    const normalized: ListInputRow[] = []

    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return
      const input = row as { id?: unknown; value?: unknown }
      const value = String(input.value ?? '').trim()
      if (!value) return

      const id = input.id === undefined || input.id === null ? undefined : String(input.id).trim()
      normalized.push({ id: id || undefined, value })
    })

    const deduped: ListInputRow[] = []
    for (const row of normalized) {
      if (!deduped.some((existing) => existing.value === row.value)) {
        deduped.push(row)
      }
    }

    if (deduped.length > 0) return deduped
  }

  return sanitizeListValues(values, fallback).map((value) => ({ value }))
}

function assignListIds(rows: ListInputRow[], currentRows: ListValueRow[], code: string) {
  const validCurrentSequences = currentRows
    .map((row) => parseListIdSequence(row.id, code))
    .filter((sequence): sequence is number => sequence !== null)

  const validInputSequences = rows
    .map((row) => (row.id ? parseListIdSequence(row.id, code) : null))
    .filter((sequence): sequence is number => sequence !== null)

  let nextSequence = Math.max(0, ...validCurrentSequences, ...validInputSequences) + 1
  const assigned = new Set<number>()

  const currentByValue = new Map<string, ListValueRow>()
  for (const row of currentRows) {
    if (!currentByValue.has(row.value)) {
      currentByValue.set(row.value, row)
    }
  }

  return rows.map((row, sortOrder) => {
    let sequence: number | null = null

    if (row.id) {
      const parsed = parseListIdSequence(row.id, code)
      if (parsed !== null && !assigned.has(parsed)) {
        sequence = parsed
      }
    }

    if (sequence === null) {
      const byValue = currentByValue.get(row.value)
      if (byValue) {
        const parsed = parseListIdSequence(byValue.id, code)
        if (parsed !== null && !assigned.has(parsed)) {
          sequence = parsed
        }
      }
    }

    if (sequence === null) {
      while (assigned.has(nextSequence)) {
        nextSequence += 1
      }
      sequence = nextSequence
      nextSequence += 1
    }

    assigned.add(sequence)

    return {
      id: formatListId(code, sequence),
      value: row.value,
      sortOrder,
    }
  })
}

async function readListRows(
  client: ListStoreClient,
  page: ListPageKey,
  list: string
): Promise<ListValueRow[]> {
  switch (page) {
    case 'customer': {
      if (list !== 'industry') break
      const rows = await client.customerIndustryOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
      return toListValueRows(rows)
    }
    case 'item': {
      if (list !== 'type') break
      const rows = await client.itemTypeOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
      return toListValueRows(rows)
    }
    case 'lead': {
      if (list === 'source') {
        const rows = await client.leadSourceOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
        return toListValueRows(rows)
      }

      if (list === 'rating') {
        const rows = await client.leadRatingOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
        return toListValueRows(rows)
      }

      break
    }
    case 'opportunity': {
      if (list !== 'stage') break
      const rows = await client.opportunityStageOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] })
      return toListValueRows(rows)
    }
  }

  throw new Error(`Unsupported list ${page}.${list}`)
}

async function replaceSingleList(
  tx: Prisma.TransactionClient,
  page: ListPageKey,
  list: string,
  values: unknown,
  rows: unknown
) {
  const currentRows = await readListRows(tx, page, list)
  const fallback = getListDefaults(page, list)
  const nextRows = sanitizeListRows(rows, values, fallback)
  const code = getListCode(page, list)
  const data = assignListIds(nextRows, currentRows, code)

  switch (page) {
    case 'customer': {
      if (list !== 'industry') break
      await tx.customerIndustryOption.deleteMany()
      await tx.customerIndustryOption.createMany({ data })
      return
    }
    case 'item': {
      if (list !== 'type') break
      await tx.itemTypeOption.deleteMany()
      await tx.itemTypeOption.createMany({ data })
      return
    }
    case 'lead': {
      if (list === 'source') {
        await tx.leadSourceOption.deleteMany()
        await tx.leadSourceOption.createMany({ data })
        return
      }

      if (list === 'rating') {
        await tx.leadRatingOption.deleteMany()
        await tx.leadRatingOption.createMany({ data })
        return
      }

      break
    }
    case 'opportunity': {
      if (list !== 'stage') break
      await tx.opportunityStageOption.deleteMany()
      await tx.opportunityStageOption.createMany({ data })
      return
    }
  }

  throw new Error(`Unsupported list ${page}.${list}`)
}

async function ensureDefaults() {
  const defaults = LIST_OPTIONS_DEFAULTS

  const [customerCount, itemCount, leadSourceCount, leadRatingCount, opportunityStageCount] = await Promise.all([
    prisma.customerIndustryOption.count(),
    prisma.itemTypeOption.count(),
    prisma.leadSourceOption.count(),
    prisma.leadRatingOption.count(),
    prisma.opportunityStageOption.count(),
  ])

  const operations: Array<Promise<unknown>> = []

  if (customerCount === 0) {
    operations.push(
      prisma.customerIndustryOption.createMany({
        data: createSeedRows(defaults.customer.industry, 'IND'),
      })
    )
  }

  if (itemCount === 0) {
    operations.push(
      prisma.itemTypeOption.createMany({
        data: createSeedRows(defaults.item.type, 'TYP'),
      })
    )
  }

  if (leadSourceCount === 0) {
    operations.push(
      prisma.leadSourceOption.createMany({
        data: createSeedRows(defaults.lead.source, 'SRC'),
      })
    )
  }

  if (leadRatingCount === 0) {
    operations.push(
      prisma.leadRatingOption.createMany({
        data: createSeedRows(defaults.lead.rating, 'RAT'),
      })
    )
  }

  if (opportunityStageCount === 0) {
    operations.push(
      prisma.opportunityStageOption.createMany({
        data: createSeedRows(defaults.opportunity.stage, 'STG'),
      })
    )
  }

  if (operations.length > 0) {
    await Promise.all(operations)
  }

  await normalizeLegacyIds()
}

async function normalizeLegacyIds() {
  await prisma.$transaction(async (tx) => {
    const targets: Array<{ page: ListPageKey; list: string }> = [
      { page: 'customer', list: 'industry' },
      { page: 'item', list: 'type' },
      { page: 'lead', list: 'source' },
      { page: 'lead', list: 'rating' },
      { page: 'opportunity', list: 'stage' },
    ]

    for (const target of targets) {
      const code = getListCode(target.page, target.list)
      const rows = await readListRows(tx, target.page, target.list)
      const hasLegacyIds = rows.some((row) => parseListIdSequence(row.id, code) === null)
      if (!hasLegacyIds) continue

      const values = rows.map((row) => row.value)
      await replaceSingleList(tx, target.page, target.list, values, rows)
    }
  })
}

function rowsToConfig(rows: ListValueRowsConfig): ListOptionsConfig {
  return mergeListConfig({
    customer: { industry: rows.customer.industry.map((row) => row.value) },
    item: { type: rows.item.type.map((row) => row.value) },
    lead: {
      source: rows.lead.source.map((row) => row.value),
      rating: rows.lead.rating.map((row) => row.value),
    },
    opportunity: { stage: rows.opportunity.stage.map((row) => row.value) },
  })
}

export async function loadListOptionRows(): Promise<ListValueRowsConfig> {
  await ensureDefaults()

  const [customerIndustry, itemType, leadSource, leadRating, opportunityStage] = await Promise.all([
    readListRows(prisma, 'customer', 'industry'),
    readListRows(prisma, 'item', 'type'),
    readListRows(prisma, 'lead', 'source'),
    readListRows(prisma, 'lead', 'rating'),
    readListRows(prisma, 'opportunity', 'stage'),
  ])

  return {
    customer: { industry: customerIndustry },
    item: { type: itemType },
    lead: { source: leadSource, rating: leadRating },
    opportunity: { stage: opportunityStage },
  }
}

export async function loadListOptions(): Promise<ListOptionsConfig> {
  const rows = await loadListOptionRows()
  return rowsToConfig(rows)
}

export async function saveListOptions(nextConfig: unknown): Promise<ListOptionsConfig> {
  const merged = mergeListConfig(nextConfig)

  await prisma.$transaction(async (tx) => {
    await replaceSingleList(tx, 'customer', 'industry', merged.customer.industry, undefined)
    await replaceSingleList(tx, 'item', 'type', merged.item.type, undefined)
    await replaceSingleList(tx, 'lead', 'source', merged.lead.source, undefined)
    await replaceSingleList(tx, 'lead', 'rating', merged.lead.rating, undefined)
    await replaceSingleList(tx, 'opportunity', 'stage', merged.opportunity.stage, undefined)
  })

  return merged
}

export async function updateSingleList(
  page: ListPageKey,
  list: string,
  values: unknown,
  rows?: unknown
): Promise<{ config: ListOptionsConfig; rows: ListValueRowsConfig }> {
  const defaults = mergeListConfig({})[page] as Record<string, string[]>

  if (!Object.prototype.hasOwnProperty.call(defaults, list)) {
    const [config, listRows] = await Promise.all([loadListOptions(), loadListOptionRows()])
    return { config, rows: listRows }
  }

  await ensureDefaults()
  await prisma.$transaction(async (tx) => {
    await replaceSingleList(tx, page, list, values, rows)
  })

  const [config, listRows] = await Promise.all([loadListOptions(), loadListOptionRows()])
  return { config, rows: listRows }
}
