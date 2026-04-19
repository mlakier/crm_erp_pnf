import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import { formatCustomFieldValue } from '@/lib/custom-fields'
import DepartmentDetailCustomizeMode from '@/components/DepartmentDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailField,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadDepartmentFormCustomization } from '@/lib/department-form-customization-store'
import { DEPARTMENT_FORM_FIELDS, type DepartmentFormFieldKey } from '@/lib/department-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function DepartmentDetailPage({
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

  const [department, managers, subsidiaries, customFields, customFieldValues, formCustomization, formRequirements] = await Promise.all([
    prisma.department.findUnique({
      where: { id },
      include: {
        entity: true,
        employees: { orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], select: { id: true, firstName: true, lastName: true, employeeId: true, title: true } },
      },
    }),
    prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.customFieldDefinition.findMany({
      where: { entityType: 'department', active: true },
      orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, label: true, type: true, defaultValue: true },
    }),
    prisma.customFieldValue.findMany({
      where: { entityType: 'department', recordId: id },
      select: { fieldId: true, value: true },
    }),
    loadDepartmentFormCustomization(),
    loadFormRequirements(),
  ])

  if (!department) notFound()

  const customFieldValueMap = new Map(customFieldValues.map((entry) => [entry.fieldId, entry.value]))
  const detailHref = `/departments/${department.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Identity and descriptive details for the department.',
    Organization: 'Organizational ownership and reporting relationships.',
    Status: 'Availability and active-state controls for the department.',
  }

  const fieldDefinitions: Record<DepartmentFormFieldKey, InlineRecordSection['fields'][number]> = {
    departmentId: { name: 'departmentId', label: 'Department Id', value: department.departmentId, helpText: 'Unique department code used across the company.' },
    name: { name: 'name', label: 'Name', value: department.name, helpText: 'Display name of the department.' },
    description: { name: 'description', label: 'Description', value: department.description ?? '', helpText: 'Longer explanation of the department purpose or scope.' },
    division: { name: 'division', label: 'Division', value: department.division ?? '', helpText: 'Higher-level grouping for management reporting or organizational structure.', sourceText: 'Division custom list or free text' },
    entityId: {
      name: 'entityId',
      label: 'Subsidiary',
      value: department.entityId ?? '',
      type: 'select',
      placeholder: 'Select subsidiary',
      options: subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` })),
      helpText: 'Legal entity or subsidiary associated with the department.',
      sourceText: 'Subsidiaries master data',
    },
    managerId: {
      name: 'managerId',
      label: 'Manager',
      value: department.managerId ?? '',
      type: 'select',
      placeholder: 'Select manager',
      options: managers.map((manager) => ({ value: manager.id, label: `${manager.firstName} ${manager.lastName}${manager.employeeId ? ` (${manager.employeeId})` : ''}` })),
      helpText: 'Employee responsible for leading the department.',
      sourceText: 'Employees master data',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: String(!department.active),
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Marks the department unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = DEPARTMENT_FORM_FIELDS.map((field) => {
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
      const configuredFields = DEPARTMENT_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/departments'}
      backLabel={isCustomizing ? '<- Back to Department Detail' : '<- Back to Departments'}
      meta={department.departmentId}
      title={department.name}
      badge={
        <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
          {department.active ? 'Active' : 'Inactive'}
        </span>
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
          {!isCustomizing ? <DeleteButton resource="departments" id={department.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <DepartmentDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.departmentCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="departments"
            id={department.id}
            title="Department details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        {customFields.length > 0 ? (
          <RecordDetailSection title="Custom fields" count={customFields.length}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {customFields.map((field) => (
                <RecordDetailField key={field.id} label={field.label}>
                    {formatCustomFieldValue(field.type as 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox', customFieldValueMap.get(field.id) ?? field.defaultValue) ?? '-'}
                </RecordDetailField>
              ))}
            </dl>
          </RecordDetailSection>
        ) : null}

        <RecordDetailSection title="Employees" count={department.employees.length}>
          {department.employees.length === 0 ? (
            <p className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No employees in this department</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Employee Id</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Title</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {department.employees.map((employee) => (
                  <tr key={employee.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/employees/${employee.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {employee.employeeId ?? 'Pending'}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{employee.firstName} {employee.lastName}</RecordDetailCell>
                    <RecordDetailCell>{employee.title ?? '-'}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
