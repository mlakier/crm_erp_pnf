import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import EmployeeDetailCustomizeMode from '@/components/EmployeeDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadEmployeeFormCustomization } from '@/lib/employee-form-customization-store'
import { EMPLOYEE_FORM_FIELDS, type EmployeeFormFieldKey } from '@/lib/employee-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

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

  const fieldMetaById = buildFieldMetaById(EMPLOYEE_FORM_FIELDS)

  const [employee, fieldOptions, allUsers, linkedUsers, formCustomization, formRequirements] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        subsidiary: true,
        employeeSubsidiaries: {
          include: { subsidiary: true },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
        departmentRef: true,
        user: { select: { id: true, userId: true, name: true, email: true } },
        manager: { select: { id: true, firstName: true, lastName: true, title: true, employeeId: true } },
        directReports: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          select: { id: true, firstName: true, lastName: true, title: true, email: true, employeeId: true },
        },
      },
    }),
    loadFieldOptionsMap(fieldMetaById, ['subsidiaryIds', 'departmentId', 'managerId', 'laborType', 'inactive']),
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
  const employeeStatus = employee.active ? 'Active' : 'Inactive'

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
    eid: {
      name: 'eid',
      label: 'EID',
      value: employee.eid ?? '',
      helpText: 'External or enterprise employee identifier.',
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
    laborType: {
      name: 'laborType',
      label: 'Labor Type',
      value: employee.laborType ?? '',
      type: 'select',
      placeholder: 'Select labor type',
      options: fieldOptions.laborType ?? [],
      helpText: 'Labor classification used for staffing, costing, or billing.',
      sourceText: getFieldSourceText(fieldMetaById, 'laborType'),
    },
    departmentId: {
      name: 'departmentId',
      label: 'Department',
      value: employee.departmentId ?? '',
      type: 'select',
      placeholder: 'Select department',
      options: fieldOptions.departmentId ?? [],
      helpText: 'Department the employee belongs to.',
      sourceText: getFieldSourceText(fieldMetaById, 'departmentId'),
    },
    subsidiaryIds: {
      name: 'subsidiaryIds',
      label: 'Subsidiaries',
      value: employee.employeeSubsidiaries.map((assignment) => assignment.subsidiaryId).join(','),
      type: 'select',
      multiple: true,
      placeholder: 'Select subsidiaries',
      options: fieldOptions.subsidiaryIds ?? [],
      helpText: 'Subsidiaries where the employee is available.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryIds'),
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: String(employee.includeChildren),
      type: 'checkbox',
      placeholder: 'Include Children',
      helpText: 'If enabled, child subsidiaries under selected subsidiaries also inherit employee availability.',
    },
    managerId: {
      name: 'managerId',
      label: 'Manager',
      value: employee.managerId ?? '',
      type: 'select',
      placeholder: 'Select manager',
      options: fieldOptions.managerId ?? [],
      helpText: 'Direct manager of the employee.',
      sourceText: getFieldSourceText(fieldMetaById, 'managerId'),
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
      sourceText: getFieldSourceText(fieldMetaById, 'userId'),
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
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the employee unavailable for new activity while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
    },
  }

  const customizeFields = buildCustomizePreviewFields(EMPLOYEE_FORM_FIELDS, fieldDefinitions)
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    href?: string | null
    accent?: true | 'teal' | 'yellow'
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'directReports', label: 'Direct Reports', value: employee.directReports.length, cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'subsidiaries', label: 'Subsidiaries', value: employee.employeeSubsidiaries.length, accent: 'teal', cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'linkedUser', label: 'Linked User', value: employee.user ? (employee.user.name ?? employee.user.userId ?? 'Linked') : 'Not Linked', href: employee.user ? `/users/${employee.user.id}` : null, accent: 'yellow', cardTone: employee.user ? 'yellow' : 'default', valueTone: employee.user ? 'yellow' : 'default', supportsColorized: true, supportsLink: true },
    { id: 'status', label: 'Status', value: employeeStatus, cardTone: employee.active ? 'green' : 'red', valueTone: employee.active ? 'green' : 'red', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof employee>> = [
    { id: 'directReports', label: 'Direct Reports', getValue: () => employee.directReports.length, getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'subsidiaries', label: 'Subsidiaries', getValue: () => employee.employeeSubsidiaries.length, accent: 'teal', getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'linkedUser', label: 'Linked User', getValue: () => (employee.user ? (employee.user.name ?? employee.user.userId ?? 'Linked') : 'Not Linked'), getHref: () => (employee.user ? `/users/${employee.user.id}` : null), accent: 'yellow', getCardTone: () => (employee.user ? 'yellow' : 'default'), getValueTone: () => (employee.user ? 'yellow' : 'default') },
    { id: 'status', label: 'Status', getValue: () => employeeStatus, getCardTone: () => (employee.active ? 'green' : 'red'), getValueTone: () => (employee.active ? 'green' : 'red') },
  ]
  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: EMPLOYEE_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'employee',
    entityId: employee.id,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'employee', entityId: employee.id })
  const relatedRecordsTabs = [
    {
      key: 'direct-reports',
      label: 'Direct Reports',
      count: employee.directReports.length,
      emptyMessage: 'No direct reports are linked to this employee yet.',
      rows: employee.directReports.map((report) => ({
        id: report.id,
        type: 'Employee',
        reference: report.employeeId ?? 'Pending',
        name: `${report.firstName} ${report.lastName}`.trim(),
        details: [report.title, report.email].filter(Boolean).join(' | ') || '-',
        href: `/employees/${report.id}`,
      })),
    },
    {
      key: 'linked-records',
      label: 'Linked Records',
      count: [employee.user, employee.manager, ...employee.employeeSubsidiaries].filter(Boolean).length,
      emptyMessage: 'No linked records are set for this employee yet.',
      rows: [
        ...(employee.user
          ? [{
              id: employee.user.id,
              type: 'User',
              reference: employee.user.userId ?? 'Pending',
              name: employee.user.name ?? employee.user.email,
              details: employee.user.email,
              href: `/users/${employee.user.id}`,
            }]
          : []),
        ...(employee.manager
          ? [{
              id: employee.manager.id,
              type: 'Employee',
              reference: employee.manager.employeeId ?? 'Pending',
              name: `${employee.manager.firstName} ${employee.manager.lastName}`.trim(),
              details: `Manager${employee.manager.title ? ` | ${employee.manager.title}` : ''}`,
              href: `/employees/${employee.manager.id}`,
            }]
          : []),
        ...employee.employeeSubsidiaries.map((assignment) => ({
          id: assignment.subsidiary.id,
          type: 'Subsidiary',
          reference: assignment.subsidiary.subsidiaryId,
          name: assignment.subsidiary.name,
          details: 'Employee Availability',
          href: `/subsidiaries/${assignment.subsidiary.id}`,
        })),
      ],
    },
  ]
  const communicationsToolbarTargetId = 'employee-communications-toolbar'
  const systemNotesToolbarTargetId = 'employee-system-notes-toolbar'

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
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${employee.id}`}
            newHref="/employees/new"
            duplicateHref={`/employees/new?duplicateFrom=${employee.id}`}
            exportTitle={`${employee.firstName} ${employee.lastName}`}
            exportFileName={`employee-${employee.employeeId ?? employee.id}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="employees"
            deleteId={employee.id}
          />
        )
      }
    >
        {!isCustomizing ? (
          <div className="mb-8">
            <TransactionStatsRow
              record={employee}
              stats={statDefinitions}
              visibleStatCards={formCustomization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
            />
          </div>
        ) : null}

        {isCustomizing ? (
          <EmployeeDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.employeeCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
            statPreviewCards={statPreviewCards}
          />
        ) : (
          <MasterDataHeaderDetails
            resource="employees"
            id={employee.id}
            title="Employee Details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
            systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, employee.id)}
          />
        )}

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
