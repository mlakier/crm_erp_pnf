import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import UserDetailCustomizeMode from '@/components/UserDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailField,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadUserFormCustomization } from '@/lib/user-form-customization-store'
import { USER_FORM_FIELDS, type UserFormFieldKey } from '@/lib/user-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string; customize?: string }>
}) {
  const { id } = await params
  const { edit, customize } = await searchParams
  const isEditing = edit === '1'
  const isCustomizing = customize === '1'

  const [user, roles, departments, employees, linkedEmployee, formCustomization, formRequirements] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
      },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: [{ departmentId: 'asc' }, { name: 'asc' }], select: { id: true, departmentId: true, name: true } }),
    prisma.employee.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: id },
        ],
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.employee.findFirst({
      where: { userId: id },
      include: {
        entity: true,
        departmentRef: true,
      },
    }),
    loadUserFormCustomization(),
    loadFormRequirements(),
  ])

  if (!user) notFound()

  const detailHref = `/users/${user.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the user account.',
    Access: 'Role and organizational access context.',
    Linkage: 'Link between this user account and an employee record.',
    Status: 'Availability and account-state controls.',
  }

  const fieldDefinitions: Record<UserFormFieldKey, InlineRecordSection['fields'][number]> = {
    userId: {
      name: 'userId',
      label: 'User ID',
      value: user.userId ?? '',
      helpText: 'System-generated user identifier.',
    },
    name: {
      name: 'name',
      label: 'Name',
      value: user.name ?? '',
      helpText: 'Display name for the user account.',
    },
    email: {
      name: 'email',
      label: 'Email',
      value: user.email,
      type: 'email',
      helpText: 'Login email address for the user.',
    },
    roleId: {
      name: 'roleId',
      label: 'Role',
      value: user.roleId ?? '',
      type: 'select',
      options: roles.map((role) => ({ value: role.id, label: role.name })),
      helpText: 'Primary system role assigned to the user.',
      sourceText: 'Roles master data',
    },
    departmentId: {
      name: 'departmentId',
      label: 'Department',
      value: user.departmentId ?? '',
      type: 'select',
      options: departments.map((department) => ({ value: department.id, label: `${department.departmentId} - ${department.name}` })),
      helpText: 'Department context used for workflow and reporting.',
      sourceText: 'Departments master data',
    },
    employeeId: {
      name: 'employeeId',
      label: 'Linked Employee',
      value: linkedEmployee?.id ?? '',
      type: 'select',
      options: employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}${employee.employeeId ? ` (${employee.employeeId})` : ''}` })),
      helpText: 'Employee record linked to this user account.',
      sourceText: 'Employees master data',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: user.inactive ? 'true' : 'false',
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Disables the user account while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = USER_FORM_FIELDS.map((field) => {
    const definition = fieldDefinitions[field.id]
    const rawValue = definition.value ?? ''
    const previewValue = definition.options?.find((option) => option.value === rawValue)?.label ?? rawValue
    return {
      id: field.id,
      label: definition.label,
      fieldType: field.fieldType,
      source: field.source,
      description: field.description,
      previewValue,
    }
  })

  const detailSections: InlineRecordSection[] = formCustomization.sections
    .map((sectionTitle) => {
      const configuredFields = USER_FORM_FIELDS
        .filter((field) => {
          const config = formCustomization.fields[field.id]
          return config.visible && config.section === sectionTitle
        })
        .sort((a, b) => {
          const left = formCustomization.fields[a.id]
          const right = formCustomization.fields[b.id]
          if (left.column !== right.column) return left.column - right.column
          return left.order - right.order
        })
        .map((field) => ({
          ...fieldDefinitions[field.id],
          column: formCustomization.fields[field.id].column,
          order: formCustomization.fields[field.id].order,
        }))

      if (configuredFields.length === 0) return null
      return {
        title: sectionTitle,
        description: sectionDescriptions[sectionTitle],
        collapsible: true,
        defaultExpanded: true,
        fields: configuredFields,
      }
    })
    .filter((section): section is InlineRecordSection => Boolean(section))

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/users'}
      backLabel={isCustomizing ? '<- Back to User Detail' : '<- Back to Users'}
      meta={user.userId ?? 'Pending'}
      title={user.name ?? user.email}
      badge={
        user.role?.name ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
            {user.role.name}
          </span>
        ) : null
      }
      actions={
        <>
          {!isEditing && !isCustomizing ? (
            <Link href={`${detailHref}?customize=1`} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              Customize
            </Link>
          ) : null}
          {!isEditing ? (
            <Link href={`${detailHref}?edit=1`} className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              Edit
            </Link>
          ) : null}
          {!isCustomizing ? <DeleteButton resource="users" id={user.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <UserDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.userCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="users"
            id={user.id}
            title="User details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Linked Employee" count={linkedEmployee ? 1 : 0}>
          {linkedEmployee ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <RecordDetailField label="Employee">
                <Link href={`/employees/${linkedEmployee.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                  {linkedEmployee.firstName} {linkedEmployee.lastName}
                </Link>
              </RecordDetailField>
              <RecordDetailField label="Employee ID">{linkedEmployee.employeeId ?? '-'}</RecordDetailField>
              <RecordDetailField label="Department">{linkedEmployee.departmentRef ? `${linkedEmployee.departmentRef.departmentId} - ${linkedEmployee.departmentRef.name}` : '-'}</RecordDetailField>
              <RecordDetailField label="Subsidiary">{linkedEmployee.entity ? `${linkedEmployee.entity.subsidiaryId} - ${linkedEmployee.entity.name}` : '-'}</RecordDetailField>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No employee linked to this user.</p>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
