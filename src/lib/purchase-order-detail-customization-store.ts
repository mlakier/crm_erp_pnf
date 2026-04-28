import { promises as fs } from 'fs'
import path from 'path'
import {
  defaultPurchaseOrderDetailCustomization,
  PURCHASE_ORDER_DETAIL_FIELDS,
  PURCHASE_ORDER_LINE_COLUMNS,
  PURCHASE_ORDER_REFERENCE_SOURCES,
  PURCHASE_ORDER_STAT_CARDS,
  type PurchaseOrderDetailCustomizationConfig,
  type PurchaseOrderDetailFieldKey,
  type PurchaseOrderLineColumnKey,
  type PurchaseOrderStatCardSlot,
} from '@/lib/purchase-order-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'

const STORE_PATH = path.join(process.cwd(), 'config', 'purchase-order-detail-customization.json')

function cloneDefaults(): PurchaseOrderDetailCustomizationConfig {
  return JSON.parse(
    JSON.stringify(defaultPurchaseOrderDetailCustomization()),
  ) as PurchaseOrderDetailCustomizationConfig
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text || null
}

function normalizeColumnCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(4, Math.max(1, Math.trunc(value)))
}

function normalizeRowCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(12, Math.max(1, Math.trunc(value)))
}

function mergeWithDefaults(
  overrides: Partial<PurchaseOrderDetailCustomizationConfig>,
): PurchaseOrderDetailCustomizationConfig {
  const merged = cloneDefaults()
  merged.formColumns = normalizeColumnCount(overrides.formColumns, merged.formColumns)

  if (overrides.lineSettings && typeof overrides.lineSettings === 'object') {
    merged.lineSettings = {
      ...merged.lineSettings,
      ...(overrides.lineSettings.fontSize === 'xs' || overrides.lineSettings.fontSize === 'sm'
        ? { fontSize: overrides.lineSettings.fontSize }
        : {}),
    }
  }

  const inputSections = Array.isArray(overrides.sections)
    ? overrides.sections
        .map((section) => normalizeText(section))
        .filter((section): section is string => Boolean(section))
    : []
  if (inputSections.length > 0) {
    merged.sections = Array.from(new Set(inputSections))
  }

  const sectionRowsInput =
    overrides.sectionRows && typeof overrides.sectionRows === 'object'
      ? (overrides.sectionRows as Record<string, unknown>)
      : {}

  for (const section of merged.sections) {
    merged.sectionRows[section] = normalizeRowCount(
      sectionRowsInput[section],
      merged.sectionRows[section] ?? 2,
    )
  }

  const fieldOverrides =
    overrides.fields && typeof overrides.fields === 'object'
      ? (overrides.fields as Partial<
          Record<
            PurchaseOrderDetailFieldKey,
            Partial<
              PurchaseOrderDetailCustomizationConfig['fields'][PurchaseOrderDetailFieldKey]
            >
          >
        >)
      : {}

  for (const field of PURCHASE_ORDER_DETAIL_FIELDS) {
    const override = fieldOverrides[field.id]
    if (!override || typeof override !== 'object') continue
    const section = normalizeText(override.section)
    merged.fields[field.id] = {
      visible:
        override.visible === undefined
          ? merged.fields[field.id].visible
          : override.visible === true,
      section: section ?? merged.fields[field.id].section,
      order:
        typeof override.order === 'number' && Number.isFinite(override.order)
          ? override.order
          : merged.fields[field.id].order,
      column: normalizeColumnCount(override.column, merged.fields[field.id].column),
    }
  }

  for (const field of PURCHASE_ORDER_DETAIL_FIELDS) {
    const section = merged.fields[field.id].section
    if (!merged.sections.includes(section)) merged.sections.push(section)
    merged.sectionRows[section] = normalizeRowCount(
      sectionRowsInput[section],
      merged.sectionRows[section] ?? 2,
    )
    merged.fields[field.id].column = Math.min(
      merged.formColumns,
      Math.max(1, merged.fields[field.id].column),
    )
  }

  merged.sections = merged.sections.filter((section) => {
    if (section === 'Vendor' || section === 'Purchase Order Details') {
      return PURCHASE_ORDER_DETAIL_FIELDS.some((field) => merged.fields[field.id].section === section)
    }
    return true
  })
  for (const section of Object.keys(merged.sectionRows)) {
    if (!merged.sections.includes(section)) {
      delete merged.sectionRows[section]
    }
  }

  merged.referenceLayouts = mergeTransactionReferenceLayouts(
    overrides.referenceLayouts,
    merged.referenceLayouts,
    PURCHASE_ORDER_REFERENCE_SOURCES,
  )

  const lineColumnOverrides =
    overrides.lineColumns && typeof overrides.lineColumns === 'object'
      ? (overrides.lineColumns as Partial<
          Record<
            PurchaseOrderLineColumnKey,
            Partial<
              PurchaseOrderDetailCustomizationConfig['lineColumns'][PurchaseOrderLineColumnKey]
            >
          >
        >)
      : {}

  for (const column of PURCHASE_ORDER_LINE_COLUMNS) {
    const override = lineColumnOverrides[column.id]
    if (!override || typeof override !== 'object') continue
    merged.lineColumns[column.id] = {
      visible:
        override.visible === undefined
          ? merged.lineColumns[column.id].visible
          : override.visible === true,
      order:
        typeof override.order === 'number' && Number.isFinite(override.order)
          ? Math.max(0, Math.trunc(override.order))
          : merged.lineColumns[column.id].order,
      widthMode:
        override.widthMode === 'auto' ||
        override.widthMode === 'compact' ||
        override.widthMode === 'normal' ||
        override.widthMode === 'wide'
          ? override.widthMode
          : merged.lineColumns[column.id].widthMode,
      editDisplay:
        override.editDisplay === 'label' ||
        override.editDisplay === 'idAndLabel' ||
        override.editDisplay === 'id'
          ? override.editDisplay
          : merged.lineColumns[column.id].editDisplay,
      viewDisplay:
        override.viewDisplay === 'label' ||
        override.viewDisplay === 'idAndLabel' ||
        override.viewDisplay === 'id'
          ? override.viewDisplay
          : merged.lineColumns[column.id].viewDisplay,
      dropdownDisplay:
        override.dropdownDisplay === 'label' ||
        override.dropdownDisplay === 'idAndLabel' ||
        override.dropdownDisplay === 'id'
          ? override.dropdownDisplay
          : merged.lineColumns[column.id].dropdownDisplay,
      dropdownSort:
        override.dropdownSort === 'id' || override.dropdownSort === 'label'
          ? override.dropdownSort
          : merged.lineColumns[column.id].dropdownSort,
    }
  }

  merged.lineColumns = Object.fromEntries(
    [...PURCHASE_ORDER_LINE_COLUMNS]
      .map((column) => ({
        id: column.id,
        visible: merged.lineColumns[column.id].visible !== false,
        order: merged.lineColumns[column.id].order,
      }))
      .sort((left, right) => left.order - right.order)
      .map((column, index) => [
        column.id,
        {
          visible: column.visible,
          order: index,
          widthMode: merged.lineColumns[column.id].widthMode,
          editDisplay: merged.lineColumns[column.id].editDisplay,
          viewDisplay: merged.lineColumns[column.id].viewDisplay,
          dropdownDisplay: merged.lineColumns[column.id].dropdownDisplay,
          dropdownSort: merged.lineColumns[column.id].dropdownSort,
        },
      ]),
  ) as Record<
    PurchaseOrderLineColumnKey,
    PurchaseOrderDetailCustomizationConfig['lineColumns'][PurchaseOrderLineColumnKey]
  >

  const validStatIds = new Set(PURCHASE_ORDER_STAT_CARDS.map((card) => card.id))
  const normalizedStatCards = (Array.isArray(overrides.statCards) ? overrides.statCards : [])
    .filter((card): card is PurchaseOrderStatCardSlot => Boolean(card) && typeof card === 'object')
    .filter((card) => validStatIds.has(card.metric))
    .map((card, index) => ({
      id: normalizeText(card.id) ?? `slot-${index + 1}`,
      metric: card.metric,
      visible: card.visible !== false,
      order:
        typeof card.order === 'number' && Number.isFinite(card.order)
          ? Math.max(0, Math.trunc(card.order))
          : index,
      size: card.size === 'sm' || card.size === 'lg' || card.size === 'md' ? card.size : 'md',
      colorized: card.colorized !== false,
      linked: card.linked !== false,
    }))
    .sort((left, right) => left.order - right.order)
    .map((card, index) => ({
      ...card,
      order: index,
    }))

  merged.statCards =
    normalizedStatCards.length > 0 ? normalizedStatCards : cloneDefaults().statCards

  return merged
}

export async function loadPurchaseOrderDetailCustomization(): Promise<PurchaseOrderDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PurchaseOrderDetailCustomizationConfig>
    return mergeWithDefaults(parsed)
  } catch {
    return cloneDefaults()
  }
}

export async function savePurchaseOrderDetailCustomization(
  nextConfig: PurchaseOrderDetailCustomizationConfig,
): Promise<PurchaseOrderDetailCustomizationConfig> {
  const merged = mergeWithDefaults(nextConfig)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  return merged
}
