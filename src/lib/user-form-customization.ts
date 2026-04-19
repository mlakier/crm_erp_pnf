export type UserFormFieldKey =
  | 'userId'
  | 'name'
  | 'email'
  | 'roleId'
  | 'departmentId'
  | 'employeeId'
  | 'inactive'

export type UserFormFieldMeta = {
  id: UserFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type UserFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type UserFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<UserFormFieldKey, UserFormFieldCustomization>
}

export const USER_FORM_FIELDS: UserFormFieldMeta[] = [
  { id: 'userId', label: 'User ID', fieldType: 'text', description: 'System-generated user identifier.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Display name for the user account.' },
  { id: 'email', label: 'Email', fieldType: 'text', description: 'Login email address for the user.' },
  { id: 'roleId', label: 'Role', fieldType: 'list', source: 'Roles master data', description: 'Primary system role assigned to the user.' },
  { id: 'departmentId', label: 'Department', fieldType: 'list', source: 'Departments master data', description: 'Department context used for workflow and reporting.' },
  { id: 'employeeId', label: 'Linked Employee', fieldType: 'list', source: 'Employees master data', description: 'Employee record linked to this user account.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'boolean', description: 'Disables the user account while preserving history.' },
]

export const DEFAULT_USER_FORM_SECTIONS = [
  'Core',
  'Access',
  'Linkage',
  'Status',
] as const

export function defaultUserFormCustomization(): UserFormCustomizationConfig {
  const sectionMap: Record<UserFormFieldKey, string> = {
    userId: 'Core',
    name: 'Core',
    email: 'Core',
    roleId: 'Access',
    departmentId: 'Access',
    employeeId: 'Linkage',
    inactive: 'Status',
  }

  const columnMap: Record<UserFormFieldKey, number> = {
    userId: 1,
    name: 1,
    email: 2,
    roleId: 1,
    departmentId: 2,
    employeeId: 1,
    inactive: 1,
  }

  const rowMap: Record<UserFormFieldKey, number> = {
    userId: 0,
    name: 1,
    email: 1,
    roleId: 0,
    departmentId: 0,
    employeeId: 0,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_USER_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Access: 1,
      Linkage: 1,
      Status: 1,
    },
    fields: Object.fromEntries(
      USER_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<UserFormFieldKey, UserFormFieldCustomization>,
  }
}
