import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import {
  getManagedListDefinition,
  loadManagedListDefinitions,
  normalizeManagedListKey,
} from '@/lib/managed-list-registry'
import {
  getManagedListDefaultRowColorTone,
  supportsManagedListRowColorTones,
} from '@/lib/managed-list-color-tones'
import type { TransactionStatusColorTone } from '@/lib/company-preferences-definitions'

const DISPLAY_ORDER_PATH = join(process.cwd(), 'config', 'list-display-order.json')
const CUSTOM_LISTS_PATH = join(process.cwd(), 'config', 'custom-lists.json')
const ROW_METADATA_PATH = join(process.cwd(), 'config', 'managed-list-row-metadata.json')

export type ManagedListRow = {
  id: string
  value: string
  sortOrder: number
  colorTone?: TransactionStatusColorTone
}

export type ManagedListSummary = {
  key: string
  label: string
  whereUsed: string[]
  displayOrder: 'list' | 'alpha'
  valueCount: number
  systemManaged: boolean
}

type CustomList = { key: string; label: string; whereUsed: string[] }
type ManagedListRowMetadata = Record<string, Record<string, { colorTone?: TransactionStatusColorTone }>>

function readDisplayOrder(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(DISPLAY_ORDER_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeDisplayOrder(data: Record<string, string>) {
  writeFileSync(DISPLAY_ORDER_PATH, JSON.stringify(data, null, 2))
}

function readCustomLists(): CustomList[] {
  try {
    const data = JSON.parse(readFileSync(CUSTOM_LISTS_PATH, 'utf-8'))
    return Array.isArray(data.lists) ? data.lists : []
  } catch {
    return []
  }
}

function writeCustomLists(lists: CustomList[]) {
  writeFileSync(CUSTOM_LISTS_PATH, JSON.stringify({ lists }, null, 2))
}

function readRowMetadata(): ManagedListRowMetadata {
  try {
    const data = JSON.parse(readFileSync(ROW_METADATA_PATH, 'utf-8'))
    return data && typeof data === 'object' ? (data as ManagedListRowMetadata) : {}
  } catch {
    return {}
  }
}

function writeRowMetadata(metadata: ManagedListRowMetadata) {
  writeFileSync(ROW_METADATA_PATH, JSON.stringify(metadata, null, 2))
}

function supportsRowColorTones(key: string) {
  return supportsManagedListRowColorTones(key)
}

function normalizeColorTone(value: unknown): TransactionStatusColorTone | undefined {
  return value === 'default'
    || value === 'gray'
    || value === 'accent'
    || value === 'teal'
    || value === 'yellow'
    || value === 'orange'
    || value === 'green'
    || value === 'red'
    || value === 'purple'
    || value === 'pink'
    ? value
    : undefined
}

function formatListId(code: string, sequence: number): string {
  return `LIST-${code}-${String(sequence).padStart(4, '0')}`
}

function parseListIdSequence(id: string, code: string): number | null {
  const match = id.match(new RegExp(`^LIST-${code}-(\\d{4})$`))
  if (!match) return null
  const seq = Number.parseInt(match[1], 10)
  return Number.isNaN(seq) ? null : seq
}

function fallbackLabelForKey(key: string) {
  return key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function getManagedListLabel(key: string) {
  const normalizedKey = normalizeManagedListKey(key)
  const registryDefinition = getManagedListDefinition(normalizedKey)
  if (registryDefinition) return registryDefinition.label
  const custom = readCustomLists().find((list) => normalizeManagedListKey(list.key) === normalizedKey)
  return custom?.label ?? fallbackLabelForKey(normalizedKey)
}

export function getManagedListWhereUsed(key: string) {
  const normalizedKey = normalizeManagedListKey(key)
  const registryDefinition = getManagedListDefinition(normalizedKey)
  if (registryDefinition) return registryDefinition.whereUsed
  const custom = readCustomLists().find((list) => normalizeManagedListKey(list.key) === normalizedKey)
  return custom?.whereUsed ?? []
}

export function isRegistryManagedList(key: string) {
  return Boolean(getManagedListDefinition(normalizeManagedListKey(key)))
}

export async function ensureRegisteredManagedLists() {
  const definitions = loadManagedListDefinitions()

  for (const definition of definitions) {
    const key = normalizeManagedListKey(definition.key)
    if (!definition.defaultValues || definition.defaultValues.length === 0) continue

    const existingRows = await prisma.listOption.findMany({
      where: { key },
      orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
      select: { listId: true, value: true, sortOrder: true },
    })

    if (existingRows.length === 0) {
      await prisma.listOption.createMany({
        data: definition.defaultValues.map((value, index) => ({
          key,
          listId: formatListId(key, index + 1),
          value,
          label: value,
          sortOrder: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })
      continue
    }

    const existingValues = new Set(existingRows.map((row) => row.value.trim().toLowerCase()))
    const currentMaxSeq = existingRows
      .map((row) => parseListIdSequence(row.listId, key))
      .filter((sequence): sequence is number => sequence !== null)
    let nextSeq = Math.max(0, ...currentMaxSeq) + 1
    let nextSortOrder = Math.max(-1, ...existingRows.map((row) => row.sortOrder)) + 1

    const missingDefaults = definition.defaultValues.filter(
      (value) => !existingValues.has(value.trim().toLowerCase()),
    )
    if (missingDefaults.length === 0) continue

    await prisma.listOption.createMany({
      data: missingDefaults.map((value) => ({
        key,
        listId: formatListId(key, nextSeq++),
        value,
        label: value,
        sortOrder: nextSortOrder++,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    })
  }
}

export async function loadManagedListsState() {
  await ensureRegisteredManagedLists()
  const rowMetadata = readRowMetadata()

  const allOptions = await prisma.listOption.findMany({
    orderBy: [{ key: 'asc' }, { sortOrder: 'asc' }, { value: 'asc' }],
  })

  const rowsByKey = new Map<string, ManagedListRow[]>()
  for (const row of allOptions) {
    if (!rowsByKey.has(row.key)) rowsByKey.set(row.key, [])
    rowsByKey.get(row.key)!.push({
      id: row.listId,
      value: row.value,
      sortOrder: row.sortOrder,
      colorTone:
        normalizeColorTone(rowMetadata[row.key]?.[row.listId]?.colorTone)
        ?? getManagedListDefaultRowColorTone(row.key, row.value),
    })
  }

  const displayOrderConfig = readDisplayOrder()
  const allKeys = new Set(rowsByKey.keys())

  for (const definition of loadManagedListDefinitions()) {
    allKeys.add(normalizeManagedListKey(definition.key))
  }

  for (const customList of readCustomLists()) {
    allKeys.add(normalizeManagedListKey(customList.key))
  }

  const lists: ManagedListSummary[] = Array.from(allKeys).map((key) => ({
    key,
    label: getManagedListLabel(key),
    whereUsed: getManagedListWhereUsed(key),
    displayOrder: displayOrderConfig[key] === 'alpha' ? 'alpha' : 'list',
    valueCount: rowsByKey.get(key)?.length ?? 0,
    systemManaged: isRegistryManagedList(key),
  }))

  lists.sort((a, b) => a.label.localeCompare(b.label))

  return {
    lists,
    rowsByKey: Object.fromEntries(rowsByKey),
  }
}

export async function loadManagedListDetail(key: string) {
  const normalizedKey = normalizeManagedListKey(key)
  const state = await loadManagedListsState()
  const summary = state.lists.find((list) => list.key === normalizedKey)
  if (!summary) return null

  return {
    ...summary,
    rows: state.rowsByKey[normalizedKey] ?? [],
  }
}

export async function createManagedList(input: {
  key: string
  label: string
  whereUsed: string[]
}) {
  const key = normalizeManagedListKey(input.key)
  const label = input.label.trim()
  const whereUsed = input.whereUsed.map((entry) => entry.trim()).filter(Boolean)

  if (!key) throw new Error('List key is required')
  if (!label) throw new Error('Display name is required')
  if (isRegistryManagedList(key)) throw new Error('A list with this key already exists')

  const existing = readCustomLists()
  if (existing.some((list) => normalizeManagedListKey(list.key) === key)) {
    throw new Error('A list with this key already exists')
  }

  existing.push({ key, label, whereUsed })
  writeCustomLists(existing)
}

export async function updateManagedListMetadata(input: {
  key: string
  label: string
  whereUsed: string[]
}) {
  const key = normalizeManagedListKey(input.key)
  if (isRegistryManagedList(key)) return

  const existing = readCustomLists()
  const index = existing.findIndex((list) => normalizeManagedListKey(list.key) === key)
  if (index === -1) return

  existing[index] = {
    key,
    label: input.label.trim() || existing[index].label,
    whereUsed: input.whereUsed.map((entry) => entry.trim()).filter(Boolean),
  }
  writeCustomLists(existing)
}

export async function updateManagedListDisplayOrder(key: string, displayOrder: string) {
  const normalizedKey = normalizeManagedListKey(key)
  const config = readDisplayOrder()
  config[normalizedKey] = displayOrder === 'alpha' ? 'alpha' : 'list'
  writeDisplayOrder(config)
}

export async function replaceManagedListRows(
  key: string,
  incomingRows: Array<{ id?: string; value?: string; colorTone?: TransactionStatusColorTone } | null | undefined>,
) {
  const normalizedKey = normalizeManagedListKey(key)
  const code = normalizedKey.replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'LIST'
  const canColorize = supportsRowColorTones(normalizedKey)

  const currentDbRows = await prisma.listOption.findMany({
    where: { key: normalizedKey },
    orderBy: { sortOrder: 'asc' },
  })

  const currentMaxSeq = currentDbRows
    .map((row) => parseListIdSequence(row.listId, code))
    .filter((sequence): sequence is number => sequence !== null)

  let nextSeq = Math.max(0, ...currentMaxSeq) + 1
  const currentByValue = new Map<string, string>()
  for (const row of currentDbRows) {
    if (!currentByValue.has(row.value)) currentByValue.set(row.value, row.listId)
  }

  const seen = new Set<string>()
  const finalRows = incomingRows.flatMap((row, sortOrder) => {
    if (!row || typeof row !== 'object') return []

    const value = String(row.value ?? '').trim()
    if (!value || seen.has(value)) return []
    seen.add(value)

    let listId = row.id ? String(row.id).trim() : ''
    if (!listId || parseListIdSequence(listId, code) === null) {
      const existing = currentByValue.get(value)
      if (existing) {
        listId = existing
      } else {
        listId = formatListId(code, nextSeq)
        nextSeq += 1
      }
    }

    return [{
      listId,
      value,
      sortOrder,
      colorTone: canColorize ? (normalizeColorTone(row.colorTone) ?? getManagedListDefaultRowColorTone(normalizedKey, value)) : undefined,
    }]
  })

  await prisma.$transaction(async (tx) => {
    await tx.listOption.deleteMany({ where: { key: normalizedKey } })
    if (finalRows.length > 0) {
      await tx.listOption.createMany({
        data: finalRows.map((row) => ({
          key: normalizedKey,
          listId: row.listId,
          value: row.value,
          label: row.value,
          sortOrder: row.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })
    }
  })

  const metadata = readRowMetadata()
  const nextListMetadata = Object.fromEntries(
    finalRows.map((row) => [
      row.listId,
      row.colorTone ? { colorTone: row.colorTone } : {},
    ]),
  ) as Record<string, { colorTone?: TransactionStatusColorTone }>
  metadata[normalizedKey] = nextListMetadata
  writeRowMetadata(metadata)
}
