import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import { formatCustomFieldValue } from '@/lib/custom-fields'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import DepartmentDetailCustomizeMode from '@/components/DepartmentDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import {
  RecordDetailField,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadDepartmentFormCustomization } from '@/lib/department-form-customization-store'
import { DEPARTMENT_FORM_FIELDS, type DepartmentFormFieldKey } from '@/lib/department-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

function joinSubsidiaryLabels(
  assignments: Array<{ subsidiary: { id: string; subsidiaryId: string; name: string } }>,
  includeChildren: boolean,
) {
  const labels = assignments.map(({ subsidiary }) => `${subsidiary.subsidiaryId} - ${subsidiary.name}`)
  if (labels.length === 0) return ''
  const base = labels.join(', ')
  return includeChildren ? `${base} (+children)` : base
}

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

  const fieldMetaById = buildFieldMetaById(DEPARTMENT_FORM_FIELDS)

  const [department, fieldOptions, customFields, customFieldValues, formCustomization, formRequirements] = await Promise.all([
    prisma.department.findUnique({
      where: { id },
      include: {
        departmentSubsidiaries: {
          include: { subsidiary: true },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
        manager: true,
        approver: true,
        employees: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          select: { id: true, firstName: true, lastName: true, employeeId: true, title: true },
        },
      },
    }),
    loadFieldOptionsMap(fieldMetaById, [
      'division',
      'subsidiaryIds',
      'includeChildren',
      'planningCategory',
      'managerEmployeeId',
      'approverEmployeeId',
      'inactive',
    ]),
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
  const subsidiaryValue = department.departmentSubsidiaries.map(({ subsidiary }) => subsidiary.id).join(',')
  const subsidiaryDisplay = joinSubsidiaryLabels(department.departmentSubsidiaries, department.includeChildren)
  const detailHref = `/departments/${department.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Identity and descriptive details for the department.',
    Organization: 'Organizational ownership and reporting relationships.',
    Status: 'Availability and active-state controls for the department.',
  }

  const fieldDefinitions: Record<DepartmentFormFieldKey, InlineRecordSection['fields'][number]> = {
    departmentId: {
      name: 'departmentId',
      label: 'Department Id',
      value: department.departmentId,
      helpText: 'Unique department code used across the company.',
    },
    departmentNumber: {
      name: 'departmentNumber',
      label: 'Department Number',
      value: department.departmentNumber ?? '',
      helpText: 'Short numeric or business-facing department number used by the company.',
    },
    name: {
      name: 'name',
      label: 'Name',
      value: department.name,
      helpText: 'Display name of the department.',
    },
    description: {
      name: 'description',
      label: 'Description',
      value: department.description ?? '',
      helpText: 'Longer explanation of the department purpose or scope.',
    },
    division: {
      name: 'division',
      label: 'Division',
      value: department.division ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.division ?? [])],
      helpText: 'Higher-level grouping for management reporting or organizational structure.',
      sourceText: getFieldSourceText(fieldMetaById, 'division'),
    },
    subsidiaryIds: {
      name: 'subsidiaryIds',
      label: 'Subsidiaries',
      value: subsidiaryValue,
      type: 'select',
      multiple: true,
      placeholder: 'Select subsidiaries',
      options: fieldOptions.subsidiaryIds ?? [],
      helpText: 'Subsidiaries where the department is available for use.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryIds'),
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: String(department.includeChildren),
      type: 'select',
      options: fieldOptions.includeChildren ?? [],
      helpText: 'Includes child subsidiaries when a parent subsidiary is selected.',
      sourceText: getFieldSourceText(fieldMetaById, 'includeChildren'),
    },
    planningCategory: {
      name: 'planningCategory',
      label: 'Department Planning Category',
      value: department.planningCategory ?? '',
      type: 'select',
      placeholder: 'Select planning category',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.planningCategory ?? [])],
      helpText: 'Planning category used for company-specific department planning and reporting.',
      sourceText: getFieldSourceText(fieldMetaById, 'planningCategory'),
    },
    managerEmployeeId: {
      name: 'managerEmployeeId',
      label: 'Department Manager',
      value: department.managerEmployeeId ?? '',
      type: 'select',
      placeholder: 'Select manager',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.managerEmployeeId ?? [])],
      helpText: 'Employee responsible for leading the department.',
      sourceText: getFieldSourceText(fieldMetaById, 'managerEmployeeId'),
    },
    approverEmployeeId: {
      name: 'approverEmployeeId',
      label: 'Department Approver',
      value: department.approverEmployeeId ?? '',
      type: 'select',
      placeholder: 'Select approver',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.approverEmployeeId ?? [])],
      helpText: 'Employee that approves department transactions or requests.',
      sourceText: getFieldSourceText(fieldMetaById, 'approverEmployeeId'),
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: String(!department.active),
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the department unavailable for new activity while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
    },
  }

  const customizeFields = buildCustomizePreviewFields(DEPARTMENT_FORM_FIELDS, fieldDefinitions)
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'employees', label: 'Employees', value: department.employees.length, cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'subsidiaries', label: 'Subsidiaries', value: department.departmentSubsidiaries.length, cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'customFields', label: 'Custom Fields', value: customFields.length, cardTone: 'yellow', valueTone: 'yellow', supportsColorized: true, supportsLink: false },
    { id: 'status', label: 'Status', value: department.active ? 'Active' : 'Inactive', cardTone: department.active ? 'green' : 'red', valueTone: department.active ? 'green' : 'red', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof department>> = [
    { id: 'employees', label: 'Employees', getValue: () => department.employees.length, getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'subsidiaries', label: 'Subsidiaries', getValue: () => department.departmentSubsidiaries.length, getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'customFields', label: 'Custom Fields', getValue: () => customFields.length, getCardTone: () => 'yellow', getValueTone: () => 'yellow' },
    { id: 'status', label: 'Status', getValue: () => (department.active ? 'Active' : 'Inactive'), getCardTone: () => (department.active ? 'green' : 'red'), getValueTone: () => (department.active ? 'green' : 'red') },
  ]
  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: DEPARTMENT_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'department',
    entityId: department.id,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'department', entityId: department.id })
  const relatedRecordsTabs = [
    {
      key: 'subsidiaries',
      label: 'Subsidiaries',
      count: department.departmentSubsidiaries.length,
      emptyMessage: 'No subsidiaries are linked to this department yet.',
      rows: department.departmentSubsidiaries.map(({ subsidiary }) => ({
        id: subsidiary.id,
        type: 'Subsidiary',
        reference: subsidiary.subsidiaryId,
        name: subsidiary.name,
        details: department.includeChildren ? 'Available (+children)' : 'Available',
        href: `/subsidiaries/${subsidiary.id}`,
      })),
    },
    {
      key: 'leadership',
      label: 'Leadership',
      count: [department.manager, department.approver].filter(Boolean).length,
      emptyMessage: 'No leadership assignments are set for this department yet.',
      rows: [
        ...(department.manager
          ? [{
              id: department.manager.id,
              type: 'Employee',
              reference: department.manager.employeeId ?? 'Pending',
              name: `${department.manager.firstName} ${department.manager.lastName}`.trim(),
              details: 'Department Manager',
              href: `/employees/${department.manager.id}`,
            }]
          : []),
        ...(department.approver
          ? [{
              id: department.approver.id,
              type: 'Employee',
              reference: department.approver.employeeId ?? 'Pending',
              name: `${department.approver.firstName} ${department.approver.lastName}`.trim(),
              details: 'Department Approver',
              href: `/employees/${department.approver.id}`,
            }]
          : []),
      ],
    },
    {
      key: 'employees',
      label: 'Employees',
      count: department.employees.length,
      emptyMessage: 'No employees are assigned to this department yet.',
      rows: department.employees.map((employee) => ({
        id: employee.id,
        type: 'Employee',
        reference: employee.employeeId ?? 'Pending',
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        details: employee.title ?? '-',
        href: `/employees/${employee.id}`,
      })),
    },
  ]
  const communicationsToolbarTargetId = 'department-communications-toolbar'
  const systemNotesToolbarTargetId = 'department-system-notes-toolbar'

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/departments'}
      backLabel={isCustomizing ? '<- Back to Department Detail' : '<- Back to Departments'}
      meta={department.departmentId}
      title={department.name}
      badge={(
        <span
          className="inline-block rounded-full px-3 py-0.5 text-sm"
          style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
        >
          {department.active ? 'Active' : 'Inactive'}
        </span>
      )}
      actions={(
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${department.id}`}
            newHref="/departments/new"
            duplicateHref={`/departments/new?duplicateFrom=${department.id}`}
            exportTitle={department.name}
            exportFileName={`department-${department.departmentId}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="departments"
            deleteId={department.id}
          />
        )
      )}
    >
      {!isCustomizing ? (
        <div className="mb-8">
          <TransactionStatsRow
            record={department}
            stats={statDefinitions}
            visibleStatCards={formCustomization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
          />
        </div>
      ) : null}

      {isCustomizing ? (
        <DepartmentDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={formCustomization}
          initialRequirements={{ ...formRequirements.departmentCreate }}
          fields={customizeFields}
          sectionDescriptions={sectionDescriptions}
          statPreviewCards={statPreviewCards}
        />
      ) : (
        <MasterDataHeaderDetails
          resource="departments"
          id={department.id}
          title="Department Details"
          sections={detailSections}
          editing={isEditing}
          columns={formCustomization.formColumns}
          systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, department.id)}
        />
      )}

      {!isCustomizing ? (
        <RecordDetailSection title="Subsidiary Availability" count={department.departmentSubsidiaries.length}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <RecordDetailField label="Subsidiaries">{subsidiaryDisplay || '-'}</RecordDetailField>
            <RecordDetailField label="Include Children">{department.includeChildren ? 'Yes' : 'No'}</RecordDetailField>
          </dl>
        </RecordDetailSection>
      ) : null}

      {!isCustomizing && customFields.length > 0 ? (
        <RecordDetailSection title="Custom fields" count={customFields.length}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {customFields.map((field) => (
              <RecordDetailField key={field.id} label={field.label}>
                {formatCustomFieldValue(
                  field.type as 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox',
                  customFieldValueMap.get(field.id) ?? field.defaultValue,
                ) ?? '-'}
              </RecordDetailField>
            ))}
          </dl>
        </RecordDetailSection>
      ) : null}

      {!isCustomizing ? (
        <RecordBottomTabsSection
          defaultActiveKey="related-records"
          tabs={[
            {
              key: 'related-records',
              label: 'Related Records',
              count: relatedRecordsTabs.reduce((sum, tab) => sum + tab.count, 0),
              content: <RelatedRecordsSection embedded tabs={relatedRecordsTabs} showDisplayControl={false} />,
            },
            {
              key: 'communications',
              label: 'Communications',
              count: 0,
              toolbarTargetId: communicationsToolbarTargetId,
              toolbarPlacement: 'tab-bar',
              content: (
                <CommunicationsSection
                  embedded
                  toolbarTargetId={communicationsToolbarTargetId}
                  rows={[]}
                  showDisplayControl={false}
                />
              ),
            },
            {
              key: 'system-notes',
              label: 'System Notes',
              count: systemNotes.length,
              toolbarTargetId: systemNotesToolbarTargetId,
              toolbarPlacement: 'tab-bar',
              content: (
                <SystemNotesSection
                  embedded
                  toolbarTargetId={systemNotesToolbarTargetId}
                  notes={systemNotes}
                  showDisplayControl={false}
                />
              ),
            },
          ]}
        />
      ) : null}
    </RecordDetailPageShell>
  )
}
