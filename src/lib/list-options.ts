export type ListOptionsConfig = {
  customer: {
    industry: string[]
  }
  item: {
    type: string[]
  }
  lead: {
    source: string[]
    rating: string[]
  }
  opportunity: {
    stage: string[]
  }
}

export type ListValueRow = {
  id: string
  value: string
  sortOrder: number
}

export type ListValueRowsConfig = {
  [P in ListPageKey]: { [L in keyof ListOptionsConfig[P] & string]: ListValueRow[] }
}

export type ListOrderMode = 'alpha' | 'table'

export type ListOrderConfig = {
  [P in ListPageKey]: Record<keyof ListOptionsConfig[P] & string, ListOrderMode>
}

export type ListPageKey = keyof ListOptionsConfig

export const LIST_PAGE_LABELS: Record<ListPageKey, string> = {
  customer: 'Customer',
  item: 'Item',
  lead: 'Lead',
  opportunity: 'Opportunity',
}

export const LIST_LABELS: { [P in ListPageKey]: Record<keyof ListOptionsConfig[P] & string, string> } = {
  customer: {
    industry: 'Industry',
  },
  item: {
    type: 'Item Type',
  },
  lead: {
    source: 'Source',
    rating: 'Rating',
  },
  opportunity: {
    stage: 'Stage',
  },
}

export const LIST_OPTIONS_DEFAULTS: ListOptionsConfig = {
  customer: {
    industry: ['Technology', 'Manufacturing', 'Healthcare', 'Financial Services', 'Retail'],
  },
  item: {
    type: ['service', 'product', 'expense'],
  },
  lead: {
    source: ['Website', 'Referral', 'Trade Show', 'Inbound Demo', 'Webinar'],
    rating: ['hot', 'warm', 'cold'],
  },
  opportunity: {
    stage: ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'],
  },
}

export const LIST_ORDER_DEFAULTS: ListOrderConfig = {
  customer: {
    industry: 'table',
  },
  item: {
    type: 'table',
  },
  lead: {
    source: 'table',
    rating: 'table',
  },
  opportunity: {
    stage: 'table',
  },
}

export function cloneListDefaults(): ListOptionsConfig {
  return JSON.parse(JSON.stringify(LIST_OPTIONS_DEFAULTS)) as ListOptionsConfig
}

export function cloneListOrderDefaults(): ListOrderConfig {
  return JSON.parse(JSON.stringify(LIST_ORDER_DEFAULTS)) as ListOrderConfig
}

export function getDefaultListValues<P extends ListPageKey>(page: P, list: keyof ListOptionsConfig[P] & string): string[] {
  const pageDefaults = LIST_OPTIONS_DEFAULTS[page] as Record<string, string[]>
  const firstListKey = Object.keys(pageDefaults)[0]
  const fallback = firstListKey ? pageDefaults[firstListKey] : []
  const selected = pageDefaults[list] ?? fallback
  return [...selected]
}

export function sanitizeListValues(values: unknown, fallback: string[]): string[] {
  if (!Array.isArray(values)) return [...fallback]

  const normalized = values
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0)

  const deduped: string[] = []
  for (const value of normalized) {
    if (!deduped.includes(value)) deduped.push(value)
  }

  return deduped.length > 0 ? deduped : [...fallback]
}

export function sanitizeListOrderMode(mode: unknown, fallback: ListOrderMode = 'table'): ListOrderMode {
  return mode === 'alpha' || mode === 'table' ? mode : fallback
}

export function mergeListOrderConfig(overrides: unknown): ListOrderConfig {
  const merged = cloneListOrderDefaults()
  if (!overrides || typeof overrides !== 'object') return merged

  const root = overrides as Record<string, unknown>
  const pageKeys = Object.keys(merged) as ListPageKey[]

  for (const page of pageKeys) {
    const pageInput = root[page]
    if (!pageInput || typeof pageInput !== 'object') continue

    const listInput = pageInput as Record<string, unknown>
    const pageMerged = merged[page] as Record<string, ListOrderMode>
    const pageDefaults = LIST_ORDER_DEFAULTS[page] as Record<string, ListOrderMode>
    const listKeys = Object.keys(pageMerged)

    for (const list of listKeys) {
      if (Object.prototype.hasOwnProperty.call(listInput, list)) {
        pageMerged[list] = sanitizeListOrderMode(listInput[list], pageDefaults[list])
      }
    }
  }

  return merged
}

export function sortListValues(values: string[], mode: ListOrderMode): string[] {
  if (mode === 'alpha') {
    return [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
  }

  return [...values]
}

export function mergeListConfig(overrides: unknown): ListOptionsConfig {
  const merged = cloneListDefaults()
  if (!overrides || typeof overrides !== 'object') return merged

  const root = overrides as Record<string, unknown>
  const pageKeys = Object.keys(merged) as ListPageKey[]

  for (const page of pageKeys) {
    const pageInput = root[page]
    if (!pageInput || typeof pageInput !== 'object') continue

    const listInput = pageInput as Record<string, unknown>
    const pageMerged = merged[page] as Record<string, string[]>
    const pageDefaults = LIST_OPTIONS_DEFAULTS[page] as Record<string, string[]>
    const listKeys = Object.keys(pageMerged)

    for (const list of listKeys) {
      if (Object.prototype.hasOwnProperty.call(listInput, list)) {
        pageMerged[list] = sanitizeListValues(listInput[list], pageDefaults[list])
      }
    }
  }

  return merged
}
