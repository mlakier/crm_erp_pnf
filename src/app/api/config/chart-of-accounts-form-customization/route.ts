import { NextRequest, NextResponse } from 'next/server'
import {
  CHART_OF_ACCOUNTS_STAT_CARDS,
  defaultChartOfAccountsFormCustomization,
  CHART_OF_ACCOUNTS_FORM_FIELDS,
  type ChartOfAccountsFormCustomizationConfig,
  type ChartOfAccountsFormFieldKey,
  type ChartOfAccountsStatCardMetric,
} from '@/lib/chart-of-accounts-form-customization'
import {
  loadChartOfAccountsFormCustomization,
  saveChartOfAccountsFormCustomization,
} from '@/lib/chart-of-accounts-form-customization-store'
import type { TransactionStatCardSize, TransactionStatCardSlot } from '@/lib/transaction-page-config'

function sanitizeInput(input: unknown): ChartOfAccountsFormCustomizationConfig {
  const defaults = defaultChartOfAccountsFormCustomization()
  if (!input || typeof input !== 'object') return defaults

  const root = input as Record<string, unknown>
  const formColumns = typeof root.formColumns === 'number' && Number.isFinite(root.formColumns)
    ? Math.min(4, Math.max(1, Math.trunc(root.formColumns)))
    : defaults.formColumns
  const sections = Array.isArray(root.sections)
    ? root.sections.map((section) => String(section ?? '').trim()).filter(Boolean)
    : defaults.sections
  const sectionRowsInput = root.sectionRows && typeof root.sectionRows === 'object'
    ? root.sectionRows as Record<string, unknown>
    : {}
  const fieldsInput = root.fields && typeof root.fields === 'object'
    ? root.fields as Record<string, unknown>
    : {}
  const statCardsInput = Array.isArray(root.statCards) ? root.statCards : []
  const allowedMetrics = new Set<ChartOfAccountsStatCardMetric>(CHART_OF_ACCOUNTS_STAT_CARDS.map((card) => card.id))

  const fields = Object.fromEntries(
    CHART_OF_ACCOUNTS_FORM_FIELDS.map((field) => {
      const fieldInput = fieldsInput[field.id] && typeof fieldsInput[field.id] === 'object'
        ? fieldsInput[field.id] as Record<string, unknown>
        : {}

      return [field.id, {
        visible: fieldInput.visible === undefined ? defaults.fields[field.id].visible : fieldInput.visible === true,
        section: String(fieldInput.section ?? defaults.fields[field.id].section).trim() || defaults.fields[field.id].section,
        order: typeof fieldInput.order === 'number' && Number.isFinite(fieldInput.order)
          ? fieldInput.order
          : defaults.fields[field.id].order,
        column: typeof fieldInput.column === 'number' && Number.isFinite(fieldInput.column)
          ? Math.min(formColumns, Math.max(1, Math.trunc(fieldInput.column)))
          : defaults.fields[field.id].column,
      }]
    })
  ) as Record<ChartOfAccountsFormFieldKey, ChartOfAccountsFormCustomizationConfig['fields'][ChartOfAccountsFormFieldKey]>

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
      ])
    ),
    fields,
    statCards: (() : Array<TransactionStatCardSlot<ChartOfAccountsStatCardMetric>> => {
      const normalized: Array<TransactionStatCardSlot<ChartOfAccountsStatCardMetric>> = statCardsInput
        .map((entry, index) => {
          const statRoot = entry && typeof entry === 'object' ? entry as Record<string, unknown> : null
          if (!statRoot) return null

          const metric = String(statRoot.metric ?? '').trim() as ChartOfAccountsStatCardMetric
          if (!allowedMetrics.has(metric)) return null
          const size: TransactionStatCardSize =
            statRoot.size === 'sm' || statRoot.size === 'lg' ? statRoot.size : 'md'

          return {
            id: String(statRoot.id ?? `chart-of-accounts-stat-${metric}`),
            metric,
            visible: statRoot.visible === undefined ? true : statRoot.visible === true,
            order: typeof statRoot.order === 'number' && Number.isFinite(statRoot.order) ? statRoot.order : index,
            size,
            colorized: statRoot.colorized === undefined ? true : statRoot.colorized === true,
            linked: statRoot.linked === undefined ? true : statRoot.linked === true,
          }
        })
        .filter((card): card is NonNullable<typeof card> => Boolean(card))

      return (normalized.length > 0 ? normalized : defaults.statCards ?? []).map((card, index) => ({
        ...card,
        order: index,
      }))
    })(),
  }
}

export async function GET() {
  try {
    const config = await loadChartOfAccountsFormCustomization()
    return NextResponse.json({ config, fields: CHART_OF_ACCOUNTS_FORM_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load chart of accounts form customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputConfig = (body as { config?: unknown })?.config
    const sanitized = sanitizeInput(inputConfig)
    const saved = await saveChartOfAccountsFormCustomization(sanitized)
    return NextResponse.json({ config: saved, fields: CHART_OF_ACCOUNTS_FORM_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save chart of accounts form customization' }, { status: 500 })
  }
}
