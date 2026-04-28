import { promises as fs } from 'fs'
import path from 'path'
import {
  buildDefaultSalesOrderReferenceLayout,
  defaultSalesOrderDetailCustomization,
  SALES_ORDER_DETAIL_FIELDS,
  SALES_ORDER_LINE_COLUMNS,
  SALES_ORDER_REFERENCE_SOURCES,
  SALES_ORDER_STAT_CARDS,
  type SalesOrderDetailCustomizationConfig,
  type SalesOrderDetailFieldKey,
  type SalesOrderLineColumnKey,
  type SalesOrderReferenceFieldCustomization,
  type SalesOrderReferenceFieldKey,
  type SalesOrderReferenceLayout,
  type SalesOrderReferenceSourceKey,
  type SalesOrderStatCardKey,
  type SalesOrderStatCardSlot,
} from '@/lib/sales-order-detail-customization'

const STORE_PATH = path.join(process.cwd(), 'config', 'sales-order-detail-customization.json')
const LEGACY_SECTION_NAMES = new Set(['Customer', 'Sales Order Details'])

function cloneDefaults(): SalesOrderDetailCustomizationConfig {
  return JSON.parse(JSON.stringify(defaultSalesOrderDetailCustomization())) as SalesOrderDetailCustomizationConfig
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

function getReferenceSource(sourceId: string | null | undefined) {
  return SALES_ORDER_REFERENCE_SOURCES.find((entry) => entry.id === sourceId) ?? SALES_ORDER_REFERENCE_SOURCES[0]
}

function normalizeReferenceFieldPlacements(layout: SalesOrderReferenceLayout): SalesOrderReferenceLayout {
  const source = getReferenceSource(layout.referenceId)
  const nextFields: Partial<Record<SalesOrderReferenceFieldKey, SalesOrderReferenceFieldCustomization>> = {}
  const occupied = new Set<string>()
  let rows = layout.rows
  let maxVisibleRow = -1

  for (const field of source.fields) {
    const fieldConfig = layout.fields[field.id]
    if (!fieldConfig) continue

    if (fieldConfig.visible === false) {
      nextFields[field.id] = {
        visible: false,
        column: Math.min(layout.formColumns, Math.max(1, fieldConfig.column)),
        order: Math.max(0, Math.trunc(fieldConfig.order)),
      }
      continue
    }

    let column = Math.min(layout.formColumns, Math.max(1, fieldConfig.column))
    let row = Math.max(0, Math.trunc(fieldConfig.order))
    let key = `${column}:${row}`

    while (row >= rows || occupied.has(key)) {
      let placed = false
      for (let candidateRow = 0; candidateRow < rows; candidateRow += 1) {
        for (let candidateColumn = 1; candidateColumn <= layout.formColumns; candidateColumn += 1) {
          const candidateKey = `${candidateColumn}:${candidateRow}`
          if (!occupied.has(candidateKey)) {
            column = candidateColumn
            row = candidateRow
            key = candidateKey
            placed = true
            break
          }
        }
        if (placed) break
      }

      if (!placed) {
        row = rows
        column = 1
        rows += 1
        key = `${column}:${row}`
      }
    }

    occupied.add(key)
    maxVisibleRow = Math.max(maxVisibleRow, row)
    nextFields[field.id] = {
      visible: true,
      column,
      order: row,
    }
  }

  return {
    ...layout,
    formColumns: Math.min(4, Math.max(1, layout.formColumns)),
    rows: Math.min(12, Math.max(1, maxVisibleRow + 2)),
    fields: nextFields,
  }
}

function normalizeFieldPlacements(config: SalesOrderDetailCustomizationConfig): SalesOrderDetailCustomizationConfig {
  const nextConfig: SalesOrderDetailCustomizationConfig = {
    ...config,
    sectionRows: { ...config.sectionRows },
    fields: Object.fromEntries(
      SALES_ORDER_DETAIL_FIELDS.map((field) => [field.id, { ...config.fields[field.id] }]),
    ) as SalesOrderDetailCustomizationConfig['fields'],
    referenceLayouts: config.referenceLayouts.map((layout) => ({
      ...layout,
      fields: { ...layout.fields },
    })),
    lineColumns: Object.fromEntries(
      SALES_ORDER_LINE_COLUMNS.map((column) => [column.id, { ...config.lineColumns[column.id] }]),
    ) as SalesOrderDetailCustomizationConfig['lineColumns'],
    statCards: [...config.statCards].map((card) => ({ ...card })),
  }

  for (const section of nextConfig.sections) {
    const sectionFields = SALES_ORDER_DETAIL_FIELDS.filter((field) => nextConfig.fields[field.id].section === section)
    const occupied = new Set<string>()
    let sectionRows = nextConfig.sectionRows[section] ?? 2

    for (const field of sectionFields) {
      const fieldConfig = nextConfig.fields[field.id]
      let column = Math.min(nextConfig.formColumns, Math.max(1, fieldConfig.column))
      let row = Math.max(0, Math.trunc(fieldConfig.order))
      let key = `${column}:${row}`

      while (row >= sectionRows || occupied.has(key)) {
        let placed = false
        for (let candidateRow = 0; candidateRow < sectionRows; candidateRow += 1) {
          for (let candidateColumn = 1; candidateColumn <= nextConfig.formColumns; candidateColumn += 1) {
            const candidateKey = `${candidateColumn}:${candidateRow}`
            if (!occupied.has(candidateKey)) {
              column = candidateColumn
              row = candidateRow
              key = candidateKey
              placed = true
              break
            }
          }
          if (placed) break
        }

        if (!placed) {
          row = sectionRows
          column = 1
          sectionRows += 1
          key = `${column}:${row}`
        }
      }

      occupied.add(key)
      nextConfig.fields[field.id] = {
        ...fieldConfig,
        column,
        order: row,
      }
    }

    nextConfig.sectionRows[section] = sectionRows
  }

  nextConfig.referenceLayouts = nextConfig.referenceLayouts
    .map((layout) => normalizeReferenceFieldPlacements(layout))
    .filter((layout, index, layouts) => layouts.findIndex((entry) => entry.id === layout.id) === index)

  const normalizedLineColumns = SALES_ORDER_LINE_COLUMNS
    .map((column) => ({
      id: column.id,
      visible: nextConfig.lineColumns[column.id]?.visible !== false,
      order:
        typeof nextConfig.lineColumns[column.id]?.order === 'number' &&
        Number.isFinite(nextConfig.lineColumns[column.id].order)
          ? nextConfig.lineColumns[column.id].order
          : 0,
    }))
    .sort((left, right) => left.order - right.order)

  nextConfig.lineColumns = Object.fromEntries(
    normalizedLineColumns.map((column, index) => [
      column.id,
      {
        visible: column.visible,
        order: index,
        widthMode: nextConfig.lineColumns[column.id]?.widthMode ?? config.lineColumns[column.id].widthMode,
        editDisplay: nextConfig.lineColumns[column.id]?.editDisplay ?? config.lineColumns[column.id].editDisplay,
        viewDisplay: nextConfig.lineColumns[column.id]?.viewDisplay ?? config.lineColumns[column.id].viewDisplay,
        dropdownDisplay: nextConfig.lineColumns[column.id]?.dropdownDisplay ?? config.lineColumns[column.id].dropdownDisplay,
        dropdownSort: nextConfig.lineColumns[column.id]?.dropdownSort ?? config.lineColumns[column.id].dropdownSort,
      },
    ]),
  ) as Record<SalesOrderLineColumnKey, SalesOrderDetailCustomizationConfig['lineColumns'][SalesOrderLineColumnKey]>

  const validStatIds = new Set(SALES_ORDER_STAT_CARDS.map((card) => card.id))
  const normalizedStatCards = nextConfig.statCards
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

  nextConfig.statCards = normalizedStatCards.length > 0 ? normalizedStatCards : cloneDefaults().statCards

  return nextConfig
}

function normalizeLegacyStatCards(value: unknown): SalesOrderStatCardSlot[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry, index) => ({
        id: normalizeText(entry.id) ?? `slot-${index + 1}`,
        metric: String(entry.metric ?? '') as SalesOrderStatCardKey,
        visible: entry.visible !== false,
        order:
          typeof entry.order === 'number' && Number.isFinite(entry.order)
            ? Math.max(0, Math.trunc(entry.order))
            : index,
        size: entry.size === 'sm' || entry.size === 'lg' || entry.size === 'md' ? entry.size : 'md',
        colorized: entry.colorized !== false,
        linked: entry.linked !== false,
      }))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([metric, config], index) => {
      const typedConfig = config && typeof config === 'object' ? (config as Record<string, unknown>) : {}
      return {
        id: `slot-${index + 1}`,
        metric: metric as SalesOrderStatCardKey,
        visible: typedConfig.visible !== false,
        order:
          typeof typedConfig.order === 'number' && Number.isFinite(typedConfig.order)
            ? Math.max(0, Math.trunc(typedConfig.order))
            : index,
        size:
          typedConfig.size === 'sm' || typedConfig.size === 'lg' || typedConfig.size === 'md'
            ? typedConfig.size
            : 'md',
        colorized: typedConfig.colorized !== false,
        linked: typedConfig.linked !== false,
      }
    })
  }

  return []
}

function mergeReferenceLayouts(value: unknown, fallback: SalesOrderReferenceLayout[]): SalesOrderReferenceLayout[] {
  if (!Array.isArray(value)) return fallback
  if (value.length === 0) return []

  const merged = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const source = getReferenceSource(normalizeText(entry.referenceId) as SalesOrderReferenceSourceKey | null)
      const base = buildDefaultSalesOrderReferenceLayout(source.id, normalizeText(entry.id) ?? `reference-${index + 1}`)
      const fieldOverrides =
        entry.fields && typeof entry.fields === 'object'
          ? (entry.fields as Record<string, unknown>)
          : {}

      const fields = Object.fromEntries(
        source.fields.map((field) => {
          const override =
            fieldOverrides[field.id] && typeof fieldOverrides[field.id] === 'object'
              ? (fieldOverrides[field.id] as Record<string, unknown>)
              : {}
          return [
            field.id,
            {
              visible: override.visible === undefined ? base.fields[field.id]?.visible !== false : override.visible === true,
              column: normalizeColumnCount(override.column, base.fields[field.id]?.column ?? 1),
              order:
                typeof override.order === 'number' && Number.isFinite(override.order)
                  ? Math.max(0, Math.trunc(override.order))
                  : base.fields[field.id]?.order ?? 0,
            },
          ]
        }),
      ) as Partial<Record<SalesOrderReferenceFieldKey, SalesOrderReferenceFieldCustomization>>

      return normalizeReferenceFieldPlacements({
        id: normalizeText(entry.id) ?? `reference-${index + 1}`,
        referenceId: source.id,
        formColumns: normalizeColumnCount(entry.formColumns, base.formColumns),
        rows: normalizeRowCount(entry.rows, base.rows),
        fields,
      })
    })

  return merged
}

function mergeWithDefaults(
  overrides: Partial<SalesOrderDetailCustomizationConfig> & { statCards?: unknown },
): SalesOrderDetailCustomizationConfig {
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
    ? overrides.sections.map((section) => normalizeText(section)).filter((section): section is string => Boolean(section))
    : []
  const useLegacySectionMigration =
    inputSections.length > 0 && inputSections.every((section) => LEGACY_SECTION_NAMES.has(section))
  if (inputSections.length > 0 && !useLegacySectionMigration) {
    merged.sections = Array.from(new Set(inputSections))
  }

  const sectionRowsInput =
    overrides.sectionRows && typeof overrides.sectionRows === 'object'
      ? (overrides.sectionRows as Record<string, unknown>)
      : {}

  for (const section of merged.sections) {
    merged.sectionRows[section] = normalizeRowCount(sectionRowsInput[section], merged.sectionRows[section] ?? 2)
  }

  const fieldOverrides =
    overrides.fields && typeof overrides.fields === 'object'
      ? (overrides.fields as Partial<
          Record<
            SalesOrderDetailFieldKey,
            Partial<SalesOrderDetailCustomizationConfig['fields'][SalesOrderDetailFieldKey]>
          >
        > & {
          entityId?: Partial<SalesOrderDetailCustomizationConfig['fields']['subsidiaryId']>
        })
      : {}
  if (!fieldOverrides.subsidiaryId && fieldOverrides.entityId) {
    fieldOverrides.subsidiaryId = fieldOverrides.entityId
  }

  for (const field of SALES_ORDER_DETAIL_FIELDS) {
    const override = fieldOverrides[field.id]
    if (!override || typeof override !== 'object') continue

    const section = normalizeText(override.section)
    merged.fields[field.id] = {
      visible: override.visible === undefined ? merged.fields[field.id].visible : override.visible === true,
      section:
        useLegacySectionMigration && section && LEGACY_SECTION_NAMES.has(section)
          ? merged.fields[field.id].section
          : (section ?? merged.fields[field.id].section),
      order:
        typeof override.order === 'number' && Number.isFinite(override.order)
          ? override.order
          : merged.fields[field.id].order,
      column: normalizeColumnCount(override.column, merged.fields[field.id].column),
    }
  }

  for (const field of SALES_ORDER_DETAIL_FIELDS) {
    const section = merged.fields[field.id].section
    if (!merged.sections.includes(section)) {
      merged.sections.push(section)
    }
    merged.sectionRows[section] = normalizeRowCount(sectionRowsInput[section], merged.sectionRows[section] ?? 2)
    merged.fields[field.id].column = Math.min(merged.formColumns, Math.max(1, merged.fields[field.id].column))
  }

  merged.referenceLayouts = mergeReferenceLayouts(overrides.referenceLayouts, merged.referenceLayouts)

  const lineColumnOverrides =
    overrides.lineColumns && typeof overrides.lineColumns === 'object'
      ? (overrides.lineColumns as Partial<
          Record<
            SalesOrderLineColumnKey,
            Partial<SalesOrderDetailCustomizationConfig['lineColumns'][SalesOrderLineColumnKey]>
          >
        >)
      : {}

  for (const column of SALES_ORDER_LINE_COLUMNS) {
    const override = lineColumnOverrides[column.id]
    if (!override || typeof override !== 'object') continue

    merged.lineColumns[column.id] = {
      visible: override.visible === undefined ? merged.lineColumns[column.id].visible : override.visible === true,
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

  const normalizedStatCards = normalizeLegacyStatCards(overrides.statCards)
  if (normalizedStatCards.length > 0) {
    merged.statCards = normalizedStatCards
  }

  return normalizeFieldPlacements(merged)
}

export async function loadSalesOrderDetailCustomization(): Promise<SalesOrderDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<SalesOrderDetailCustomizationConfig> & { statCards?: unknown }
    return mergeWithDefaults(parsed)
  } catch {
    return cloneDefaults()
  }
}

export async function saveSalesOrderDetailCustomization(
  nextConfig: SalesOrderDetailCustomizationConfig,
): Promise<SalesOrderDetailCustomizationConfig> {
  const merged = mergeWithDefaults(nextConfig)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  return merged
}
