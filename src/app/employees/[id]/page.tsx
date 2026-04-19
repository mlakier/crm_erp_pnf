import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import EmployeeDetailCustomizeMode from '@/components/EmployeeDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadEmployeeFormCustomization } from '@/lib/employee-form-customization-store'
import { EMPLOYEE_FORM_FIELDS, type EmployeeFormFieldKey } from '@/lib/employee-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function EmployeeDetailPage({
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

  const [employee, subsidiaries, departments, managers, allUsers, linkedUsers, formCustomization, formRequirements] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        entity: true,
        departmentRef: true,
        user: { select: { id: true, userId: true, name: true, email: true } },
        manager: { select: { id: true, firstName: true, lastName: true, title: true, employeeId: true } },
        directReports: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          select: { id: true, firstName: true, lastName: true, title: true, email: true, employeeId: true },
        },
      },
    }),
    prisma.entity.findMany({
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.department.findMany({
      orderBy: [{ departmentId: 'asc' }, { name: 'asc' }],
      select: { id: true, departmentId: true, name: true },
    }),
    prisma.employee.findMany({
      where: { id: { not: id } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.user.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, userId: true, name: true, email: true },
    }),
    prisma.employee.findMany({
      where: { id: { not: id }, userId: { not: null } },
      select: { userId: true },
    }),
    loadEmployeeFormCustomization(),
    loadFormRequirements(),
  ])

  if (!employee) notFound()

  const linkedUserIdSet = new Set(linkedUsers.map((entry) => entry.userId).filter((value): value is string => Boolean(value)))
  const users = allUsers.filter((user) => user.id === employee.userId || !linkedUserIdSet.has(user.id))

  const detailHref = `/employees/${employee.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Identity and primary contact details for the employee.',
    Organization: 'Reporting structure and organizational placement.',
    Access: 'User account linkage and access context.',
    Employment: 'Dates and employment lifecycle details.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<EmployeeFormFieldKey, InlineRecordSection['fields'][number]> = {
    employeeId: {
      name: 'employeeId',
      label: 'Employee ID',
      value: employee.employeeId ?? '',
      helpText: 'Unique employee number or code.',
    },
    firstName: {
      name: 'firstName',
      label: 'First Name',
      value: employee.firstName,
      helpText: 'Given name of the employee.',
    },
    lastName: {
      name: 'lastName',
      label: 'Last Name',
      value: employee.lastName,
      helpText: 'Family name of the employee.',
    },
    email: {
      name: 'email',
      label: 'Email',
      value: employee.email ?? '',
      type: 'email',
      helpText: 'Primary work email address.',
    },
    phone: {
      name: 'phone',
      label: 'Phone',
      value: employee.phone ?? '',
      helpText: 'Primary work phone number.',
    },
    title: {
      name: 'title',
      label: 'Title',
      value: employee.title ?? '',
      helpText: 'Job title or role label.',
    },
    departmentId: {
      name: 'departmentId',
      label: 'Department',
      value: employee.departmentId ?? '',
      type: 'select',
      placeholder: 'Select department',
      options: departments.map((department) => ({
        value: department.id,
        label: `${department.departmentId} - ${department.name}`,
      })),
      helpText: 'Department the employee belongs to.',
      sourceText: 'Departments master data',
    },
    entityId: {
      name: 'entityId',
      label: 'Subsidiary',
      value: employee.entityId ?? '',
      type: 'select',
      placeholder: 'Select subsidiary',
      options: subsidiaries.map((subsidiary) => ({
        value: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      })),
      helpText: 'Legal entity or subsidiary the employee belongs to.',
      sourceText: 'Subsidiaries master data',
    },
    managerId: {
      name: 'managerId',
      label: 'Manager',
      value: employee.managerId ?? '',
      type: 'select',
      placeholder: 'Select manager',
      options: managers.map((manager) => ({
        value: manager.id,
        label: `${manager.firstName} ${manager.lastName}${manager.employeeId ? ` (${manager.employeeId})` : ''}`,
      })),
      helpText: 'Direct manager of the employee.',
      sourceText: 'Employees master data',
    },
    userId: {
      name: 'userId',
      label: 'Linked User',
      value: employee.userId ?? '',
      type: 'select',
      placeholder: 'Select user',
      options: users.map((user) => ({
        value: user.id,
        label: `${user.name ?? user.email}${user.userId ? ` (${user.userId})` : ''}`,
      })),
      helpText: 'User account linked to this employee.',
      sourceText: 'Users master data',
    },
    hireDate: {
      name: 'hireDate',
      label: 'Hire Date',
      value: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      type: 'date',
      helpText: 'Date the employee joined the company.',
    },
    terminationDate: {
      name: 'terminationDate',
      label: 'Termination Date',
      value: employee.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : '',
      type: 'date',
      helpText: 'Date the employee left the company, if applicable.',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: String(!employee.active),
      type: 'select',
      options: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ],
      helpText: 'Marks the employee unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = EMPLOYEE_FORM_FIELDS.map((field) => {
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
      const configuredFields = EMPLOYEE_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/employees'}
      backLabel={isCustomizing ? '<- Back to Employee Detail' : '<- Back to Employees'}
      meta={employee.employeeId ?? 'No Employee ID'}
      title={`${employee.firstName} ${employee.lastName}`}
      badge={
        employee.title ? (
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            {employee.title}
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
            <Link
              href={`${detailHref}?edit=1`}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              Edit
            </Link>
          ) : null}
          {!isCustomizing ? <DeleteButton resource="employees" id={employee.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <EmployeeDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.employeeCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="employees"
            id={employee.id}
            title="Employee details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Direct Reports" count={employee.directReports.length}>
          {employee.directReports.length === 0 ? (
            <RecordDetailEmptyState message="No direct reports" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Employee ID</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Title</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Email</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {employee.directReports.map((report) => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/employees/${report.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {report.employeeId ?? 'Pending'}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{report.firstName} {report.lastName}</RecordDetailCell>
                    <RecordDetailCell>{report.title ?? '-'}</RecordDetailCell>
                    <RecordDetailCell>{report.email ?? '-'}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <RecordDetailSection title="Linked User" count={employee.user ? 1 : 0}>
          {employee.user ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>User ID</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Email</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <RecordDetailCell><Link href={`/users/${employee.user.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{employee.user.userId ?? 'Pending'}</Link></RecordDetailCell>
                  <RecordDetailCell>{employee.user.name ?? '-'}</RecordDetailCell>
                  <RecordDetailCell>{employee.user.email}</RecordDetailCell>
                </tr>
              </tbody>
            </table>
          ) : (
            <RecordDetailEmptyState message="No linked user" />
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
