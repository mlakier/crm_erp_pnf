import { prisma } from '@/lib/prisma'
import {
  getDimensionTransactionFamilyForDocumentType,
  getSeededDimensionApplicability,
  getSeededDimensionFamilyAssignment,
  getDimensionConfigurationRows,
  type DimensionConfigurationRow,
  type DimensionTransactionFamilyKey,
  type SeededDimensionKey,
} from '@/lib/dimension-control-plane'
import type { TransactionLineRequirementsDocumentType } from '@/lib/transaction-line-requirements'

type SeededLineDimensionIds = {
  departmentId?: string | null
  locationId?: string | null
  classId?: string | null
}

type ResolverInput = SeededLineDimensionIds & {
  documentType: TransactionLineRequirementsDocumentType
  itemId?: string | null
  expenseAccountId?: string | null
  projectId?: string | null
}

type ResolverResult = SeededLineDimensionIds & {
  sources: Partial<Record<SeededDimensionKey, string>>
  unresolvedRequired: Array<{ dimensionKey: SeededDimensionKey; label: string }>
}

const SEEDED_LINE_DIMENSIONS: Array<{
  key: SeededDimensionKey
  field: keyof SeededLineDimensionIds
}> = [
  { key: 'department', field: 'departmentId' },
  { key: 'location', field: 'locationId' },
  { key: 'class', field: 'classId' },
]

export async function resolveSeededLineDimensionDefaults(input: ResolverInput): Promise<ResolverResult> {
  const [rows, itemDefaults] = await Promise.all([
    getDimensionConfigurationRows(),
    input.itemId
      ? prisma.item.findUnique({
          where: { id: input.itemId },
          select: { departmentId: true, locationId: true },
        })
      : Promise.resolve(null),
  ])
  const familyKey = getDimensionTransactionFamilyForDocumentType(input.documentType)
  const result: ResolverResult = {
    departmentId: input.departmentId ?? null,
    locationId: input.locationId ?? null,
    classId: input.classId ?? null,
    sources: {},
    unresolvedRequired: [],
  }

  for (const dimension of SEEDED_LINE_DIMENSIONS) {
    const currentValue = result[dimension.field]
    if (currentValue) {
      result.sources[dimension.key] = 'explicit_line_entry'
      continue
    }

    const resolution = resolveSeededLineDimension({
      rows,
      familyKey,
      dimensionKey: dimension.key,
      itemDefaults,
      input,
    })

    if (resolution.value) {
      result[dimension.field] = resolution.value
      result.sources[dimension.key] = resolution.source
    } else if (resolution.required) {
      const row = rows.find((entry) => entry.dimensionKey === dimension.key)
      result.unresolvedRequired.push({ dimensionKey: dimension.key, label: row?.label ?? dimension.key })
    }
  }

  return result
}

function resolveSeededLineDimension({
  rows,
  familyKey,
  dimensionKey,
  itemDefaults,
  input,
}: {
  rows: readonly DimensionConfigurationRow[]
  familyKey: DimensionTransactionFamilyKey | null
  dimensionKey: SeededDimensionKey
  itemDefaults: { departmentId: string | null; locationId: string | null } | null
  input: ResolverInput
}) {
  const row = rows.find((entry) => entry.dimensionKey === dimensionKey)
  const applicability = getSeededDimensionApplicability(rows, dimensionKey, 'transaction_line')
  const familyAssignment = getSeededDimensionFamilyAssignment(rows, dimensionKey, familyKey)
  const familyPolicy = familyKey
    ? row?.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
    : undefined
  const lineAllowed = Boolean(applicability?.isVisible) && (!familyKey || familyAssignment?.allowsLine === true)
  const required = Boolean(lineAllowed && applicability?.isRequired && familyPolicy?.failIfUnresolved)

  if (!lineAllowed) return { value: null, source: null, required }

  const priority = familyPolicy?.lineSourcePriority ?? []
  for (const source of priority) {
    const value = resolveSeededSourceValue(source, dimensionKey, itemDefaults, input)
    if (value) return { value, source, required }
  }

  return { value: null, source: null, required }
}

function resolveSeededSourceValue(
  source: string,
  dimensionKey: SeededDimensionKey,
  itemDefaults: { departmentId: string | null; locationId: string | null } | null,
  input: ResolverInput,
) {
  switch (source) {
    case 'explicit_line_entry':
      return getExplicitLineValue(dimensionKey, input)
    case 'item_defaults':
      return getItemDefaultValue(dimensionKey, itemDefaults)
    default:
      return null
  }
}

function getExplicitLineValue(dimensionKey: SeededDimensionKey, input: ResolverInput) {
  if (dimensionKey === 'department') return input.departmentId ?? null
  if (dimensionKey === 'location') return input.locationId ?? null
  if (dimensionKey === 'class') return input.classId ?? null
  return null
}

function getItemDefaultValue(
  dimensionKey: SeededDimensionKey,
  itemDefaults: { departmentId: string | null; locationId: string | null } | null,
) {
  if (!itemDefaults) return null
  if (dimensionKey === 'department') return itemDefaults.departmentId
  if (dimensionKey === 'location') return itemDefaults.locationId
  return null
}
