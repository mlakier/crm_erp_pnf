import { promises as fs } from 'fs'
import path from 'path'
import {
  sanitizeSavedSearchDefinitionState,
  type SavedSearchDefinitionState,
} from '@/lib/saved-search-metadata'

export type SavedSearchBuiltInBaseline = {
  tableId: string
  columnIds: string[]
  columnOrder: string[]
  filterState: SavedSearchDefinitionState
  availableFilterIds: string[]
}

type SavedSearchBuiltInConfig = {
  baselines: SavedSearchBuiltInBaseline[]
}

const STORE_PATH = path.join(process.cwd(), 'config', 'saved-search-builtins.json')

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const next: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const id = entry.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

function sanitizeBaseline(value: unknown): SavedSearchBuiltInBaseline | null {
  if (!value || typeof value !== 'object') return null
  const root = value as Record<string, unknown>
  const tableId = typeof root.tableId === 'string' ? root.tableId.trim() : ''
  if (!tableId) return null

  return {
    tableId,
    columnIds: parseStringList(root.columnIds),
    columnOrder: parseStringList(root.columnOrder),
    filterState: sanitizeSavedSearchDefinitionState(root.filterState),
    availableFilterIds: parseStringList(root.availableFilterIds),
  }
}

async function loadStore(): Promise<SavedSearchBuiltInConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as { baselines?: unknown }
    const baselines = Array.isArray(parsed.baselines)
      ? parsed.baselines
          .map((entry) => sanitizeBaseline(entry))
          .filter((entry): entry is SavedSearchBuiltInBaseline => Boolean(entry))
      : []
    return { baselines }
  } catch {
    return { baselines: [] }
  }
}

async function saveStore(nextStore: SavedSearchBuiltInConfig) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8')
}

export async function loadSavedSearchBuiltInBaseline(tableId: string): Promise<SavedSearchBuiltInBaseline | null> {
  const cleanTableId = tableId.trim()
  if (!cleanTableId) return null
  const store = await loadStore()
  return store.baselines.find((entry) => entry.tableId === cleanTableId) ?? null
}

export async function saveSavedSearchBuiltInBaseline(input: SavedSearchBuiltInBaseline): Promise<SavedSearchBuiltInBaseline> {
  const baseline = sanitizeBaseline(input)
  if (!baseline) {
    throw new Error('Invalid built-in baseline payload')
  }

  const store = await loadStore()
  const baselines = store.baselines.filter((entry) => entry.tableId !== baseline.tableId)
  baselines.push(baseline)
  await saveStore({ baselines })
  return baseline
}
