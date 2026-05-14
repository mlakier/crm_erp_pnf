import { prisma } from '@/lib/prisma'
import { formatDimensionValueBlockers } from '@/lib/dimension-value-usage'

export const DIMENSION_TARGETS = [
  'transaction_header',
  'transaction_line',
  'gl_line',
  'project_header',
  'subscription_header',
  'customer_record',
  'vendor_record',
  'item_record',
  'gl_account_record',
  'employee_record',
  'user_record',
  'subsidiary_record',
  'contact_record',
  'custom_record',
] as const

export type DimensionTargetKey = (typeof DIMENSION_TARGETS)[number]

export const DIMENSION_SOURCING_TARGETS = [
  'transaction_header',
  'transaction_line',
  'gl_line',
  'project_header',
  'subscription_header',
] as const satisfies readonly DimensionTargetKey[]

export type DimensionSourcingTargetKey = (typeof DIMENSION_SOURCING_TARGETS)[number]

export const DIMENSION_TRANSACTION_FAMILIES = [
  'crm',
  'p2p',
  'rtr',
  'billing_revenue',
] as const

export type DimensionTransactionFamilyKey = (typeof DIMENSION_TRANSACTION_FAMILIES)[number]

export type DimensionConfigurationRow = {
  id: string
  dimensionKey: string
  label: string
  description: string
  dimensionType: string
  valueSourceType: string
  valueModel: string
  selectionType: string
  valueSourceCount: number
  isSeeded: boolean
  isCustom: boolean
  isActive: boolean
  allowsHeaderAssignment: boolean
  allowsLineAssignment: boolean
  allowsGlAssignment: boolean
  allowsProjectAssignment: boolean
  allowsSubscriptionAssignment: boolean
  inheritanceMode: string
  overrideMode: string
  validationMode: string
  postToGl: boolean
  requiresGlSplit: boolean
  values: Array<{
    id: string
    valueKey: string
    businessId: string
    code: string
    name: string
    description: string
    parentName: string
    subsidiarySummary: string
    includeChildren: boolean
    isActive: boolean
    dbId: string
    extraFields: Array<{
      label: string
      value: string
      role: string
    }>
    customFieldValues: Record<string, string>
    sourceModel: 'dimension_value' | 'department' | 'location' | 'class'
    deleteBlockers: string[]
    canDelete: boolean
  }>
  valueFields: Array<{
    id: string
    name: string
    label: string
    type: string
    required: boolean
    defaultValue: string
    options: string
    entityType: string
    status: 'live' | 'planned'
    source: 'core' | 'seeded' | 'custom'
  }>
  applicabilities: Array<{
    id: string
    targetKey: DimensionTargetKey
    isVisible: boolean
    isRequired: boolean
    isLockedInCustomize: boolean
  }>
  sourcingPolicies: Array<{
    id: string
    targetKey: DimensionTargetKey
    sourcePriority: string[]
    allowHeaderInheritance: boolean
    allowSourceLineInheritance: boolean
    allowProjectInheritance: boolean
    allowSubscriptionInheritance: boolean
    allowManualOverride: boolean
    failIfUnresolved: boolean
  }>
  transactionFamilyAssignments: Array<{
    id: string
    familyKey: DimensionTransactionFamilyKey
    allowsHeader: boolean
    allowsLine: boolean
  }>
  transactionFamilySourcingPolicies: Array<{
    id: string
    familyKey: DimensionTransactionFamilyKey
    headerSourcePriority: string[]
    lineSourcePriority: string[]
    allowProjectInheritance: boolean
    allowSubscriptionInheritance: boolean
    allowManualOverride: boolean
    failIfUnresolved: boolean
  }>
}

export function getDimensionValueFieldEntityType(dimensionKey: string) {
  return `dimension_value:${dimensionKey.trim().toLowerCase()}`
}

export type SeededDimensionKey = 'department' | 'location' | 'class'

type SeededDimensionConfig = {
  dimensionKey: string
  label: string
  description: string
  dimensionType: string
  valueSourceType: string
  valueModel: string
  selectionType: string
  isSeeded: boolean
  isCustom: boolean
  isActive: boolean
  allowsHeaderAssignment: boolean
  allowsLineAssignment: boolean
  allowsGlAssignment: boolean
  allowsProjectAssignment: boolean
  allowsSubscriptionAssignment: boolean
  inheritanceMode: string
  overrideMode: string
  validationMode: string
  postToGl: boolean
  requiresGlSplit: boolean
  applicabilities: Partial<Record<
    DimensionTargetKey,
    {
      isVisible: boolean
      isRequired: boolean
      isLockedInCustomize: boolean
    }
  >>
  sourcingPolicies: Record<
    DimensionSourcingTargetKey,
    {
      sourcePriority: string[]
      allowHeaderInheritance: boolean
      allowSourceLineInheritance: boolean
      allowProjectInheritance: boolean
      allowSubscriptionInheritance: boolean
      allowManualOverride: boolean
      failIfUnresolved: boolean
    }
  >
  transactionFamilyAssignments: Record<
    DimensionTransactionFamilyKey,
    {
      allowsHeader: boolean
      allowsLine: boolean
    }
  >
  transactionFamilySourcingPolicies: Record<
    DimensionTransactionFamilyKey,
    {
      headerSourcePriority: string[]
      lineSourcePriority: string[]
      allowProjectInheritance: boolean
      allowSubscriptionInheritance: boolean
      allowManualOverride: boolean
      failIfUnresolved: boolean
    }
  >
}

const SEEDED_DIMENSION_CONFIGS: SeededDimensionConfig[] = [
  {
    dimensionKey: 'department',
    label: 'Department',
    description: 'Seeded operational and reporting dimension for ownership and management slicing.',
    dimensionType: 'internal',
    valueSourceType: 'department',
    valueModel: 'managed_list_record',
    selectionType: 'single_select',
    isSeeded: true,
    isCustom: false,
    isActive: true,
    allowsHeaderAssignment: true,
    allowsLineAssignment: true,
    allowsGlAssignment: true,
    allowsProjectAssignment: true,
    allowsSubscriptionAssignment: true,
    inheritanceMode: 'inherit_with_override',
    overrideMode: 'allowed',
    validationMode: 'optional',
    postToGl: true,
    requiresGlSplit: true,
    applicabilities: {
      transaction_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      transaction_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      gl_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      project_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      subscription_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
    },
    sourcingPolicies: {
      transaction_header: {
        sourcePriority: ['explicit_user_entry', 'upstream_source_document', 'project_defaults', 'subscription_defaults', 'counterparty_defaults', 'subsidiary_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      transaction_line: {
        sourcePriority: ['explicit_line_entry', 'upstream_source_line', 'item_defaults', 'project_defaults', 'subscription_defaults', 'header_inheritance'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      gl_line: {
        sourcePriority: ['source_transaction_line', 'source_transaction_header', 'revenue_element', 'posting_policy_override'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: false,
        failIfUnresolved: false,
      },
      project_header: {
        sourcePriority: ['explicit_user_entry'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      subscription_header: {
        sourcePriority: ['explicit_user_entry', 'subscription_plan_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
    transactionFamilyAssignments: {
      crm: { allowsHeader: true, allowsLine: true },
      p2p: { allowsHeader: true, allowsLine: true },
      rtr: { allowsHeader: false, allowsLine: true },
      billing_revenue: { allowsHeader: true, allowsLine: true },
    },
    transactionFamilySourcingPolicies: {
      crm: {
        headerSourcePriority: ['upstream_source_document', 'customer_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'customer_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      p2p: {
        headerSourcePriority: ['upstream_source_document', 'vendor_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'vendor_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      rtr: {
        headerSourcePriority: ['explicit_user_entry', 'subsidiary_defaults'],
        lineSourcePriority: ['gl_account_defaults', 'explicit_line_entry'],
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      billing_revenue: {
        headerSourcePriority: ['customer_defaults', 'subscription_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['subscription_defaults', 'billable_charge', 'item_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
  },
  {
    dimensionKey: 'location',
    label: 'Location',
    description: 'Seeded operational and reporting dimension for site, branch, or physical responsibility.',
    dimensionType: 'internal',
    valueSourceType: 'location',
    valueModel: 'managed_list_record',
    selectionType: 'single_select',
    isSeeded: true,
    isCustom: false,
    isActive: true,
    allowsHeaderAssignment: true,
    allowsLineAssignment: true,
    allowsGlAssignment: true,
    allowsProjectAssignment: true,
    allowsSubscriptionAssignment: true,
    inheritanceMode: 'inherit_with_override',
    overrideMode: 'allowed',
    validationMode: 'optional',
    postToGl: true,
    requiresGlSplit: true,
    applicabilities: {
      transaction_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      transaction_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      gl_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      project_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      subscription_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
    },
    sourcingPolicies: {
      transaction_header: {
        sourcePriority: ['explicit_user_entry', 'upstream_source_document', 'project_defaults', 'subscription_defaults', 'counterparty_defaults', 'subsidiary_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      transaction_line: {
        sourcePriority: ['explicit_line_entry', 'upstream_source_line', 'item_defaults', 'project_defaults', 'subscription_defaults', 'header_inheritance'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      gl_line: {
        sourcePriority: ['source_transaction_line', 'source_transaction_header', 'revenue_element', 'posting_policy_override'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: false,
        failIfUnresolved: false,
      },
      project_header: {
        sourcePriority: ['explicit_user_entry'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      subscription_header: {
        sourcePriority: ['explicit_user_entry', 'subscription_plan_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
    transactionFamilyAssignments: {
      crm: { allowsHeader: true, allowsLine: true },
      p2p: { allowsHeader: true, allowsLine: true },
      rtr: { allowsHeader: false, allowsLine: true },
      billing_revenue: { allowsHeader: true, allowsLine: true },
    },
    transactionFamilySourcingPolicies: {
      crm: {
        headerSourcePriority: ['upstream_source_document', 'customer_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'customer_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      p2p: {
        headerSourcePriority: ['upstream_source_document', 'vendor_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'vendor_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      rtr: {
        headerSourcePriority: ['explicit_user_entry', 'subsidiary_defaults'],
        lineSourcePriority: ['gl_account_defaults', 'explicit_line_entry'],
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      billing_revenue: {
        headerSourcePriority: ['customer_defaults', 'subscription_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['subscription_defaults', 'billable_charge', 'item_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
  },
  {
    dimensionKey: 'class',
    label: 'Class',
    description: 'Seeded reporting dimension for business classification, product family, or management segmentation.',
    dimensionType: 'internal',
    valueSourceType: 'class',
    valueModel: 'managed_list_record',
    selectionType: 'single_select',
    isSeeded: true,
    isCustom: false,
    isActive: true,
    allowsHeaderAssignment: true,
    allowsLineAssignment: true,
    allowsGlAssignment: true,
    allowsProjectAssignment: true,
    allowsSubscriptionAssignment: true,
    inheritanceMode: 'inherit_with_override',
    overrideMode: 'allowed',
    validationMode: 'optional',
    postToGl: true,
    requiresGlSplit: true,
    applicabilities: {
      transaction_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      transaction_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      gl_line: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      project_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
      subscription_header: { isVisible: true, isRequired: false, isLockedInCustomize: false },
    },
    sourcingPolicies: {
      transaction_header: {
        sourcePriority: ['explicit_user_entry', 'upstream_source_document', 'project_defaults', 'subscription_defaults', 'counterparty_defaults', 'subsidiary_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      transaction_line: {
        sourcePriority: ['explicit_line_entry', 'upstream_source_line', 'item_defaults', 'project_defaults', 'subscription_defaults', 'header_inheritance'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      gl_line: {
        sourcePriority: ['source_transaction_line', 'source_transaction_header', 'revenue_element', 'posting_policy_override'],
        allowHeaderInheritance: true,
        allowSourceLineInheritance: true,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: false,
        failIfUnresolved: false,
      },
      project_header: {
        sourcePriority: ['explicit_user_entry'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      subscription_header: {
        sourcePriority: ['explicit_user_entry', 'subscription_plan_defaults'],
        allowHeaderInheritance: false,
        allowSourceLineInheritance: false,
        allowProjectInheritance: false,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
    transactionFamilyAssignments: {
      crm: { allowsHeader: true, allowsLine: true },
      p2p: { allowsHeader: true, allowsLine: true },
      rtr: { allowsHeader: false, allowsLine: true },
      billing_revenue: { allowsHeader: true, allowsLine: true },
    },
    transactionFamilySourcingPolicies: {
      crm: {
        headerSourcePriority: ['upstream_source_document', 'customer_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'customer_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      p2p: {
        headerSourcePriority: ['upstream_source_document', 'vendor_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['upstream_source_line', 'item_defaults', 'vendor_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      rtr: {
        headerSourcePriority: ['explicit_user_entry', 'subsidiary_defaults'],
        lineSourcePriority: ['gl_account_defaults', 'explicit_line_entry'],
        allowProjectInheritance: false,
        allowSubscriptionInheritance: false,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
      billing_revenue: {
        headerSourcePriority: ['customer_defaults', 'subscription_defaults', 'explicit_user_entry'],
        lineSourcePriority: ['subscription_defaults', 'billable_charge', 'item_defaults', 'explicit_line_entry'],
        allowProjectInheritance: true,
        allowSubscriptionInheritance: true,
        allowManualOverride: true,
        failIfUnresolved: false,
      },
    },
  },
]

const VALUE_SOURCE_LABELS: Record<string, string> = {
  department: 'Departments',
  location: 'Locations',
  class: 'Classes',
  generic: 'Generic Values',
}

async function countValueSources() {
  const [departmentCount, locationCount, classCount, genericCount] = await Promise.all([
    prisma.department.count(),
    prisma.location.count(),
    prisma.classDimension.count(),
    prisma.dimensionValue.count(),
  ])

  return {
    department: departmentCount,
    location: locationCount,
    class: classCount,
    generic: genericCount,
  }
}

export async function ensureDimensionControlPlaneSeeded() {
  for (const config of SEEDED_DIMENSION_CONFIGS) {
    const existing = await prisma.dimensionDefinition.findUnique({
      where: { dimensionKey: config.dimensionKey },
      select: { id: true },
    })

    const definitionId =
      existing?.id ??
      (
        await prisma.dimensionDefinition.create({
          data: {
            dimensionKey: config.dimensionKey,
            label: config.label,
            description: config.description,
            dimensionType: config.dimensionType,
            valueSourceType: config.valueSourceType,
            valueModel: config.valueModel,
            selectionType: config.selectionType,
            isSeeded: config.isSeeded,
            isCustom: config.isCustom,
            isActive: config.isActive,
            allowsHeaderAssignment: config.allowsHeaderAssignment,
            allowsLineAssignment: config.allowsLineAssignment,
            allowsGlAssignment: config.allowsGlAssignment,
            allowsProjectAssignment: config.allowsProjectAssignment,
            allowsSubscriptionAssignment: config.allowsSubscriptionAssignment,
            inheritanceMode: config.inheritanceMode,
            overrideMode: config.overrideMode,
            validationMode: config.validationMode,
            postToGl: config.postToGl,
            requiresGlSplit: config.requiresGlSplit,
          },
          select: { id: true },
        })
      ).id

    for (const targetKey of DIMENSION_TARGETS) {
      const applicability = config.applicabilities[targetKey] ?? {
        isVisible: false,
        isRequired: false,
        isLockedInCustomize: false,
      }

      const existingApplicability = await prisma.dimensionApplicability.findUnique({
        where: { dimensionDefinitionId_targetKey: { dimensionDefinitionId: definitionId, targetKey } },
        select: { id: true },
      })
      if (!existingApplicability) {
        await prisma.dimensionApplicability.create({
          data: {
            dimensionDefinitionId: definitionId,
            targetKey,
            isVisible: applicability.isVisible,
            isRequired: applicability.isRequired,
            isLockedInCustomize: applicability.isLockedInCustomize,
          },
        })
      }

    }

    for (const targetKey of DIMENSION_SOURCING_TARGETS) {
      const policy = config.sourcingPolicies[targetKey]
      const existingPolicy = await prisma.dimensionSourcingPolicy.findUnique({
        where: { dimensionDefinitionId_targetKey: { dimensionDefinitionId: definitionId, targetKey } },
        select: { id: true },
      })
      if (!existingPolicy) {
        await prisma.dimensionSourcingPolicy.create({
          data: {
            dimensionDefinitionId: definitionId,
            targetKey,
            sourcePriorityJson: JSON.stringify(policy.sourcePriority),
            allowHeaderInheritance: policy.allowHeaderInheritance,
            allowSourceLineInheritance: policy.allowSourceLineInheritance,
            allowProjectInheritance: policy.allowProjectInheritance,
            allowSubscriptionInheritance: policy.allowSubscriptionInheritance,
            allowManualOverride: policy.allowManualOverride,
            failIfUnresolved: policy.failIfUnresolved,
          },
        })
      }
    }

    for (const familyKey of DIMENSION_TRANSACTION_FAMILIES) {
      const familyAssignment = config.transactionFamilyAssignments[familyKey]
      const existingFamilyAssignment = await prisma.dimensionTransactionFamilyAssignment.findUnique({
        where: { dimensionDefinitionId_familyKey: { dimensionDefinitionId: definitionId, familyKey } },
        select: { id: true },
      })
      if (!existingFamilyAssignment) {
        await prisma.dimensionTransactionFamilyAssignment.create({
          data: {
            dimensionDefinitionId: definitionId,
            familyKey,
            allowsHeader: familyAssignment.allowsHeader,
            allowsLine: familyAssignment.allowsLine,
          },
        })
      }

      const familySourcing = config.transactionFamilySourcingPolicies[familyKey]
      const existingFamilySourcing = await prisma.dimensionTransactionFamilySourcingPolicy.findUnique({
        where: { dimensionDefinitionId_familyKey: { dimensionDefinitionId: definitionId, familyKey } },
        select: { id: true },
      })
      if (!existingFamilySourcing) {
        await prisma.dimensionTransactionFamilySourcingPolicy.create({
          data: {
            dimensionDefinitionId: definitionId,
            familyKey,
            headerSourcePriorityJson: JSON.stringify(familySourcing.headerSourcePriority),
            lineSourcePriorityJson: JSON.stringify(familySourcing.lineSourcePriority),
            allowProjectInheritance: familySourcing.allowProjectInheritance,
            allowSubscriptionInheritance: familySourcing.allowSubscriptionInheritance,
            allowManualOverride: familySourcing.allowManualOverride,
            failIfUnresolved: familySourcing.failIfUnresolved,
          },
        })
      }
    }
  }
}

function parseSourcePriority(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean)
    }
  } catch {}
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

type UsageCounterMap = Map<string, Record<string, number>>

function addUsageCounts(
  map: UsageCounterMap,
  rows: unknown[],
  key: string,
  label: string,
) {
  for (const rawRow of rows) {
    const row = rawRow as Record<string, unknown>
    const valueId = typeof row[key] === 'string' ? row[key] : null
    if (!valueId) continue
    const countValue = row._count
    const count =
      countValue && typeof countValue === 'object' && '_all' in countValue
        ? Number((countValue as { _all: unknown })._all)
        : 0
    if (!count) continue
    const current = map.get(valueId) ?? {}
    current[label] = (current[label] ?? 0) + count
    map.set(valueId, current)
  }
}

function toBlockerMap(map: UsageCounterMap) {
  return new Map(Array.from(map.entries()).map(([valueId, counts]) => [valueId, formatDimensionValueBlockers(counts)]))
}

async function buildDepartmentUsageMap() {
  const [
    users,
    requisitions,
    employees,
    invoiceLines,
    billLines,
    journalLines,
    items,
    childDepartments,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.requisition.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.invoiceLineItem.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.billLineItem.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.journalEntryLineItem.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.item.groupBy({ by: ['departmentId'], where: { departmentId: { not: null } }, _count: { _all: true } }),
    prisma.department.groupBy({ by: ['parentDepartmentId'], where: { parentDepartmentId: { not: null } }, _count: { _all: true } }),
  ])
  const map: UsageCounterMap = new Map()
  addUsageCounts(map, users, 'departmentId', 'users')
  addUsageCounts(map, requisitions, 'departmentId', 'requisitions')
  addUsageCounts(map, employees, 'departmentId', 'employees')
  addUsageCounts(map, invoiceLines, 'departmentId', 'invoice lines')
  addUsageCounts(map, billLines, 'departmentId', 'bill lines')
  addUsageCounts(map, journalLines, 'departmentId', 'journal lines')
  addUsageCounts(map, items, 'departmentId', 'items')
  addUsageCounts(map, childDepartments, 'parentDepartmentId', 'child departments')
  return toBlockerMap(map)
}

async function buildLocationUsageMap() {
  const [employees, invoiceLines, billLines, journalLines, items, childLocations] = await Promise.all([
    prisma.employee.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { _all: true } }),
    prisma.invoiceLineItem.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { _all: true } }),
    prisma.billLineItem.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { _all: true } }),
    prisma.journalEntryLineItem.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { _all: true } }),
    prisma.item.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { _all: true } }),
    prisma.location.groupBy({ by: ['parentLocationId'], where: { parentLocationId: { not: null } }, _count: { _all: true } }),
  ])
  const map: UsageCounterMap = new Map()
  addUsageCounts(map, employees, 'locationId', 'employees')
  addUsageCounts(map, invoiceLines, 'locationId', 'invoice lines')
  addUsageCounts(map, billLines, 'locationId', 'bill lines')
  addUsageCounts(map, journalLines, 'locationId', 'journal lines')
  addUsageCounts(map, items, 'locationId', 'items')
  addUsageCounts(map, childLocations, 'parentLocationId', 'child locations')
  return toBlockerMap(map)
}

async function buildClassUsageMap() {
  const [invoiceLines, billLines, journalLines] = await Promise.all([
    prisma.invoiceLineItem.groupBy({ by: ['classId'], where: { classId: { not: null } }, _count: { _all: true } }),
    prisma.billLineItem.groupBy({ by: ['classId'], where: { classId: { not: null } }, _count: { _all: true } }),
    prisma.journalEntryLineItem.groupBy({ by: ['classId'], where: { classId: { not: null } }, _count: { _all: true } }),
  ])
  const map: UsageCounterMap = new Map()
  addUsageCounts(map, invoiceLines, 'classId', 'invoice lines')
  addUsageCounts(map, billLines, 'classId', 'bill lines')
  addUsageCounts(map, journalLines, 'classId', 'journal lines')
  return toBlockerMap(map)
}

export async function getDimensionConfigurationRows(): Promise<DimensionConfigurationRow[]> {
  await ensureDimensionControlPlaneSeeded()

  const counts = await countValueSources()
  const [departments, locations, classes, customValueFields, customValueEntries] = await Promise.all([
    prisma.department.findMany({
      select: {
        id: true,
        departmentId: true,
        departmentNumber: true,
        name: true,
        description: true,
        division: true,
        planningCategory: true,
        includeChildren: true,
        active: true,
        parentDepartment: { select: { name: true, departmentId: true, departmentNumber: true } },
        manager: { select: { firstName: true, lastName: true, employeeId: true } },
        approver: { select: { firstName: true, lastName: true, employeeId: true } },
        departmentSubsidiaries: {
          select: { subsidiary: { select: { name: true, subsidiaryId: true } } },
          orderBy: { subsidiary: { name: 'asc' } },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { name: 'asc' }],
    }),
    prisma.location.findMany({
      select: {
        id: true,
        locationId: true,
        code: true,
        name: true,
        address: true,
        locationType: true,
        makeInventoryAvailable: true,
        inactive: true,
        parentLocation: { select: { name: true, locationId: true, code: true } },
        subsidiary: { select: { name: true, subsidiaryId: true } },
      },
      orderBy: [{ locationId: 'asc' }, { name: 'asc' }],
    }),
    prisma.classDimension.findMany({
      select: { id: true, classId: true, name: true, description: true, inactive: true },
      orderBy: [{ name: 'asc' }],
    }),
    prisma.customFieldDefinition.findMany({
      where: { entityType: { startsWith: 'dimension_value:' } },
      orderBy: [{ entityType: 'asc' }, { label: 'asc' }],
    }),
    prisma.customFieldValue.findMany({
      where: { entityType: { startsWith: 'dimension_value:' } },
      select: { fieldId: true, recordId: true, value: true, entityType: true },
    }),
  ])
  const rows = await prisma.dimensionDefinition.findMany({
    include: {
      values: { orderBy: [{ name: 'asc' }] },
      applicabilities: { orderBy: { targetKey: 'asc' } },
      sourcingPolicies: { orderBy: { targetKey: 'asc' } },
      transactionFamilyAssignments: { orderBy: { familyKey: 'asc' } },
      transactionFamilySourcingPolicies: { orderBy: { familyKey: 'asc' } },
    },
    orderBy: [{ isSeeded: 'desc' }, { label: 'asc' }],
  })
  const [departmentUsageMap, locationUsageMap, classUsageMap] = await Promise.all([
    buildDepartmentUsageMap(),
    buildLocationUsageMap(),
    buildClassUsageMap(),
  ])

  return Promise.all(rows.map(async (row) => {
    const valueFieldEntityType = getDimensionValueFieldEntityType(row.dimensionKey)
    const customFieldsForRow = customValueFields.filter((field) => field.entityType === valueFieldEntityType)
    const customFieldValueMap = new Map(
      customValueEntries
        .filter((entry) => entry.entityType === valueFieldEntityType)
        .map((entry) => [`${entry.recordId}:${entry.fieldId}`, entry.value]),
    )
    const buildCustomFieldValues = (recordId: string) =>
      Object.fromEntries(customFieldsForRow.map((field) => [field.id, customFieldValueMap.get(`${recordId}:${field.id}`) ?? '']))

    const valuesWithoutUsage =
      row.valueSourceType === 'department'
        ? departments.map((entry) => ({
            id: entry.id,
            valueKey: entry.departmentId,
            businessId: entry.departmentId,
            code: entry.departmentNumber ?? entry.departmentId,
            name: entry.name,
            description: entry.description ?? '',
            parentName: formatLinkedValue(entry.parentDepartment?.departmentNumber ?? entry.parentDepartment?.departmentId, entry.parentDepartment?.name),
            subsidiarySummary: summarizeSubsidiaries(entry.departmentSubsidiaries.map((item) => item.subsidiary)),
            includeChildren: entry.includeChildren,
            isActive: entry.active,
            dbId: entry.id,
            extraFields: [
              { label: 'Division', value: entry.division ?? '-', role: 'Reporting attribute' },
              { label: 'Planning Category', value: entry.planningCategory ?? '-', role: 'Reporting attribute' },
              { label: 'Manager', value: formatEmployeeName(entry.manager), role: 'Workflow control' },
              { label: 'Approver', value: formatEmployeeName(entry.approver), role: 'Workflow control' },
            ],
            customFieldValues: buildCustomFieldValues(entry.id),
            sourceModel: 'department' as const,
          }))
        : row.valueSourceType === 'location'
          ? locations.map((entry) => ({
              id: entry.id,
              valueKey: entry.locationId,
              businessId: entry.locationId,
              code: entry.code,
              name: entry.name,
              description: '',
              parentName: formatLinkedValue(entry.parentLocation?.code ?? entry.parentLocation?.locationId, entry.parentLocation?.name),
              subsidiarySummary: formatLinkedValue(entry.subsidiary?.subsidiaryId, entry.subsidiary?.name),
              includeChildren: false,
              isActive: !entry.inactive,
              dbId: entry.id,
              extraFields: [
                { label: 'Location Type', value: entry.locationType ?? '-', role: 'Reporting attribute' },
                { label: 'Address', value: entry.address ?? '-', role: 'Informational' },
                {
                  label: 'Make Inventory Available',
                  value: entry.makeInventoryAvailable ? 'Yes' : 'No',
                  role: 'Operational control',
                },
              ],
              customFieldValues: buildCustomFieldValues(entry.id),
              sourceModel: 'location' as const,
            }))
          : row.valueSourceType === 'class'
            ? classes.map((entry) => ({
                id: entry.id,
                valueKey: entry.classId,
                businessId: entry.classId,
                code: entry.classId,
                name: entry.name,
                description: entry.description ?? '',
                parentName: '-',
                subsidiarySummary: 'All subsidiaries',
                includeChildren: false,
                isActive: !entry.inactive,
                dbId: entry.id,
                extraFields: [],
                customFieldValues: buildCustomFieldValues(entry.id),
                sourceModel: 'class' as const,
              }))
            : row.values.map((entry) => ({
                id: entry.id,
                valueKey: entry.valueKey,
                businessId: entry.valueKey,
                code: entry.code,
                name: entry.name,
                description: entry.description ?? '',
                parentName: '-',
                subsidiarySummary: 'All subsidiaries',
                includeChildren: false,
                isActive: entry.isActive,
                dbId: entry.id,
                extraFields: [],
                customFieldValues: buildCustomFieldValues(entry.id),
                sourceModel: 'dimension_value' as const,
              }))

    const values = await Promise.all(
      valuesWithoutUsage.map(async (value) => {
        const deleteBlockers =
          value.sourceModel === 'department'
            ? departmentUsageMap.get(value.id) ?? []
            : value.sourceModel === 'location'
              ? locationUsageMap.get(value.id) ?? []
              : value.sourceModel === 'class'
                ? classUsageMap.get(value.id) ?? []
                : []
        return {
          ...value,
          deleteBlockers,
          canDelete: deleteBlockers.length === 0,
        }
      }),
    )

    const valueFields = [
      ...buildDimensionCoreValueFields(row.valueSourceType),
      ...buildSeededDimensionValueFields(row.valueSourceType),
      ...customFieldsForRow
        .map((field) => ({
          id: field.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          defaultValue: field.defaultValue ?? '',
          options: field.options ?? '',
          entityType: field.entityType,
          status: 'live' as const,
          source: 'custom' as const,
        })),
    ]

    return {
      id: row.id,
      dimensionKey: row.dimensionKey,
      label: row.label,
      description: row.description ?? '',
      dimensionType: row.dimensionType,
      valueSourceType: row.valueSourceType,
      valueModel: row.valueModel,
      selectionType: row.selectionType,
      valueSourceCount: row.valueSourceType === 'generic' ? values.length : counts[row.valueSourceType as keyof typeof counts] ?? 0,
      isSeeded: row.isSeeded,
      isCustom: row.isCustom,
      isActive: row.isActive,
      allowsHeaderAssignment: row.allowsHeaderAssignment,
      allowsLineAssignment: row.allowsLineAssignment,
      allowsGlAssignment: row.allowsGlAssignment,
      allowsProjectAssignment: row.allowsProjectAssignment,
      allowsSubscriptionAssignment: row.allowsSubscriptionAssignment,
      inheritanceMode: row.inheritanceMode,
      overrideMode: row.overrideMode,
      validationMode: row.validationMode,
      postToGl: row.postToGl,
      requiresGlSplit: row.requiresGlSplit,
      values,
      valueFields,
      applicabilities: DIMENSION_TARGETS.map((targetKey) => {
        const applicability = row.applicabilities.find((entry) => entry.targetKey === targetKey)
        return {
          id: applicability?.id ?? `${row.id}-${targetKey}-applicability`,
          targetKey,
          isVisible: applicability?.isVisible ?? false,
          isRequired: applicability?.isRequired ?? false,
          isLockedInCustomize: applicability?.isLockedInCustomize ?? false,
        }
      }),
      sourcingPolicies: DIMENSION_SOURCING_TARGETS.map((targetKey) => {
        const policy = row.sourcingPolicies.find((entry) => entry.targetKey === targetKey)
        return {
          id: policy?.id ?? `${row.id}-${targetKey}-policy`,
          targetKey,
          sourcePriority: parseSourcePriority(policy?.sourcePriorityJson),
          allowHeaderInheritance: policy?.allowHeaderInheritance ?? false,
          allowSourceLineInheritance: policy?.allowSourceLineInheritance ?? false,
          allowProjectInheritance: policy?.allowProjectInheritance ?? false,
          allowSubscriptionInheritance: policy?.allowSubscriptionInheritance ?? false,
          allowManualOverride: policy?.allowManualOverride ?? false,
          failIfUnresolved: policy?.failIfUnresolved ?? false,
        }
      }),
      transactionFamilyAssignments: DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => {
        const assignment = row.transactionFamilyAssignments.find((entry) => entry.familyKey === familyKey)
        return {
          id: assignment?.id ?? `${row.id}-${familyKey}-family-assignment`,
          familyKey,
          allowsHeader: assignment?.allowsHeader ?? false,
          allowsLine: assignment?.allowsLine ?? false,
        }
      }),
      transactionFamilySourcingPolicies: DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => {
        const policy = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
        return {
          id: policy?.id ?? `${row.id}-${familyKey}-family-sourcing`,
          familyKey,
        headerSourcePriority: parseSourcePriority(policy?.headerSourcePriorityJson),
        lineSourcePriority: parseSourcePriority(policy?.lineSourcePriorityJson),
        allowProjectInheritance: policy?.allowProjectInheritance ?? false,
        allowSubscriptionInheritance: policy?.allowSubscriptionInheritance ?? false,
        allowManualOverride: policy?.allowManualOverride ?? true,
        failIfUnresolved: policy?.failIfUnresolved ?? false,
        }
      }),
    }
  }))
}

function buildDimensionCoreValueFields(valueSourceType: string): DimensionConfigurationRow['valueFields'] {
  return [
    {
      id: `core-${valueSourceType}-business-id`,
      name: 'business_id',
      label: 'Business ID',
      type: 'text',
      required: true,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-code`,
      name: 'code',
      label: 'Code',
      type: 'text',
      required: true,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-name`,
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-description`,
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-parent`,
      name: 'parent',
      label: 'Parent',
      type: 'list_record',
      required: false,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: valueSourceType === 'class' ? 'planned' : 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-subsidiaries`,
      name: 'subsidiaries',
      label: 'Subsidiaries',
      type: 'subsidiary',
      required: false,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: valueSourceType === 'class' ? 'planned' : 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-include-children`,
      name: 'include_children',
      label: 'Include Children',
      type: 'checkbox',
      required: false,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: valueSourceType === 'department' ? 'live' : 'planned',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-inactive`,
      name: 'inactive',
      label: 'Inactive',
      type: 'checkbox',
      required: false,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
    {
      id: `core-${valueSourceType}-db-id`,
      name: 'db_id',
      label: 'DB ID',
      type: 'text',
      required: true,
      defaultValue: '',
      options: '',
      entityType: `dimension_core:${valueSourceType}`,
      status: 'live',
      source: 'core',
    },
  ]
}

function buildSeededDimensionValueFields(valueSourceType: string): DimensionConfigurationRow['valueFields'] {
  if (valueSourceType === 'department') {
    return [
      buildSeededValueField('department', 'division', 'Division', 'text', false),
      buildSeededValueField('department', 'planning_category', 'Planning Category', 'list_record', false),
      buildSeededValueField('department', 'manager', 'Manager', 'employee', false),
      buildSeededValueField('department', 'approver', 'Approver', 'employee', false),
    ]
  }
  if (valueSourceType === 'location') {
    return [
      buildSeededValueField('location', 'location_type', 'Location Type', 'list_record', false),
      buildSeededValueField('location', 'address', 'Address', 'address', false),
      buildSeededValueField('location', 'make_inventory_available', 'Make Inventory Available', 'checkbox', false),
      { ...buildSeededValueField('location', 'approver', 'Approver', 'employee', false), status: 'planned' as const },
    ]
  }
  if (valueSourceType === 'class') {
    return [
      { ...buildSeededValueField('class', 'class_group', 'Class Group', 'list_record', false), status: 'planned' as const },
      { ...buildSeededValueField('class', 'owner', 'Owner', 'employee', false), status: 'planned' as const },
    ]
  }
  return []
}

function buildSeededValueField(
  valueSourceType: string,
  name: string,
  label: string,
  type: string,
  required: boolean,
): DimensionConfigurationRow['valueFields'][number] {
  return {
    id: `seeded-${valueSourceType}-${name}`,
    name,
    label,
    type,
    required,
    defaultValue: '',
    options: '',
    entityType: `dimension_seeded:${valueSourceType}`,
    status: 'live',
    source: 'seeded',
  }
}

export function formatDimensionTargetLabel(targetKey: DimensionTargetKey): string {
  switch (targetKey) {
    case 'transaction_header':
      return 'Transaction Header'
    case 'transaction_line':
      return 'Transaction Line'
    case 'gl_line':
      return 'GL Line'
    case 'project_header':
      return 'Project'
    case 'subscription_header':
      return 'Subscription'
    case 'customer_record':
      return 'Customer'
    case 'vendor_record':
      return 'Vendor'
    case 'item_record':
      return 'Item'
    case 'gl_account_record':
      return 'GL Account'
    case 'employee_record':
      return 'Employee'
    case 'user_record':
      return 'User'
    case 'subsidiary_record':
      return 'Subsidiary'
    case 'contact_record':
      return 'Contact'
    case 'custom_record':
      return 'Custom Record'
    default:
      return targetKey
  }
}

export function formatDimensionValueSourceLabel(valueSourceType: string): string {
  return VALUE_SOURCE_LABELS[valueSourceType] ?? valueSourceType
}

export function formatDimensionTypeLabel(dimensionType: string): string {
  switch (dimensionType) {
    case 'internal':
      return 'Internal Dimension'
    case 'custom':
      return 'Custom Dimension'
    default:
      return dimensionType
  }
}

export function formatDimensionValueModelLabel(valueModel: string): string {
  switch (valueModel) {
    case 'managed_list_record':
      return 'Managed List Record'
    case 'simple_managed_list':
      return 'Simple Managed List'
    case 'custom_record_backed':
      return 'Custom Record-Backed'
    default:
      return valueModel
  }
}

export function formatDimensionSelectionTypeLabel(selectionType: string): string {
  switch (selectionType) {
    case 'single_select':
      return 'Single Select'
    case 'multi_select':
      return 'Multi Select'
    default:
      return selectionType
  }
}

export function formatDimensionTransactionFamilyLabel(familyKey: DimensionTransactionFamilyKey): string {
  switch (familyKey) {
    case 'crm':
      return 'LTC'
    case 'p2p':
      return 'PTP'
    case 'rtr':
      return 'RTR'
    case 'billing_revenue':
      return 'Billing / Revenue'
    default:
      return familyKey
  }
}

export function getDimensionTransactionFamilySourcingDescription(familyKey: DimensionTransactionFamilyKey): string {
  switch (familyKey) {
    case 'crm':
      return 'Controls how dimensions default through lead-to-cash documents: opportunity, quote, sales order, fulfillment, invoice, credit memo, cash application, and related customer or revenue records.'
    case 'p2p':
      return 'Controls how dimensions default through procure-to-pay documents: purchase requisition, purchase order, receipt, vendor bill, bill credit, vendor payment, and vendor refund.'
    case 'rtr':
      return 'Controls how dimensions default through record-to-report activity: journals, intercompany journals, allocations, accruals, reclasses, clearing, FX, and GL posting lines.'
    case 'billing_revenue':
      return 'Covers specialized billing and revenue sourcing when upstream LTC inheritance is not enough or not available, including subscriptions, usage, billable charges, revenue arrangements, revenue elements, plans, forecasts, and rev rec journals.'
    default:
      return 'Controls how dimensions default through this transaction family.'
  }
}

function formatLinkedValue(code: string | null | undefined, name: string | null | undefined) {
  if (code && name) return `${code} - ${name}`
  return name ?? code ?? '-'
}

function formatEmployeeName(
  employee: { firstName: string; lastName: string; employeeId: string | null } | null | undefined,
) {
  if (!employee) return '-'
  const name = `${employee.firstName} ${employee.lastName}`.trim()
  return formatLinkedValue(employee.employeeId, name || null)
}

function summarizeSubsidiaries(subsidiaries: Array<{ subsidiaryId: string; name: string }>) {
  if (subsidiaries.length === 0) return 'All subsidiaries'
  if (subsidiaries.length === 1) return formatLinkedValue(subsidiaries[0]?.subsidiaryId, subsidiaries[0]?.name)
  return `${subsidiaries.length} subsidiaries`
}

function findDimensionRow(
  rows: readonly DimensionConfigurationRow[],
  dimensionKey: SeededDimensionKey,
) {
  return rows.find((row) => row.dimensionKey === dimensionKey)
}

export function getSeededDimensionApplicability(
  rows: readonly DimensionConfigurationRow[],
  dimensionKey: SeededDimensionKey,
  targetKey: DimensionTargetKey,
) {
  return findDimensionRow(rows, dimensionKey)?.applicabilities.find(
    (entry) => entry.targetKey === targetKey,
  )
}

export function getDimensionTransactionFamilyForDocumentType(
  documentType: string | null | undefined,
): DimensionTransactionFamilyKey | null {
  switch (documentType) {
    case 'opportunity':
    case 'quote':
    case 'sales-order':
    case 'fulfillment':
    case 'invoice':
    case 'credit-memo':
      return 'crm'
    case 'purchase-requisition':
    case 'purchase-order':
    case 'receipt':
    case 'bill':
    case 'bill-credit':
      return 'p2p'
    case 'journal':
    case 'intercompany-journal':
      return 'rtr'
    default:
      return null
  }
}

export function getSeededDimensionFamilyAssignment(
  rows: readonly DimensionConfigurationRow[],
  dimensionKey: SeededDimensionKey,
  familyKey: DimensionTransactionFamilyKey | null | undefined,
) {
  if (!familyKey) return null
  return findDimensionRow(rows, dimensionKey)?.transactionFamilyAssignments.find(
    (entry) => entry.familyKey === familyKey,
  ) ?? null
}

export function getSeededDimensionLineCheckboxState(
  rows: readonly DimensionConfigurationRow[],
  lineColumnIds: readonly string[],
  documentType?: string | null,
) {
  const result: Record<string, { required: boolean; disabled: boolean }> = {}
  const familyKey = getDimensionTransactionFamilyForDocumentType(documentType)

  for (const columnId of lineColumnIds) {
    if (columnId !== 'department' && columnId !== 'location' && columnId !== 'class') continue
    const applicability = getSeededDimensionApplicability(rows, columnId, 'transaction_line')
    if (!applicability) continue
    const familyAssignment = getSeededDimensionFamilyAssignment(rows, columnId, familyKey)
    const isFamilyLineAllowed = familyKey ? familyAssignment?.allowsLine === true : applicability.isVisible

    result[columnId] = {
      required: isFamilyLineAllowed && applicability.isRequired,
      disabled: !isFamilyLineAllowed || applicability.isRequired || applicability.isLockedInCustomize,
    }
  }

  return result
}
