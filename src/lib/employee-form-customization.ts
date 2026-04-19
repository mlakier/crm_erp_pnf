export type EmployeeFormFieldKey =
  | 'employeeId'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'title'
  | 'departmentId'
  | 'entityId'
  | 'managerId'
  | 'userId'
  | 'hireDate'
  | 'terminationDate'
  | 'inactive'

export type EmployeeFormFieldMeta = {
  id: EmployeeFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type EmployeeFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type EmployeeFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<EmployeeFormFieldKey, EmployeeFormFieldCustomization>
}

export const EMPLOYEE_FORM_FIELDS: EmployeeFormFieldMeta[] = [
  { id: 'employeeId', label: 'Employee ID', fieldType: 'text', description: 'Unique employee number or code.' },
  { id: 'firstName', label: 'First Name', fieldType: 'text', description: 'Given name of the employee.' },
  { id: 'lastName', label: 'Last Name', fieldType: 'text', description: 'Family name of the employee.' },
  { id: 'email', label: 'Email', fieldType: 'text', description: 'Primary work email address.' },
  { id: 'phone', label: 'Phone', fieldType: 'text', description: 'Primary work phone number.' },
  { id: 'title', label: 'Title', fieldType: 'text', description: 'Job title or role label.' },
  { id: 'departmentId', label: 'Department', fieldType: 'list', source: 'Departments master data', description: 'Department the employee belongs to.' },
  { id: 'entityId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Legal entity or subsidiary the employee belongs to.' },
  { id: 'managerId', label: 'Manager', fieldType: 'list', source: 'Employees master data', description: 'Direct manager of the employee.' },
  { id: 'userId', label: 'Linked User', fieldType: 'list', source: 'Users master data', description: 'User account linked to this employee.' },
  { id: 'hireDate', label: 'Hire Date', fieldType: 'date', description: 'Date the employee joined the company.' },
  { id: 'terminationDate', label: 'Termination Date', fieldType: 'date', description: 'Date the employee left the company, if applicable.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'boolean', description: 'Marks the employee unavailable for new activity while preserving history.' },
]

export const DEFAULT_EMPLOYEE_FORM_SECTIONS = [
  'Core',
  'Organization',
  'Access',
  'Employment',
  'Status',
] as const

export function defaultEmployeeFormCustomization(): EmployeeFormCustomizationConfig {
  const sectionMap: Record<EmployeeFormFieldKey, string> = {
    employeeId: 'Core',
    firstName: 'Core',
    lastName: 'Core',
    email: 'Core',
    phone: 'Core',
    title: 'Organization',
    departmentId: 'Organization',
    entityId: 'Organization',
    managerId: 'Organization',
    userId: 'Access',
    hireDate: 'Employment',
    terminationDate: 'Employment',
    inactive: 'Status',
  }

  const columnMap: Record<EmployeeFormFieldKey, number> = {
    employeeId: 1,
    firstName: 1,
    lastName: 2,
    email: 1,
    phone: 2,
    title: 1,
    departmentId: 2,
    entityId: 1,
    managerId: 2,
    userId: 1,
    hireDate: 1,
    terminationDate: 2,
    inactive: 1,
  }

  const rowMap: Record<EmployeeFormFieldKey, number> = {
    employeeId: 0,
    firstName: 1,
    lastName: 1,
    email: 2,
    phone: 2,
    title: 0,
    departmentId: 0,
    entityId: 1,
    managerId: 1,
    userId: 0,
    hireDate: 0,
    terminationDate: 0,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_EMPLOYEE_FORM_SECTIONS],
    sectionRows: {
      Core: 3,
      Organization: 2,
      Access: 1,
      Employment: 1,
      Status: 1,
    },
    fields: Object.fromEntries(
      EMPLOYEE_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<EmployeeFormFieldKey, EmployeeFormFieldCustomization>,
  }
}
