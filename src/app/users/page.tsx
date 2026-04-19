import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import PaginationFooter from '@/components/PaginationFooter'
import CreateModalButton from '@/components/CreateModalButton'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import UserCreateForm from '@/components/UserCreateForm'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadUserFormCustomization } from '@/lib/user-form-customization-store'
import { userListDefinition } from '@/lib/master-data-list-definitions'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? {
        OR: [
          { userId: { contains: query, mode: 'insensitive' as const } },
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
          { role: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  const total = await prisma.user.count({ where })
  const pagination = getPagination(total, params.page)

  const [users, companyLogoPages, roles, departments, employees, formCustomization] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { department: { select: { departmentId: true, name: true } }, role: { select: { name: true } } },
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    loadCompanyPageLogo(),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: [{ departmentId: 'asc' }, { name: 'asc' }] }),
    prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true, userId: true },
    }),
    loadUserFormCustomization(),
  ])

  const employeeByUserId = new Map(
    employees.filter((employee) => employee.userId).map((employee) => [employee.userId as string, employee])
  )

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    if (sort) s.set('sort', sort)
    s.set('page', String(p))
    return `/users?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Users"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New User" title="New User">
            <UserCreateForm
              roles={roles}
              departments={departments}
              employees={employees.filter((employee) => !employee.userId)}
            />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={userListDefinition.searchPlaceholder}
        tableId={userListDefinition.tableId}
        exportFileName={userListDefinition.exportFileName}
        columns={userListDefinition.columns}
        sort={sort}
        sortOptions={userListDefinition.sortOptions}
      >
        <table className="min-w-full" id={userListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="id">User ID</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="email">Email</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="role">Role</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="department">Department</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="employee">Linked Employee</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={10}>No users found</MasterDataEmptyStateRow>
            ) : (
              users.map((user, index) => {
                const linkedEmployee = employeeByUserId.get(user.id)
                return (
                  <tr key={user.id} style={getMasterDataRowStyle(index, users.length)}>
                    <MasterDataBodyCell columnId="id">
                      <Link href={`/users/${user.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {user.userId ?? 'Pending'}
                      </Link>
                    </MasterDataBodyCell>
                    <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm font-medium text-white">{user.name ?? '-'}</MasterDataBodyCell>
                    <MasterDataMutedCell columnId="email">{user.email || '-'}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="role">{user.role?.name ?? '-'}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="department">{user.department ? `${user.department.departmentId} - ${user.department.name}` : '-'}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="employee">{linkedEmployee ? `${linkedEmployee.firstName} ${linkedEmployee.lastName}${linkedEmployee.employeeId ? ` (${linkedEmployee.employeeId})` : ''}` : '-'}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="inactive">{user.inactive ? 'Yes' : 'No'}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="created">{formatMasterDataDate(user.createdAt)}</MasterDataMutedCell>
                    <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(user.updatedAt)}</MasterDataMutedCell>
                    <MasterDataBodyCell columnId="actions">
                      <div className="flex items-center gap-2">
                        <EditButton
                          resource="users"
                          id={user.id}
                          fields={[
                            ...(formCustomization.fields.name.visible ? [{ name: 'name', label: 'Name', value: user.name ?? '' }] : []),
                            ...(formCustomization.fields.email.visible ? [{ name: 'email', label: 'Email', value: user.email, type: 'email' as const }] : []),
                            ...(formCustomization.fields.roleId.visible
                              ? [{
                                  name: 'roleId',
                                  label: 'Role',
                                  value: user.roleId ?? '',
                                  type: 'select' as const,
                                  placeholder: 'Select role',
                                  options: roles.map((r) => ({ value: r.id, label: r.name })),
                                }]
                              : []),
                            ...(formCustomization.fields.departmentId.visible
                              ? [{
                                  name: 'departmentId',
                                  label: 'Department',
                                  value: user.departmentId ?? '',
                                  type: 'select' as const,
                                  placeholder: 'Select department',
                                  options: departments.map((d) => ({ value: d.id, label: `${d.departmentId} - ${d.name}` })),
                                }]
                              : []),
                            ...(formCustomization.fields.employeeId.visible
                              ? [{
                                  name: 'employeeId',
                                  label: 'Linked Employee',
                                  value: linkedEmployee?.id ?? '',
                                  type: 'select' as const,
                                  placeholder: 'Select employee',
                                  options: employees
                                    .filter((employee) => !employee.userId || employee.userId === user.id)
                                    .map((employee) => ({
                                      value: employee.id,
                                      label: `${employee.firstName} ${employee.lastName}${employee.employeeId ? ` (${employee.employeeId})` : ''}`,
                                    })),
                                }]
                              : []),
                            ...(formCustomization.fields.inactive.visible
                              ? [{ name: 'inactive', label: 'Inactive', value: user.inactive ? 'true' : 'false', type: 'select' as const, options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] }]
                              : []),
                          ]}
                        />
                        <DeleteButton resource="users" id={user.id} />
                      </div>
                    </MasterDataBodyCell>
                  </tr>
                )
              })
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
