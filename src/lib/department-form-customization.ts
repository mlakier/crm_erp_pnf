export type DepartmentFormFieldKey =
  | 'departmentId'
  | 'name'
  | 'description'
  | 'division'
  | 'entityId'
  | 'managerId'
  | 'inactive'

export type DepartmentFormFieldMeta = {
  id: DepartmentFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type DepartmentFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type DepartmentFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<DepartmentFormFieldKey, DepartmentFormFieldCustomization>
}

export const DEPARTMENT_FORM_FIELDS: DepartmentFormFieldMeta[] = [
  { id: 'departmentId', label: 'Department ID', fieldType: 'text', description: 'Unique department code used across the company.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Display name of the department.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Longer explanation of the department purpose or scope.' },
  { id: 'division', label: 'Division', fieldType: 'list', source: 'Division custom list or free text', description: 'Higher-level grouping for management reporting or organizational structure.' },
  { id: 'entityId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Legal entity or subsidiary associated with the department.' },
  { id: 'managerId', label: 'Manager', fieldType: 'list', source: 'Employees master data', description: 'Employee responsible for leading the department.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'boolean', description: 'Marks the department unavailable for new activity while preserving history.' },
]

export const DEFAULT_DEPARTMENT_FORM_SECTIONS = [
  'Core',
  'Organization',
  'Status',
] as const

export function defaultDepartmentFormCustomization(): DepartmentFormCustomizationConfig {
  const sectionMap: Record<DepartmentFormFieldKey, string> = {
    departmentId: 'Core',
    name: 'Core',
    description: 'Core',
    division: 'Organization',
    entityId: 'Organization',
    managerId: 'Organization',
    inactive: 'Status',
  }

  const columnMap: Record<DepartmentFormFieldKey, number> = {
    departmentId: 1,
    name: 2,
    description: 1,
    division: 1,
    entityId: 2,
    managerId: 1,
    inactive: 1,
  }

  const rowMap: Record<DepartmentFormFieldKey, number> = {
    departmentId: 0,
    name: 0,
    description: 1,
    division: 0,
    entityId: 0,
    managerId: 1,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_DEPARTMENT_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Organization: 2,
      Status: 1,
    },
    fields: Object.fromEntries(
      DEPARTMENT_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<DepartmentFormFieldKey, DepartmentFormFieldCustomization>,
  }
}
