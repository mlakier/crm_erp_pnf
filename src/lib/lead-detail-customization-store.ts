import { promises as fs } from 'fs'
import path from 'path'
import {
  defaultLeadDetailCustomization,
  LEAD_STAT_CARDS,
  LEAD_DETAIL_FIELDS,
  LEAD_REFERENCE_SOURCES,
  type LeadDetailCustomizationConfig,
  type LeadDetailFieldKey,
  type LeadStatCardSlot,
} from '@/lib/lead-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'

const STORE_PATH = path.join(process.cwd(), 'config', 'lead-detail-customization.json')

export async function loadLeadDetailCustomization(): Promise<LeadDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<LeadDetailCustomizationConfig>
    const defaults = defaultLeadDetailCustomization()
    const parsedStatCards = Array.isArray(parsed.statCards) ? parsed.statCards : []

    return {
      ...defaults,
      ...parsed,
      sections: normalizeSections(parsed.sections, defaults.sections),
      sectionRows: normalizeSectionRows(parsed.sectionRows, defaults.sectionRows),
      fields: normalizeFields(parsed.fields, defaults.fields),
      referenceLayouts: mergeTransactionReferenceLayouts(parsed.referenceLayouts, defaults.referenceLayouts, LEAD_REFERENCE_SOURCES),
      statCards:
        parsedStatCards.length > 0
          ? normalizeStatCards(parsedStatCards, defaults.statCards)
          : defaults.statCards,
    }
  } catch {
    return defaultLeadDetailCustomization()
  }
}

function normalizeSections(
  sections: LeadDetailCustomizationConfig['sections'] | undefined,
  fallback: LeadDetailCustomizationConfig['sections'],
) {
  if (!Array.isArray(sections) || sections.length === 0) return fallback
  if (sections.some((section) => isLegacyLeadSection(section))) return fallback
  const allowed = new Set(fallback)
  const normalized = sections.filter((section): section is string => typeof section === 'string' && allowed.has(section))
  return normalized.length === fallback.length ? normalized : fallback
}

function normalizeSectionRows(
  sectionRows: LeadDetailCustomizationConfig['sectionRows'] | undefined,
  fallback: LeadDetailCustomizationConfig['sectionRows'],
) {
  if (!sectionRows || typeof sectionRows !== 'object') return fallback
  return Object.fromEntries(
    Object.entries(fallback).map(([section, defaultRows]) => {
      const nextValue = sectionRows[section]
      return [section, Number.isFinite(nextValue) ? nextValue : defaultRows]
    }),
  ) as LeadDetailCustomizationConfig['sectionRows']
}

function normalizeFields(
  fields: LeadDetailCustomizationConfig['fields'] | undefined,
  fallback: LeadDetailCustomizationConfig['fields'],
) {
  if (!fields || typeof fields !== 'object') return fallback
  const knownFieldIds = new Set(LEAD_DETAIL_FIELDS.map((field) => field.id))
  const allowedSections = new Set(Object.values(fallback).map((field) => field.section))

  return Object.fromEntries(
    (Object.keys(fallback) as LeadDetailFieldKey[]).map((fieldId) => {
      const defaultField = fallback[fieldId]
      const candidate = fields[fieldId]
      return [
        fieldId,
        {
          visible: candidate?.visible ?? defaultField.visible,
          section:
            candidate?.section
            && knownFieldIds.has(fieldId)
            && allowedSections.has(candidate.section)
            && !isLegacyLeadSection(candidate.section)
              ? candidate.section
              : defaultField.section,
          order: Number.isFinite(candidate?.order) ? candidate.order : defaultField.order,
          column: Number.isFinite(candidate?.column) ? candidate.column : defaultField.column,
        },
      ]
    }),
  ) as LeadDetailCustomizationConfig['fields']
}

function isLegacyLeadSection(section: string) {
  return (
    section === 'Identity'
    || section === 'Contact'
    || section === 'System'
    || section === 'Lead'
    || section === 'Qualification'
    || section === 'Contact Information'
    || section === 'System Information'
    || section === 'Lead Details'
  )
}

export async function saveLeadDetailCustomization(
  config: LeadDetailCustomizationConfig,
): Promise<LeadDetailCustomizationConfig> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  return config
}

function normalizeStatCards(
  statCards: LeadStatCardSlot[],
  fallback: LeadStatCardSlot[],
): LeadStatCardSlot[] {
  const knownMetrics = new Set(LEAD_STAT_CARDS.map((card) => card.id))
  const sanitized = statCards
    .filter((slot) => knownMetrics.has(slot.metric))
    .map((slot, index) => ({
      id: String(slot.id ?? '').trim() || `slot-${index + 1}`,
      metric: slot.metric,
      visible: slot.visible !== false,
      order: Number.isFinite(slot.order) ? slot.order : index,
      size: slot.size === 'sm' || slot.size === 'lg' || slot.size === 'md' ? slot.size : 'md',
      colorized: slot.colorized !== false,
      linked: slot.linked !== false,
    }))
    .sort((left, right) => left.order - right.order)
    .map((slot, index) => ({
      ...slot,
      order: index,
    }))

  return sanitized.length > 0 ? sanitized : fallback
}
