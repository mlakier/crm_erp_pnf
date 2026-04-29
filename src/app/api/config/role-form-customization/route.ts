import { NextRequest, NextResponse } from 'next/server'
import {
  ROLE_STAT_CARDS,
  defaultRoleFormCustomization,
  ROLE_FORM_FIELDS,
  type RoleFormCustomizationConfig,
  type RoleFormFieldKey,
  type RoleStatCardMetric,
} from '@/lib/role-form-customization'
import { loadRoleFormCustomization, saveRoleFormCustomization } from '@/lib/role-form-customization-store'
import type { TransactionStatCardSize, TransactionStatCardSlot } from '@/lib/transaction-page-config'

function sanitizeInput(input: unknown): RoleFormCustomizationConfig {
  const defaults = defaultRoleFormCustomization()
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
  const allowedMetrics = new Set<RoleStatCardMetric>(ROLE_STAT_CARDS.map((card) => card.id))

  const fields = Object.fromEntries(
    ROLE_FORM_FIELDS.map((field) => {
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
  ) as Record<RoleFormFieldKey, RoleFormCustomizationConfig['fields'][RoleFormFieldKey]>

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
    statCards: (() : Array<TransactionStatCardSlot<RoleStatCardMetric>> => {
      const normalized: Array<TransactionStatCardSlot<RoleStatCardMetric>> = statCardsInput
        .map((entry, index) => {
          const statRoot = entry && typeof entry === 'object' ? entry as Record<string, unknown> : null
          if (!statRoot) return null

          const metric = String(statRoot.metric ?? '').trim() as RoleStatCardMetric
          if (!allowedMetrics.has(metric)) return null
          const size: TransactionStatCardSize =
            statRoot.size === 'sm' || statRoot.size === 'lg' ? statRoot.size : 'md'

          return {
            id: String(statRoot.id ?? `role-stat-${metric}`),
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
    const config = await loadRoleFormCustomization()
    return NextResponse.json({ config, fields: ROLE_FORM_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load role form customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputConfig = (body as { config?: unknown })?.config
    const sanitized = sanitizeInput(inputConfig)
    const saved = await saveRoleFormCustomization(sanitized)
    return NextResponse.json({ config: saved, fields: ROLE_FORM_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save role form customization' }, { status: 500 })
  }
}
