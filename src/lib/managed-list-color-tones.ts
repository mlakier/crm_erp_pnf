import { normalizeManagedListKey } from '@/lib/managed-list-registry'
import type { TransactionStatusColorTone } from '@/lib/company-preferences-definitions'

export const COLORABLE_MANAGED_LIST_KEYS = new Set(['OPP-STAGE', 'LEAD-STATUS', 'QUOTE-STATUS', 'SO-STATUS', 'INV-STATUS', 'FULFILL-STATUS'])

const DEFAULT_ROW_COLOR_TONES: Record<string, Record<string, TransactionStatusColorTone>> = {
  'OPP-STAGE': {
    prospecting: 'default',
    qualified: 'accent',
    proposal: 'accent',
    negotiation: 'yellow',
    won: 'green',
    lost: 'red',
  },
  'LEAD-STATUS': {
    new: 'default',
    working: 'accent',
    contacted: 'accent',
    qualified: 'green',
    nurturing: 'yellow',
    converted: 'purple',
    unqualified: 'red',
  },
  'QUOTE-STATUS': {
    draft: 'default',
    sent: 'accent',
    accepted: 'green',
    expired: 'yellow',
  },
  'SO-STATUS': {
    draft: 'default',
    approved: 'accent',
    booked: 'accent',
    fulfilled: 'green',
    cancelled: 'red',
  },
  'INV-STATUS': {
    draft: 'default',
    open: 'accent',
    paid: 'green',
    void: 'yellow',
  },
  'FULFILL-STATUS': {
    pending: 'default',
    packed: 'accent',
    shipped: 'green',
    delivered: 'green',
    cancelled: 'red',
  },
}

export function supportsManagedListRowColorTones(key: string) {
  return COLORABLE_MANAGED_LIST_KEYS.has(normalizeManagedListKey(key))
}

export function getManagedListDefaultRowColorTone(key: string, value: string): TransactionStatusColorTone | undefined {
  const normalizedKey = normalizeManagedListKey(key)
  const defaults = DEFAULT_ROW_COLOR_TONES[normalizedKey]
  if (!defaults) return undefined
  return defaults[value.trim().toLowerCase()] ?? 'default'
}
