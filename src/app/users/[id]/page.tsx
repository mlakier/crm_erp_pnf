import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import UserDetailCustomizeMode from '@/components/UserDetailCustomizeMode'
import UserSecurityActions from '@/components/UserSecurityActions'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import {
  RecordDetailField,
  RecordDetailStatCard,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadUserFormCustomization } from '@/lib/user-form-customization-store'
import { USER_FORM_FIELDS, type UserFormFieldKey } from '@/lib/user-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import { fmtCurrency } from '@/lib/format'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

function formatDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : ''
}

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

  const fieldMetaById = buildFieldMetaById(USER_FORM_FIELDS)

  const [user, fieldOptions, linkedEmployee, formCustomization, formRequirements] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
        defaultSubsidiary: true,
        approvalCurrency: true,
        delegatedApprover: true,
        subsidiaryAssignments: {
          include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
      },
    }),
    loadFieldOptionsMap(fieldMetaById as never, ['roleId', 'departmentId', 'defaultSubsidiaryId', 'subsidiaryIds', 'approvalCurrencyId', 'delegatedApproverUserId', 'employeeId', 'inactive']),
    prisma.employee.findFirst({
      where: { userId: id },
      include: {
        subsidiary: true,
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
    'Subsidiary Access': 'Default subsidiary and multi-subsidiary access scope.',
    Approval: 'Approval limit and temporary approver delegation.',
    Linkage: 'Link between this user account and an employee record.',
    Security: 'Account lockout and credential state.',
    Status: 'Availability and account-state controls.',
  }
  const subsidiaryIds = user.subsidiaryAssignments.map((assignment) => assignment.subsidiaryId)

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
      options: fieldOptions.roleId ?? [],
      helpText: 'Primary system role assigned to the user.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'roleId'),
    },
    departmentId: {
      name: 'departmentId',
      label: 'Department',
      value: user.departmentId ?? '',
      type: 'select',
      options: fieldOptions.departmentId ?? [],
      helpText: 'Department context used for workflow and reporting.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'departmentId'),
    },
    defaultSubsidiaryId: {
      name: 'defaultSubsidiaryId',
      label: 'Default Subsidiary',
      value: user.defaultSubsidiaryId ?? '',
      type: 'select',
      options: fieldOptions.defaultSubsidiaryId ?? [],
      helpText: 'Default subsidiary context for new user activity.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'defaultSubsidiaryId'),
    },
    subsidiaryIds: {
      name: 'subsidiaryIds',
      label: 'Subsidiaries',
      value: subsidiaryIds.join(','),
      type: 'select',
      multiple: true,
      options: fieldOptions.subsidiaryIds ?? [],
      placeholder: 'Select subsidiaries',
      helpText: 'Subsidiaries this user can access.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'subsidiaryIds'),
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: user.includeChildren ? 'true' : 'false',
      type: 'checkbox',
      placeholder: 'Include Children',
      helpText: 'If enabled, child subsidiaries under selected subsidiaries are included in access scope.',
    },
    approvalLimit: {
      name: 'approvalLimit',
      label: 'Approval Limit',
      value: user.approvalLimit === null || user.approvalLimit === undefined ? '' : String(user.approvalLimit),
      type: 'number',
      helpText: 'Maximum approval amount for routed workflows.',
    },
    approvalCurrencyId: {
      name: 'approvalCurrencyId',
      label: 'Approval Currency',
      value: user.approvalCurrencyId ?? '',
      type: 'select',
      options: fieldOptions.approvalCurrencyId ?? [],
      helpText: 'Currency used for the approval limit.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'approvalCurrencyId'),
    },
    delegatedApproverUserId: {
      name: 'delegatedApproverUserId',
      label: 'Delegated Approver',
      value: user.delegatedApproverUserId ?? '',
      type: 'select',
      options: (fieldOptions.delegatedApproverUserId ?? []).filter((option) => option.value !== user.id),
      helpText: 'User who can approve on this user’s behalf during delegation.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'delegatedApproverUserId'),
    },
    delegationStartDate: {
      name: 'delegationStartDate',
      label: 'Delegation Start Date',
      value: formatDateInput(user.delegationStartDate),
      type: 'date',
      helpText: 'Date delegation starts.',
    },
    delegationEndDate: {
      name: 'delegationEndDate',
      label: 'Delegation End Date',
      value: formatDateInput(user.delegationEndDate),
      type: 'date',
      helpText: 'Date delegation ends.',
    },
    employeeId: {
      name: 'employeeId',
      label: 'Linked Employee',
      value: linkedEmployee?.id ?? '',
      type: 'select',
      options: fieldOptions.employeeId ?? [],
      helpText: 'Employee record linked to this user account.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'employeeId'),
    },
    locked: {
      name: 'locked',
      label: 'Locked',
      value: user.locked ? 'true' : 'false',
      type: 'checkbox',
      placeholder: 'Locked',
      helpText: 'Prevents account access until unlocked.',
    },
    mustChangePassword: {
      name: 'mustChangePassword',
      label: 'Must Change Password',
      value: user.mustChangePassword ? 'true' : 'false',
      type: 'checkbox',
      placeholder: 'Must Change Password',
      helpText: 'Requires password change at next login.',
    },
    failedLoginAttempts: {
      name: 'failedLoginAttempts',
      label: 'Failed Login Attempts',
      value: String(user.failedLoginAttempts),
      type: 'number',
      helpText: 'Count of failed login attempts.',
    },
    lastLoginAt: {
      name: 'lastLoginAt',
      label: 'Last Login',
      value: formatDateInput(user.lastLoginAt),
      type: 'date',
      helpText: 'Most recent successful login date.',
    },
    passwordChangedAt: {
      name: 'passwordChangedAt',
      label: 'Password Changed',
      value: formatDateInput(user.passwordChangedAt),
      type: 'date',
      helpText: 'Most recent password change date.',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: user.inactive ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Disables the user account while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById as never, 'inactive'),
    },
  }

  const customizeFields = buildCustomizePreviewFields(USER_FORM_FIELDS, fieldDefinitions)
  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: USER_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
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
    {
      id: 'role',
      label: 'Role',
      value: user.role?.name ?? '-',
      href: user.roleId ? `/roles/${user.roleId}` : null,
      accent: true,
      cardTone: 'accent',
      valueTone: 'accent',
      supportsColorized: true,
      supportsLink: true,
    },
    {
      id: 'department',
      label: 'Department',
      value: user.department ? `${user.department.departmentId} - ${user.department.name}` : '-',
      href: user.departmentId ? `/departments/${user.departmentId}` : null,
      accent: 'teal' as const,
      cardTone: 'teal',
      valueTone: 'teal',
      supportsColorized: true,
      supportsLink: true,
    },
    {
      id: 'status',
      label: 'Status',
      value: user.inactive ? 'Inactive' : user.locked ? 'Locked' : 'Active',
      cardTone: user.inactive ? 'red' : user.locked ? 'yellow' : 'green',
      valueTone: user.inactive ? 'red' : user.locked ? 'yellow' : 'green',
      supportsColorized: true,
      supportsLink: false,
    },
    {
      id: 'defaultSubsidiary',
      label: 'Default Subsidiary',
      value: user.defaultSubsidiary ? `${user.defaultSubsidiary.subsidiaryId} - ${user.defaultSubsidiary.name}` : '-',
      href: user.defaultSubsidiaryId ? `/subsidiaries/${user.defaultSubsidiaryId}` : null,
      accent: 'yellow' as const,
      cardTone: 'yellow',
      valueTone: 'yellow',
      supportsColorized: true,
      supportsLink: true,
    },
    {
      id: 'approvalLimit',
      label: 'Approval Limit',
      value:
        user.approvalLimit == null
          ? '-'
          : fmtCurrency(
              Number(user.approvalLimit),
              user.approvalCurrency?.code ?? user.approvalCurrency?.currencyId ?? undefined,
            ),
      supportsColorized: false,
      supportsLink: false,
    },
    {
      id: 'lastLogin',
      label: 'Last Login',
      value: user.lastLoginAt ? formatDateInput(user.lastLoginAt) : 'Never',
      supportsColorized: false,
      supportsLink: false,
    },
  ]
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'user',
    entityId: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'user', entityId: user.id })
  const relatedRecordsTabs = [
    {
      key: 'linked-records',
      label: 'Linked Records',
      count:
        (linkedEmployee ? 1 : 0) +
        (user.role ? 1 : 0) +
        (user.department ? 1 : 0) +
        (user.defaultSubsidiary ? 1 : 0) +
        (user.delegatedApprover ? 1 : 0),
      emptyMessage: 'No linked records are available for this user.',
      rows: [
        linkedEmployee
          ? {
              id: `employee-${linkedEmployee.id}`,
              type: 'Employee',
              reference: linkedEmployee.employeeId ?? linkedEmployee.id,
              name: `${linkedEmployee.firstName} ${linkedEmployee.lastName}`.trim(),
              details: [
                linkedEmployee.departmentRef
                  ? `${linkedEmployee.departmentRef.departmentId} - ${linkedEmployee.departmentRef.name}`
                  : null,
                linkedEmployee.subsidiary
                  ? `${linkedEmployee.subsidiary.subsidiaryId} - ${linkedEmployee.subsidiary.name}`
                  : null,
              ]
                .filter(Boolean)
                .join(' | ') || '-',
              href: `/employees/${linkedEmployee.id}`,
            }
          : null,
        user.role
          ? {
              id: `role-${user.role.id}`,
              type: 'Role',
              reference: user.role.roleId,
              name: user.role.name,
              details: user.role.description ?? '-',
              href: `/roles/${user.role.id}`,
            }
          : null,
        user.department
          ? {
              id: `department-${user.department.id}`,
              type: 'Department',
              reference: user.department.departmentId,
              name: user.department.name,
              details: user.department.description ?? '-',
              href: `/departments/${user.department.id}`,
            }
          : null,
        user.defaultSubsidiary
          ? {
              id: `subsidiary-${user.defaultSubsidiary.id}`,
              type: 'Default Subsidiary',
              reference: user.defaultSubsidiary.subsidiaryId,
              name: user.defaultSubsidiary.name,
              details: user.defaultSubsidiary.country ?? user.defaultSubsidiary.entityType ?? '-',
              href: `/subsidiaries/${user.defaultSubsidiary.id}`,
            }
          : null,
        user.delegatedApprover
          ? {
              id: `delegated-approver-${user.delegatedApprover.id}`,
              type: 'Delegated Approver',
              reference: user.delegatedApprover.userId ?? user.delegatedApprover.id,
              name: user.delegatedApprover.name ?? user.delegatedApprover.email,
              details: user.delegatedApprover.email,
              href: `/users/${user.delegatedApprover.id}`,
            }
          : null,
      ].filter((row): row is { id: string; type: string; reference: string; name: string; details: string; href: string } => Boolean(row)),
    },
    {
      key: 'subsidiary-access',
      label: 'Subsidiary Access',
      count: user.subsidiaryAssignments.length,
      emptyMessage: 'No subsidiary access assignments are linked to this user yet.',
      rows: user.subsidiaryAssignments.map((assignment) => ({
        id: assignment.subsidiary.id,
        type: 'Subsidiary',
        reference: assignment.subsidiary.subsidiaryId,
        name: assignment.subsidiary.name,
        details: user.includeChildren ? 'Includes child subsidiaries' : '-',
        href: `/subsidiaries/${assignment.subsidiary.id}`,
      })),
    },
  ]
  const communicationsToolbarTargetId = 'user-communications-toolbar'
  const systemNotesToolbarTargetId = 'user-system-notes-toolbar'

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
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${user.id}`}
            newHref="/users/new"
            duplicateHref={`/users/new?duplicateFrom=${user.id}`}
            exportTitle={user.name ?? user.email}
            exportFileName={`user-${user.userId ?? user.id}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="users"
            deleteId={user.id}
          />
        )
      }
    >
        {isCustomizing ? (
          <UserDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.userCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
            statPreviewCards={statPreviewCards}
          />
        ) : (
          <div className="space-y-6">
            {formCustomization.statCards && formCustomization.statCards.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-4">
                {formCustomization.statCards
                  .filter((card) => card.visible)
                  .sort((left, right) => left.order - right.order)
                  .map((card) => {
                    const preview = statPreviewCards.find((entry) => entry.id === card.metric)
                    if (!preview) return null
                    return (
                      <RecordDetailStatCard
                        key={card.id}
                        label={preview.label}
                        value={preview.value}
                        href={card.linked === false ? null : preview.href}
                        accent={card.colorized === false ? undefined : preview.accent}
                        valueTone={card.colorized === false ? 'default' : preview.valueTone}
                        cardTone={card.colorized === false ? 'default' : preview.cardTone}
                        size={card.size ?? 'md'}
                      />
                    )
                  })}
              </div>
            ) : null}
            <MasterDataHeaderDetails
              resource="users"
              id={user.id}
              title="User Details"
              sections={detailSections}
              editing={isEditing}
              columns={formCustomization.formColumns}
              systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, user.id)}
            />
          </div>
        )}

        {!isCustomizing ? (
          <>
            <RecordDetailSection title="Security" count={1}>
              <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
                <RecordDetailField label="Password">
                  <div className="space-y-2">
                    <p style={{ color: 'var(--text-muted)' }}>Not displayed</p>
                    <UserSecurityActions locked={user.locked} />
                  </div>
                </RecordDetailField>
                </div>
              </RecordDetailSection>
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
          </>
        ) : null}
    </RecordDetailPageShell>
  )
}
