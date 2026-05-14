export type FinancialStatementCustomizationType = 'balance_sheet' | 'profit_and_loss'

export type FinancialStatementSectionCustomization = {
  id: string
  label: string
  visible: boolean
  showHeader: boolean
  showTotal: boolean
  order: number
  groups: FinancialStatementGroupCustomization[]
}

export type FinancialStatementGroupCustomization = {
  id: string
  label: string
  visible: boolean
  showHeader: boolean
  showTotal: boolean
  order: number
  categories: FinancialStatementCategoryCustomization[]
}

export type FinancialStatementCategoryCustomization = {
  id: string
  label: string
  visible: boolean
  showHeader: boolean
  showTotal: boolean
  order: number
}

export type FinancialStatementCalculatedRowCustomization = {
  id: string
  label: string
  visible: boolean
  order: number
  afterSectionId: string | null
}

export type FinancialStatementCustomizationConfig = {
  sections: FinancialStatementSectionCustomization[]
  calculatedRows: FinancialStatementCalculatedRowCustomization[]
}

export type FinancialStatementCustomizationOutline = Array<{
  label: string
  groups: Array<{
    label: string
    categories: string[]
  }>
}>

export const FINANCIAL_STATEMENT_LABELS: Record<FinancialStatementCustomizationType, string> = {
  balance_sheet: 'Balance Sheet',
  profit_and_loss: 'Profit & Loss',
}

const DEFAULT_SECTIONS: Record<FinancialStatementCustomizationType, string[]> = {
  balance_sheet: ['Assets', 'Liabilities', 'Equity'],
  profit_and_loss: [
    'Revenue',
    'Cost of Sales',
    'Expenses',
    'Depreciation & Amortization',
    'Realized (Gain) / Loss',
    'Unrealized (Gains) / Losses',
    'Other (Income) Expense',
    'Interest (Income) Expense',
    'Income Tax',
  ],
}

const DEFAULT_CALCULATED_ROWS: Record<FinancialStatementCustomizationType, Array<Omit<FinancialStatementCalculatedRowCustomization, 'afterSectionId'> & { afterSectionLabel: string | null }>> = {
  balance_sheet: [],
  profit_and_loss: [
    { id: 'gross-margin', label: 'Gross Margin', visible: true, order: 0, afterSectionLabel: 'Cost of Sales' },
    { id: 'ebitda', label: 'EBITDA', visible: true, order: 1, afterSectionLabel: 'Expenses' },
    { id: 'ebit', label: 'EBIT', visible: true, order: 2, afterSectionLabel: 'Depreciation & Amortization' },
    { id: 'ebt', label: 'EBT', visible: true, order: 3, afterSectionLabel: 'Interest (Income) Expense' },
    { id: 'net-income', label: 'Net Income', visible: true, order: 4, afterSectionLabel: 'Income Tax' },
  ],
}

export function slugSectionId(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

function uniqueLabels(labels: string[]) {
  const seen = new Set<string>()
  return labels.filter((label) => {
    const id = slugSectionId(label)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function defaultItem(label: string, order: number) {
  return {
    id: slugSectionId(label),
    label,
    visible: true,
    showHeader: true,
    showTotal: true,
    order,
  }
}

function outlineFromSectionLabels(labels: string[]): FinancialStatementCustomizationOutline {
  return labels.map((label) => ({ label, groups: [] }))
}

function mergeOutlines(
  type: FinancialStatementCustomizationType,
  runtimeOutlineOrLabels: FinancialStatementCustomizationOutline | string[] = [],
): FinancialStatementCustomizationOutline {
  const runtimeOutline = Array.isArray(runtimeOutlineOrLabels) && typeof runtimeOutlineOrLabels[0] === 'string'
    ? outlineFromSectionLabels(runtimeOutlineOrLabels as string[])
    : runtimeOutlineOrLabels as FinancialStatementCustomizationOutline
  const defaultOutline = DEFAULT_SECTIONS[type].map((label) => ({ label, groups: [] }))
  const outlineById = new Map<string, FinancialStatementCustomizationOutline[number]>()

  for (const section of [...defaultOutline, ...runtimeOutline]) {
    const sectionId = slugSectionId(section.label)
    const existing = outlineById.get(sectionId)
    if (!existing) {
      outlineById.set(sectionId, {
        label: section.label,
        groups: section.groups.map((group) => ({
          label: group.label,
          categories: uniqueLabels(group.categories),
        })),
      })
      continue
    }

    const groupById = new Map(existing.groups.map((group) => [slugSectionId(group.label), group]))
    for (const group of section.groups) {
      const groupId = slugSectionId(group.label)
      const existingGroup = groupById.get(groupId)
      if (!existingGroup) {
        const nextGroup = { label: group.label, categories: uniqueLabels(group.categories) }
        existing.groups.push(nextGroup)
        groupById.set(groupId, nextGroup)
      } else {
        existingGroup.categories = uniqueLabels([...existingGroup.categories, ...group.categories])
      }
    }
  }

  return Array.from(outlineById.values())
}

function normalizeCategories(
  defaults: Array<string | { label: string }>,
  configured: FinancialStatementCategoryCustomization[] | undefined,
) {
  const configuredById = new Map((configured ?? []).map((category) => [category.id || slugSectionId(category.label), category]))
  const labels = uniqueLabels([
    ...defaults.map((category) => (typeof category === 'string' ? category : category.label)),
    ...(configured ?? []).map((category) => category.label),
  ])
  return labels.map((label, index) => {
    const base = defaultItem(label, index)
    const existing = configuredById.get(base.id)
    return {
      ...base,
      ...existing,
      id: base.id,
      label: existing?.label || base.label,
      visible: existing?.visible ?? base.visible,
      showHeader: existing?.showHeader ?? base.showHeader,
      showTotal: existing?.showTotal ?? base.showTotal,
      order: Number.isFinite(existing?.order) ? Number(existing?.order) : base.order,
    }
  }).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((category, index) => ({ ...category, order: index }))
}

function normalizeGroups(
  defaults: Array<{ label: string; categories: Array<string | { label: string }> }>,
  configured: FinancialStatementGroupCustomization[] | undefined,
) {
  const configuredById = new Map((configured ?? []).map((group) => [group.id || slugSectionId(group.label), group]))
  const defaultsById = new Map(defaults.map((group) => [slugSectionId(group.label), group]))
  const groups = [
    ...defaults,
    ...(configured ?? [])
      .filter((group) => !defaultsById.has(group.id || slugSectionId(group.label)))
      .map((group) => ({ label: group.label, categories: group.categories })),
  ]
  return groups.map((group, index) => {
    const base = defaultItem(group.label, index)
    const existing = configuredById.get(base.id)
    return {
      ...base,
      ...existing,
      id: base.id,
      label: existing?.label || base.label,
      visible: existing?.visible ?? base.visible,
      showHeader: existing?.showHeader ?? base.showHeader,
      showTotal: existing?.showTotal ?? base.showTotal,
      order: Number.isFinite(existing?.order) ? Number(existing?.order) : base.order,
      categories: normalizeCategories(group.categories, existing?.categories),
    }
  }).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((group, index) => ({ ...group, order: index }))
}

function normalizeCalculatedRows(
  type: FinancialStatementCustomizationType,
  configured: FinancialStatementCalculatedRowCustomization[] | undefined,
) {
  const configuredById = new Map((configured ?? []).map((row) => [row.id, row]))
  const defaults = DEFAULT_CALCULATED_ROWS[type].map((row) => ({
    id: row.id,
    label: row.label,
    visible: row.visible,
    order: row.order,
    afterSectionId: row.afterSectionLabel ? slugSectionId(row.afterSectionLabel) : null,
  }))
  const defaultById = new Map(defaults.map((row) => [row.id, row]))
  const rows = [
    ...defaults,
    ...(configured ?? []).filter((row) => !defaultById.has(row.id)),
  ]

  return rows.map((row, index) => {
    const existing = configuredById.get(row.id)
    return {
      ...row,
      ...existing,
      id: row.id,
      label: existing?.label || row.label,
      visible: existing?.visible ?? row.visible,
      afterSectionId: existing?.afterSectionId === undefined ? row.afterSectionId : existing.afterSectionId,
      order: Number.isFinite(existing?.order) ? Number(existing?.order) : index,
    }
  }).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((row, index) => ({ ...row, order: index }))
}

export function buildDefaultFinancialStatementCustomization(
  type: FinancialStatementCustomizationType,
  runtimeOutlineOrLabels: FinancialStatementCustomizationOutline | string[] = [],
): FinancialStatementCustomizationConfig {
  const outline = mergeOutlines(type, runtimeOutlineOrLabels)
  const labels = uniqueLabels(outline.map((section) => section.label))
  return {
    sections: labels.map((label, index) => {
      const section = outline.find((entry) => slugSectionId(entry.label) === slugSectionId(label))
      return {
        ...defaultItem(label, index),
        groups: normalizeGroups(section?.groups ?? [], undefined),
      }
    }),
    calculatedRows: normalizeCalculatedRows(type, undefined),
  }
}

export function normalizeFinancialStatementCustomization(
  type: FinancialStatementCustomizationType,
  input?: Partial<FinancialStatementCustomizationConfig> | null,
  runtimeOutlineOrLabels: FinancialStatementCustomizationOutline | string[] = [],
): FinancialStatementCustomizationConfig {
  const defaults = buildDefaultFinancialStatementCustomization(type, runtimeOutlineOrLabels)
  const configuredById = new Map((input?.sections ?? []).map((section) => [section.id || slugSectionId(section.label), section]))
  const defaultById = new Map(defaults.sections.map((section) => [section.id, section]))
  const sectionsToNormalize = [
    ...defaults.sections,
    ...(input?.sections ?? []).filter((section) => !defaultById.has(section.id || slugSectionId(section.label))),
  ]
  const sections = sectionsToNormalize.map((defaultSection) => {
    const configured = configuredById.get(defaultSection.id)
    return {
      ...defaultSection,
      ...configured,
      id: defaultSection.id,
      label: configured?.label || defaultSection.label,
      visible: configured?.visible ?? defaultSection.visible,
      showHeader: configured?.showHeader ?? defaultSection.showHeader,
      showTotal: configured?.showTotal ?? defaultSection.showTotal,
      order: Number.isFinite(configured?.order) ? Number(configured?.order) : defaultSection.order,
      groups: normalizeGroups(defaultSection.groups, configured?.groups),
    }
  })

  return {
    sections: sections
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
      .map((section, index) => ({ ...section, order: index })),
    calculatedRows: normalizeCalculatedRows(type, input?.calculatedRows),
  }
}
