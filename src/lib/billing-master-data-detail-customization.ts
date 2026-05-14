import type { BillingEntityConfig } from '@/lib/billing-subscription-master-data'

export type BillingMasterDataDetailFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type BillingMasterDataDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<string, BillingMasterDataDetailFieldCustomization>
}

function normalizeColumn(value: unknown, fallback: number, maxColumns: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(maxColumns, Math.max(1, Math.trunc(value)))
}

function normalizeRow(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(12, Math.max(1, Math.trunc(value)))
}

function normalizeText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

export function defaultBillingMasterDataDetailCustomization(
  config: BillingEntityConfig,
): BillingMasterDataDetailCustomizationConfig {
  const formColumns = 4
  const sections = Array.from(new Set(config.fields.map((field) => field.section)))
  const fields: BillingMasterDataDetailCustomizationConfig['fields'] = {}
  const sectionRows: BillingMasterDataDetailCustomizationConfig['sectionRows'] = {}

  for (const section of sections) {
    const sectionFields = config.fields.filter((field) => field.section === section)
    sectionRows[section] = Math.max(1, Math.ceil(sectionFields.length / formColumns))

    sectionFields.forEach((field, index) => {
      fields[field.key] = {
        visible: true,
        section,
        order: Math.floor(index / formColumns),
        column: (index % formColumns) + 1,
      }
    })
  }

  return {
    formColumns,
    sections,
    sectionRows,
    fields,
  }
}

export function mergeBillingMasterDataDetailCustomization(
  config: BillingEntityConfig,
  overrides?: Partial<BillingMasterDataDetailCustomizationConfig> | null,
): BillingMasterDataDetailCustomizationConfig {
  const defaults = defaultBillingMasterDataDetailCustomization(config)
  if (!overrides || typeof overrides !== 'object') return defaults

  const formColumns = normalizeColumn(overrides.formColumns, defaults.formColumns, 4)
  const overrideSections = Array.isArray(overrides.sections)
    ? overrides.sections.map(normalizeText).filter((section): section is string => Boolean(section))
    : []
  const sections = overrideSections.length > 0 ? Array.from(new Set(overrideSections)) : [...defaults.sections]
  const sectionRowsInput = overrides.sectionRows && typeof overrides.sectionRows === 'object'
    ? overrides.sectionRows
    : {}
  const fieldOverrides = overrides.fields && typeof overrides.fields === 'object'
    ? overrides.fields
    : {}

  for (const field of config.fields) {
    if (!sections.includes(field.section)) sections.push(field.section)
  }

  const sectionRows = Object.fromEntries(
    sections.map((section) => [
      section,
      normalizeRow(sectionRowsInput[section], defaults.sectionRows[section] ?? 2),
    ]),
  )

  const fields = Object.fromEntries(
    config.fields.map((field) => {
      const defaultField = defaults.fields[field.key]
      const override = fieldOverrides[field.key]
      const section = normalizeText(override?.section) ?? defaultField.section
      if (!sections.includes(section)) sections.push(section)

      return [
        field.key,
        {
          visible: override?.visible === undefined ? defaultField.visible : override.visible === true,
          section,
          order: typeof override?.order === 'number' && Number.isFinite(override.order)
            ? Math.max(0, Math.trunc(override.order))
            : defaultField.order,
          column: normalizeColumn(override?.column, defaultField.column, formColumns),
        },
      ]
    }),
  ) as BillingMasterDataDetailCustomizationConfig['fields']

  for (const section of sections) {
    sectionRows[section] = normalizeRow(sectionRows[section], defaults.sectionRows[section] ?? 2)
  }

  return {
    formColumns,
    sections,
    sectionRows,
    fields,
  }
}
