import { promises as fs } from 'fs'
import path from 'path'
import {
  defaultOpportunityDetailCustomization,
  OPPORTUNITY_REFERENCE_SOURCES,
  OPPORTUNITY_STAT_CARDS,
  type OpportunityDetailCustomizationConfig,
  type OpportunityStatCardSlot,
} from '@/lib/opportunity-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'

const STORE_PATH = path.join(process.cwd(), 'config', 'opportunity-detail-customization.json')

export async function loadOpportunityDetailCustomization(): Promise<OpportunityDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<OpportunityDetailCustomizationConfig>
    const defaults = defaultOpportunityDetailCustomization()
    const hasParsedStatCards = Array.isArray(parsed.statCards)
    const parsedStatCards: OpportunityStatCardSlot[] = hasParsedStatCards ? (parsed.statCards as OpportunityStatCardSlot[]) : []

    return {
      ...defaults,
      ...parsed,
      lineSettings: {
        ...defaults.lineSettings,
        ...(parsed.lineSettings ?? {}),
      },
      fields: {
        ...defaults.fields,
        ...(parsed.fields ?? {}),
      },
      referenceLayouts: mergeTransactionReferenceLayouts(parsed.referenceLayouts, defaults.referenceLayouts, OPPORTUNITY_REFERENCE_SOURCES),
      lineColumns: Object.fromEntries(
        Object.keys(defaults.lineColumns).map((columnId) => [
          columnId,
          {
            ...defaults.lineColumns[columnId as keyof typeof defaults.lineColumns],
            ...(parsed.lineColumns?.[columnId as keyof typeof defaults.lineColumns] ?? {}),
          },
        ]),
      ) as OpportunityDetailCustomizationConfig['lineColumns'],
      sections:
        Array.isArray(parsed.sections) && parsed.sections.length > 0
          ? parsed.sections
          : defaults.sections,
      sectionRows: {
        ...defaults.sectionRows,
        ...(parsed.sectionRows ?? {}),
      },
      statCards: hasParsedStatCards ? normalizeStatCards(parsedStatCards) : defaults.statCards,
    }
  } catch {
    return defaultOpportunityDetailCustomization()
  }
}

export async function saveOpportunityDetailCustomization(
  config: OpportunityDetailCustomizationConfig,
): Promise<OpportunityDetailCustomizationConfig> {
  const defaults = defaultOpportunityDetailCustomization()
  const normalized: OpportunityDetailCustomizationConfig = {
    ...defaults,
    ...config,
    lineSettings: {
      ...defaults.lineSettings,
      ...(config.lineSettings ?? {}),
    },
    fields: {
      ...defaults.fields,
      ...(config.fields ?? {}),
    },
    referenceLayouts: mergeTransactionReferenceLayouts(config.referenceLayouts, defaults.referenceLayouts, OPPORTUNITY_REFERENCE_SOURCES),
    lineColumns: Object.fromEntries(
      Object.keys(defaults.lineColumns).map((columnId) => [
        columnId,
        {
          ...defaults.lineColumns[columnId as keyof typeof defaults.lineColumns],
          ...(config.lineColumns?.[columnId as keyof typeof defaults.lineColumns] ?? {}),
        },
      ]),
    ) as OpportunityDetailCustomizationConfig['lineColumns'],
    sections:
      Array.isArray(config.sections) && config.sections.length > 0
        ? config.sections
        : defaults.sections,
    sectionRows: {
      ...defaults.sectionRows,
      ...(config.sectionRows ?? {}),
    },
    statCards: normalizeStatCards(Array.isArray(config.statCards) ? config.statCards : defaults.statCards),
  }

  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}

function normalizeStatCards(
  statCards: OpportunityStatCardSlot[],
): OpportunityStatCardSlot[] {
  const legacyMetricMap: Record<string, OpportunityStatCardSlot['metric']> = {
    'close-date': 'closeDate',
    'line-count': 'lineCount',
    quote: 'quoteNumber',
  }
  const knownMetrics = new Set(OPPORTUNITY_STAT_CARDS.map((card) => card.id))
  const sanitized = statCards
    .map((slot) => ({
      ...slot,
      metric: legacyMetricMap[String(slot.metric)] ?? slot.metric,
    }))
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

  return sanitized.map((slot, index) => ({
    ...slot,
    id: String(slot.id ?? '').trim() || `slot-${index + 1}`,
    order: index,
    size: slot.size === 'sm' || slot.size === 'lg' || slot.size === 'md' ? slot.size : 'md',
    colorized: slot.colorized !== false,
    linked: slot.linked !== false,
  }))
}
