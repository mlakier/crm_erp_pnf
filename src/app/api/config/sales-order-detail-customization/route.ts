import { NextRequest, NextResponse } from 'next/server'
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
import {
  loadSalesOrderDetailCustomization,
  saveSalesOrderDetailCustomization,
} from '@/lib/sales-order-detail-customization-store'

function getReferenceSource(referenceId: string | null | undefined) {
  return SALES_ORDER_REFERENCE_SOURCES.find((entry) => entry.id === referenceId) ?? SALES_ORDER_REFERENCE_SOURCES[0]
}

function sanitizeReferenceLayouts(input: unknown): SalesOrderReferenceLayout[] {
  if (!Array.isArray(input)) {
    return defaultSalesOrderDetailCustomization().referenceLayouts
  }

  const layouts = input
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const source = getReferenceSource(String(entry.referenceId ?? '').trim() as SalesOrderReferenceSourceKey)
      const base = buildDefaultSalesOrderReferenceLayout(source.id, String(entry.id ?? `reference-${index + 1}`).trim() || `reference-${index + 1}`)
      const fieldsInput =
        entry.fields && typeof entry.fields === 'object'
          ? (entry.fields as Record<string, unknown>)
          : {}

      const fields = Object.fromEntries(
        source.fields.map((field) => {
          const fieldInput =
            fieldsInput[field.id] && typeof fieldsInput[field.id] === 'object'
              ? (fieldsInput[field.id] as Record<string, unknown>)
              : {}

          return [
            field.id,
            {
              visible:
                fieldInput.visible === undefined ? base.fields[field.id]?.visible !== false : fieldInput.visible === true,
              order:
                typeof fieldInput.order === 'number' && Number.isFinite(fieldInput.order)
                  ? Math.max(0, Math.trunc(fieldInput.order))
                  : base.fields[field.id]?.order ?? 0,
              column:
                typeof fieldInput.column === 'number' && Number.isFinite(fieldInput.column)
                  ? Math.min(
                      Math.min(4, Math.max(1, typeof entry.formColumns === 'number' ? Math.trunc(entry.formColumns) : base.formColumns)),
                      Math.max(1, Math.trunc(fieldInput.column)),
                    )
                  : base.fields[field.id]?.column ?? 1,
            },
          ]
        }),
      ) as Partial<Record<SalesOrderReferenceFieldKey, SalesOrderReferenceFieldCustomization>>

      return {
        id: String(entry.id ?? `reference-${index + 1}`).trim() || `reference-${index + 1}`,
        referenceId: source.id,
        formColumns:
          typeof entry.formColumns === 'number' && Number.isFinite(entry.formColumns)
            ? Math.min(4, Math.max(1, Math.trunc(entry.formColumns)))
            : base.formColumns,
        rows:
          typeof entry.rows === 'number' && Number.isFinite(entry.rows)
            ? Math.min(12, Math.max(1, Math.trunc(entry.rows)))
            : base.rows,
        fields,
      } satisfies SalesOrderReferenceLayout
    })

  return layouts.length > 0 ? layouts : defaultSalesOrderDetailCustomization().referenceLayouts
}

function sanitizeInput(input: unknown): SalesOrderDetailCustomizationConfig {
  const defaults = defaultSalesOrderDetailCustomization()
  if (!input || typeof input !== 'object') return defaults

  const root = input as Record<string, unknown>
  const formColumns =
    typeof root.formColumns === 'number' && Number.isFinite(root.formColumns)
      ? Math.min(4, Math.max(1, Math.trunc(root.formColumns)))
      : defaults.formColumns
  const sections = Array.isArray(root.sections)
    ? root.sections.map((section) => String(section ?? '').trim()).filter(Boolean)
    : defaults.sections
  const sectionRowsInput =
    root.sectionRows && typeof root.sectionRows === 'object'
      ? (root.sectionRows as Record<string, unknown>)
      : {}

  const fieldsInput =
    root.fields && typeof root.fields === 'object'
      ? (root.fields as Record<string, unknown>)
      : {}
  if (!fieldsInput.subsidiaryId && fieldsInput.entityId) {
    fieldsInput.subsidiaryId = fieldsInput.entityId
  }

  const fields = Object.fromEntries(
    SALES_ORDER_DETAIL_FIELDS.map((field) => {
      const fieldInput =
        fieldsInput[field.id] && typeof fieldsInput[field.id] === 'object'
          ? (fieldsInput[field.id] as Record<string, unknown>)
          : {}

      return [
        field.id,
        {
          visible:
            fieldInput.visible === undefined ? defaults.fields[field.id].visible : fieldInput.visible === true,
          section:
            String(fieldInput.section ?? defaults.fields[field.id].section).trim() ||
            defaults.fields[field.id].section,
          order:
            typeof fieldInput.order === 'number' && Number.isFinite(fieldInput.order)
              ? fieldInput.order
              : defaults.fields[field.id].order,
          column:
            typeof fieldInput.column === 'number' && Number.isFinite(fieldInput.column)
              ? Math.min(formColumns, Math.max(1, Math.trunc(fieldInput.column)))
              : defaults.fields[field.id].column,
        },
      ]
    }),
  ) as Record<SalesOrderDetailFieldKey, SalesOrderDetailCustomizationConfig['fields'][SalesOrderDetailFieldKey]>

  const referenceLayouts = sanitizeReferenceLayouts(root.referenceLayouts)

  const lineColumnsInput =
    root.lineColumns && typeof root.lineColumns === 'object'
      ? (root.lineColumns as Record<string, unknown>)
      : {}
  const lineSettingsInput =
    root.lineSettings && typeof root.lineSettings === 'object'
      ? (root.lineSettings as Record<string, unknown>)
      : {}

  const lineSettings: SalesOrderDetailCustomizationConfig['lineSettings'] = {
    fontSize:
      lineSettingsInput.fontSize === 'xs' || lineSettingsInput.fontSize === 'sm'
        ? lineSettingsInput.fontSize
        : defaults.lineSettings.fontSize,
  }

  const lineColumns = Object.fromEntries(
    SALES_ORDER_LINE_COLUMNS.map((column, index) => {
      const columnInput =
        lineColumnsInput[column.id] && typeof lineColumnsInput[column.id] === 'object'
          ? (lineColumnsInput[column.id] as Record<string, unknown>)
          : {}

      return [
        column.id,
        {
          visible:
            columnInput.visible === undefined
              ? defaults.lineColumns[column.id].visible
              : columnInput.visible === true,
          order:
            typeof columnInput.order === 'number' && Number.isFinite(columnInput.order)
              ? Math.max(0, Math.trunc(columnInput.order))
              : defaults.lineColumns[column.id]?.order ?? index,
          widthMode:
            columnInput.widthMode === 'auto' ||
            columnInput.widthMode === 'compact' ||
            columnInput.widthMode === 'normal' ||
            columnInput.widthMode === 'wide'
              ? columnInput.widthMode
              : defaults.lineColumns[column.id].widthMode,
          editDisplay:
            columnInput.editDisplay === 'label' ||
            columnInput.editDisplay === 'idAndLabel' ||
            columnInput.editDisplay === 'id'
              ? columnInput.editDisplay
              : defaults.lineColumns[column.id].editDisplay,
          viewDisplay:
            columnInput.viewDisplay === 'label' ||
            columnInput.viewDisplay === 'idAndLabel' ||
            columnInput.viewDisplay === 'id'
              ? columnInput.viewDisplay
              : defaults.lineColumns[column.id].viewDisplay,
          dropdownDisplay:
            columnInput.dropdownDisplay === 'label' ||
            columnInput.dropdownDisplay === 'idAndLabel' ||
            columnInput.dropdownDisplay === 'id'
              ? columnInput.dropdownDisplay
              : defaults.lineColumns[column.id].dropdownDisplay,
          dropdownSort:
            columnInput.dropdownSort === 'id' || columnInput.dropdownSort === 'label'
              ? columnInput.dropdownSort
              : defaults.lineColumns[column.id].dropdownSort,
        },
      ]
    }),
  ) as Record<
    SalesOrderLineColumnKey,
    SalesOrderDetailCustomizationConfig['lineColumns'][SalesOrderLineColumnKey]
  >

  const validStatIds = new Set(SALES_ORDER_STAT_CARDS.map((card) => card.id))
  const statCardsInput = Array.isArray(root.statCards) ? root.statCards : defaults.statCards
  const statCards = statCardsInput
    .filter((card): card is Record<string, unknown> => Boolean(card) && typeof card === 'object')
    .map((card, index) => {
      const metric = String(card.metric ?? '') as SalesOrderStatCardKey
      return {
        id: String(card.id ?? `slot-${index + 1}`).trim() || `slot-${index + 1}`,
        metric: validStatIds.has(metric)
          ? metric
          : defaults.statCards[Math.min(index, defaults.statCards.length - 1)]?.metric ?? 'total',
        visible: card.visible === undefined ? true : card.visible === true,
        order:
          typeof card.order === 'number' && Number.isFinite(card.order)
            ? Math.max(0, Math.trunc(card.order))
            : index,
        size: card.size === 'sm' || card.size === 'md' || card.size === 'lg' ? card.size : 'md',
        colorized: card.colorized !== false,
        linked: card.linked !== false,
      }
    })
    .sort((left, right) => left.order - right.order)
    .map((card, index) => ({
      ...card,
      order: index,
    })) as SalesOrderStatCardSlot[]

  const finalSections = sections.length > 0 ? Array.from(new Set(sections)) : defaults.sections

  return {
    formColumns,
    sections: finalSections,
    sectionRows: Object.fromEntries(
      finalSections.map((section) => [
        section,
        typeof sectionRowsInput[section] === 'number' && Number.isFinite(sectionRowsInput[section])
          ? Math.min(12, Math.max(1, Math.trunc(sectionRowsInput[section] as number)))
          : (defaults.sectionRows[section] ?? 2),
      ]),
    ),
    fields,
    referenceLayouts,
    lineSettings,
    lineColumns,
    statCards: statCards.length > 0 ? statCards : defaults.statCards,
  }
}

export async function GET() {
  try {
    const config = await loadSalesOrderDetailCustomization()
    return NextResponse.json({
      config,
      fields: SALES_ORDER_DETAIL_FIELDS,
      referenceSources: SALES_ORDER_REFERENCE_SOURCES,
      lineColumns: SALES_ORDER_LINE_COLUMNS,
      statCards: SALES_ORDER_STAT_CARDS,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to load sales order detail customization' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputConfig = (body as { config?: unknown })?.config
    const sanitized = sanitizeInput(inputConfig)
    const saved = await saveSalesOrderDetailCustomization(sanitized)

    return NextResponse.json({
      config: saved,
      fields: SALES_ORDER_DETAIL_FIELDS,
      referenceSources: SALES_ORDER_REFERENCE_SOURCES,
      lineColumns: SALES_ORDER_LINE_COLUMNS,
      statCards: SALES_ORDER_STAT_CARDS,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to save sales order detail customization' },
      { status: 500 },
    )
  }
}
