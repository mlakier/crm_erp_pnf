import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type RoleFormFieldKey =
  | 'roleId'
  | 'name'
  | 'description'
  | 'inactive'

export type RoleFormFieldMeta = {
  id: RoleFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type RoleFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type RoleFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<RoleFormFieldKey, RoleFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<RoleStatCardMetric>>
}

export type RoleStatCardMetric =
  | 'users'
  | 'activeUsers'
  | 'inactiveUsers'
  | 'status'

export const ROLE_STAT_CARDS: Array<{ id: RoleStatCardMetric; label: string }> = [
  { id: 'users', label: 'Users' },
  { id: 'activeUsers', label: 'Active Users' },
  { id: 'inactiveUsers', label: 'Inactive Users' },
  { id: 'status', label: 'Status' },
]

export const ROLE_FORM_FIELDS: RoleFormFieldMeta[] = [
  { id: 'roleId', label: 'Role ID', fieldType: 'text', description: 'System-generated role identifier.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Role name shown to admins and users.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Short explanation of the role purpose.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', sourceType: 'system', sourceKey: 'activeInactive', source: getListSourceText({ sourceType: 'system', sourceKey: 'activeInactive' }), description: 'Marks the role unavailable for new assignments while preserving history.' },
]

export const DEFAULT_ROLE_FORM_SECTIONS = [
  'Core',
  'Status',
] as const

export function defaultRoleFormCustomization(): RoleFormCustomizationConfig {
  const sectionMap: Record<RoleFormFieldKey, string> = {
    roleId: 'Core',
    name: 'Core',
    description: 'Core',
    inactive: 'Status',
  }

  const columnMap: Record<RoleFormFieldKey, number> = {
    roleId: 1,
    name: 2,
    description: 1,
    inactive: 1,
  }

  const rowMap: Record<RoleFormFieldKey, number> = {
    roleId: 0,
    name: 0,
    description: 1,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_ROLE_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Status: 1,
    },
    fields: Object.fromEntries(
      ROLE_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<RoleFormFieldKey, RoleFormFieldCustomization>,
    statCards: ROLE_STAT_CARDS.map((card, index) => ({
      id: `role-stat-${card.id}`,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: true,
    })),
  }
}
