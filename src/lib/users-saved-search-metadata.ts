import { userListDefinition } from '@/lib/master-data-list-definitions'
import type { SavedSearchFieldOption, SavedSearchFilterDefinition, SavedSearchTableMetadata } from '@/lib/saved-search-metadata'

export const USER_SAVED_SEARCH_FILTERS: SavedSearchFilterDefinition[] = [
  {
    id: 'keyword',
    label: 'Keyword Search',
    param: 'q',
    type: 'text',
    placeholder: 'Search user #, name, email, role, or subsidiary',
    helpText: 'Uses the existing list-page search box without changing the page layout.',
  },
  {
    id: 'sort',
    label: 'Sort Order',
    param: 'sort',
    type: 'select',
    options: [
      { value: 'newest', label: 'Newest' },
      { value: 'oldest', label: 'Oldest' },
      { value: 'id', label: 'Id' },
      { value: 'name', label: 'Name A-Z' },
    ],
    helpText: 'Maps to the current sort behavior on the Users list page.',
  },
]

export function buildUserSavedSearchFields({
  roles,
  departments,
  subsidiaries,
  approverUsers,
  employees,
}: {
  roles: { id: string; name: string }[]
  departments: { id: string; departmentId: string; departmentNumber?: string | null; name: string }[]
  subsidiaries: { id: string; subsidiaryId: string; name: string }[]
  approverUsers: { id: string; userId: string | null; name: string | null; email: string }[]
  employees: { id: string; firstName: string; lastName: string; employeeId: string | null; userId: string | null }[]
}): SavedSearchFieldOption[] {
  return [
    { id: 'id', label: 'User ID', source: 'User', group: 'Base Record', defaultVisible: true, locked: true },
    { id: 'name', label: 'Name', source: 'User', group: 'Base Record', defaultVisible: true, locked: true },
    { id: 'email', label: 'Email', source: 'User', group: 'Base Record', defaultVisible: true },
    { id: 'role', label: 'Role', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select role', options: roles.map((role) => ({ value: role.id, label: role.name })), defaultVisible: true },
    { id: 'department', label: 'Department', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select department', options: departments.map((department) => ({ value: department.id, label: `${department.departmentNumber ?? department.departmentId} - ${department.name}` })), defaultVisible: true },
    { id: 'default-subsidiary', label: 'Default Subsidiary', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select subsidiary', options: subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` })), defaultVisible: true },
    { id: 'subsidiaries', label: 'Subsidiaries', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select subsidiary', options: subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` })), defaultVisible: true },
    { id: 'include-children', label: 'Include Children', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select option', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], defaultVisible: true },
    { id: 'approval-limit', label: 'Approval Limit', source: 'User', group: 'Base Record' },
    { id: 'delegated-approver', label: 'Delegated Approver', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select user', options: approverUsers.map((user) => ({ value: user.id, label: `${user.userId ? `${user.userId} - ` : ''}${user.name ?? user.email}` })) },
    { id: 'locked', label: 'Locked', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select option', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
    { id: 'employee', label: 'Linked Employee', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select employee', options: employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}${employee.employeeId ? ` (${employee.employeeId})` : ''}` })), defaultVisible: true },
    { id: 'inactive', label: 'Inactive', source: 'User', group: 'Base Record', type: 'select', placeholder: 'Select option', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], defaultVisible: true },
    { id: 'created', label: 'Created', source: 'User', group: 'Base Record' },
    { id: 'last-modified', label: 'Last Modified', source: 'User', group: 'Base Record' },
    { id: 'role.name', label: 'Role Name', source: 'Role', group: 'Joined Records' },
    { id: 'department.name', label: 'Department Name', source: 'Department', group: 'Joined Records' },
    { id: 'department.departmentId', label: 'Department ID', source: 'Department', group: 'Joined Records' },
    { id: 'defaultSubsidiary.subsidiaryId', label: 'Default Subsidiary ID', source: 'Subsidiary', group: 'Joined Records' },
    { id: 'approvalCurrency.code', label: 'Approval Currency Code', source: 'Currency', group: 'Joined Records' },
    { id: 'delegatedApprover.name', label: 'Delegated Approver Name', source: 'User', group: 'Joined Records' },
    { id: 'delegatedApprover.email', label: 'Delegated Approver Email', source: 'User', group: 'Joined Records' },
    { id: 'linkedEmployee.employeeId', label: 'Linked Employee ID', source: 'Employee', group: 'Joined Records' },
    { id: 'linkedEmployee.lastName', label: 'Linked Employee Last Name', source: 'Employee', group: 'Joined Records' },
  ]
}

export function buildUsersSavedSearchMetadata(args: Parameters<typeof buildUserSavedSearchFields>[0]): SavedSearchTableMetadata {
  const fields = buildUserSavedSearchFields(args)
  return {
    tableId: userListDefinition.tableId,
    title: 'Users',
    basePath: '/users',
    columns: userListDefinition.columns,
    filters: USER_SAVED_SEARCH_FILTERS,
    criteriaFields: fields,
    resultFields: fields,
  }
}
