import { promises as fs } from 'fs'
import path from 'path'
import {
  ListOrderConfig,
  ListOrderMode,
  ListPageKey,
  mergeListOrderConfig,
  sanitizeListOrderMode,
} from '@/lib/list-options'

const STORE_PATH = path.join(process.cwd(), 'config', 'list-order.json')

export async function loadListOrderConfig(): Promise<ListOrderConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return mergeListOrderConfig(parsed)
  } catch {
    return mergeListOrderConfig({})
  }
}

export async function saveListOrderConfig(nextConfig: unknown): Promise<ListOrderConfig> {
  const merged = mergeListOrderConfig(nextConfig)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  return merged
}

export async function updateSingleListOrder(
  page: ListPageKey,
  list: string,
  mode: unknown
): Promise<ListOrderConfig> {
  const current = await loadListOrderConfig()
  const next = mergeListOrderConfig(current)
  const pageRecord = next[page] as Record<string, ListOrderMode>

  if (!Object.prototype.hasOwnProperty.call(pageRecord, list)) {
    return next
  }

  pageRecord[list] = sanitizeListOrderMode(mode, pageRecord[list])
  return saveListOrderConfig(next)
}
