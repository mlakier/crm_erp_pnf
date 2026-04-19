import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import EmployeeCreateForm from '@/components/EmployeeCreateForm'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadEmployeeFormCustomization } from '@/lib/employee-form-customization-store'
import { employeeListDefinition } from '@/lib/master-data-list-definitions'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }, { email: { contains: query } }] }
    : {}

  const total = await prisma.employee.count({ where })
  const pagination = getPagination(total, params.page)

  const [employees, entities, departments, managers, users, linkedUsers, companyLogoPages, formCustomization] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        entity: true,
        departmentRef: true,
        user: { select: { id: true, userId: true, name: true, email: true } },
      },
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ lastName: 'asc' as const }, { firstName: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' } }),
    prisma.department.findMany({
      orderBy: [{ departmentId: 'asc' }, { name: 'asc' }],
      select: { id: true, departmentId: true, name: true },
    }),
    prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.user.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, userId: true, name: true, email: true },
    }),
    prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    }),
    loadCompanyPageLogo(),
    loadEmployeeFormCustomization(),
  ])

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    s.set('page', String(p))
    return `/employees?${s.toString()}`
  }

  const linkedUserIdSet = new Set(linkedUsers.map((entry) => entry.userId).filter((value): value is string => Boolean(value)))
  const availableCreateUsers = users.filter((user) => !linkedUserIdSet.has(user.id))

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Employees"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Employee" title="New Employee">
            <EmployeeCreateForm entities={entities} departments={departments} managers={managers} users={availableCreateUsers} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={employeeListDefinition.searchPlaceholder}
        tableId={employeeListDefinition.tableId}
        exportFileName={employeeListDefinition.exportFileName}
        columns={employeeListDefinition.columns}
        sort={sort}
        sortOptions={employeeListDefinition.sortOptions}
      >
        <table className="min-w-full" id={employeeListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="employee-id">Employee Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="email">Email</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="title">Title</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="department">Department</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="linked-user">Linked User</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={10}>No employees found</MasterDataEmptyStateRow>
            ) : (
              employees.map((employee, index) => (
                <tr key={employee.id} style={getMasterDataRowStyle(index, employees.length)}>
                  <MasterDataBodyCell columnId="employee-id" className="px-4 py-2 text-sm font-medium">
                    <Link href={`/employees/${employee.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {employee.employeeId ?? 'Pending'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm font-medium text-white">{employee.firstName} {employee.lastName}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="email">{employee.email ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="title">{employee.title ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="department">{employee.departmentRef?.departmentId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiary">{employee.entity?.subsidiaryId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="linked-user">{employee.user ? `${employee.user.name ?? employee.user.email}${employee.user.userId ? ` (${employee.user.userId})` : ''}` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{employee.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(employee.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(employee.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="employees"
                        id={employee.id}
                        fields={[
                          ...(formCustomization.fields.employeeId.visible ? [{ name: 'employeeId', label: 'Employee ID', value: employee.employeeId ?? '' }] : []),
                          ...(formCustomization.fields.firstName.visible ? [{ name: 'firstName', label: 'First Name', value: employee.firstName }] : []),
                          ...(formCustomization.fields.lastName.visible ? [{ name: 'lastName', label: 'Last Name', value: employee.lastName }] : []),
                          ...(formCustomization.fields.email.visible ? [{ name: 'email', label: 'Email', value: employee.email ?? '', type: 'email' as const }] : []),
                          ...(formCustomization.fields.phone.visible ? [{ name: 'phone', label: 'Phone', value: employee.phone ?? '' }] : []),
                          ...(formCustomization.fields.title.visible ? [{ name: 'title', label: 'Title', value: employee.title ?? '' }] : []),
                          ...(formCustomization.fields.departmentId.visible
                            ? [{
                                name: 'departmentId',
                                label: 'Department',
                                value: employee.departmentId ?? '',
                                type: 'select' as const,
                                placeholder: 'Select department',
                                options: departments.map((department) => ({ value: department.id, label: `${department.departmentId} - ${department.name}` })),
                              }]
                            : []),
                          ...(formCustomization.fields.entityId.visible
                            ? [{
                                name: 'entityId',
                                label: 'Subsidiary',
                                value: employee.entityId ?? '',
                                type: 'select' as const,
                                placeholder: 'Select subsidiary',
                                options: entities.map((entity) => ({ value: entity.id, label: `${entity.subsidiaryId} - ${entity.name}` })),
                              }]
                            : []),
                          ...(formCustomization.fields.managerId.visible
                            ? [{
                                name: 'managerId',
                                label: 'Manager',
                                value: employee.managerId ?? '',
                                type: 'select' as const,
                                placeholder: 'Select manager',
                                options: managers
                                  .filter((manager) => manager.id !== employee.id)
                                  .map((manager) => ({
                                    value: manager.id,
                                    label: `${manager.firstName} ${manager.lastName}${manager.employeeId ? ` (${manager.employeeId})` : ''}`,
                                  })),
                              }]
                            : []),
                          ...(formCustomization.fields.userId.visible
                            ? [{
                                name: 'userId',
                                label: 'Linked User',
                                value: employee.userId ?? '',
                                type: 'select' as const,
                                placeholder: 'Select user',
                                options: [
                                  ...(employee.user
                                    ? [{
                                        value: employee.user.id,
                                        label: `${employee.user.name ?? employee.user.email}${employee.user.userId ? ` (${employee.user.userId})` : ''}`,
                                      }]
                                    : []),
                                  ...users
                                    .filter((user) => user.id === employee.userId || !linkedUserIdSet.has(user.id))
                                    .filter((user) => user.id !== employee.userId)
                                    .map((user) => ({
                                      value: user.id,
                                      label: `${user.name ?? user.email}${user.userId ? ` (${user.userId})` : ''}`,
                                    })),
                                ],
                              }]
                            : []),
                          ...(formCustomization.fields.hireDate.visible
                            ? [{
                                name: 'hireDate',
                                label: 'Hire Date',
                                value: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
                                type: 'date' as const,
                              }]
                            : []),
                          ...(formCustomization.fields.terminationDate.visible
                            ? [{
                                name: 'terminationDate',
                                label: 'Termination Date',
                                value: employee.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : '',
                                type: 'date' as const,
                              }]
                            : []),
                          ...(formCustomization.fields.inactive.visible
                            ? [{
                                name: 'inactive',
                                label: 'Inactive',
                                value: String(!employee.active),
                                type: 'select' as const,
                                options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
                              }]
                            : []),
                        ]}
                      />
                      <DeleteButton resource="employees" id={employee.id} />
                    </div>
                  </MasterDataBodyCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={total}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </MasterDataListSection>
    </div>
  )
}
