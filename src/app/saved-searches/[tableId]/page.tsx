import { getServerSession } from 'next-auth/next'
import SavedSearchEditorClient from '@/components/SavedSearchEditorClient'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildUsersSavedSearchMetadata } from '@/lib/users-saved-search-metadata'
import { loadSavedSearchBuiltInBaseline } from '@/lib/saved-search-builtins-store'

export default async function SavedSearchEditorPage({
  params,
}: {
  params: Promise<{ tableId: string }>
}) {
  const { tableId } = await params
  const session = await getServerSession(authOptions)
  const [roles, departments, subsidiaries, employees, approverUsers] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({ orderBy: [{ departmentId: 'asc' }, { name: 'asc' }], select: { id: true, departmentId: true, name: true } }),
    prisma.subsidiary.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true, userId: true },
    }),
    prisma.user.findMany({ orderBy: [{ userId: 'asc' }, { name: 'asc' }], select: { id: true, userId: true, name: true, email: true } }),
  ])

  const initialMetadata = tableId === 'users-list'
    ? buildUsersSavedSearchMetadata({
        roles,
        departments,
        subsidiaries,
        approverUsers,
        employees,
      })
    : null
  const builtInBaseline = await loadSavedSearchBuiltInBaseline(tableId)
  const canEditBuiltIn = (session?.user?.role ?? '').toLowerCase().includes('admin')

  return (
    <SavedSearchEditorClient
      tableId={tableId}
      initialMetadata={initialMetadata}
      builtInBaseline={builtInBaseline}
      canEditBuiltIn={canEditBuiltIn}
      roles={roles.map((role) => ({
        id: role.id,
        label: role.name,
      }))}
      departments={departments.map((department) => ({
        id: department.id,
        label: `${department.departmentId} - ${department.name}`,
      }))}
      subsidiaries={subsidiaries.map((subsidiary) => ({
        id: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      }))}
      employees={employees.map((employee) => ({
        id: employee.id,
        label: `${employee.employeeId ?? 'Pending'} - ${employee.firstName} ${employee.lastName}`.trim(),
      }))}
    />
  )
}
