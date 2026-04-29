import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import RoleDetailCustomizeMode from '@/components/RoleDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadRoleFormCustomization } from '@/lib/role-form-customization-store'
import { ROLE_FORM_FIELDS, type RoleFormFieldKey } from '@/lib/role-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

export default async function RoleDetailPage({
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
  const fieldMetaById = buildFieldMetaById(ROLE_FORM_FIELDS)

  const [role, fieldOptions, formCustomization, formRequirements] = await Promise.all([
    prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          orderBy: { name: 'asc' },
          select: { id: true, userId: true, name: true, email: true, inactive: true },
        },
      },
    }),
    loadFieldOptionsMap(fieldMetaById, ['inactive']),
    loadRoleFormCustomization(),
    loadFormRequirements(),
  ])
  const inactiveOptions = fieldOptions.inactive ?? []

  if (!role) notFound()

  const activeUsers = role.users.filter((user) => !user.inactive)
  const inactiveUsers = role.users.filter((user) => user.inactive)
  const detailHref = `/roles/${role.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the role record.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<RoleFormFieldKey, InlineRecordSection['fields'][number]> = {
    roleId: {
      name: 'roleId',
      label: 'Role ID',
      value: role.roleId,
      helpText: 'System-generated role identifier.',
    },
    name: {
      name: 'name',
      label: 'Name',
      value: role.name,
      helpText: 'Role name shown to admins and users.',
    },
    description: {
      name: 'description',
      label: 'Description',
      value: role.description ?? '',
      helpText: 'Short explanation of the role purpose.',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: role.active ? 'false' : 'true',
      type: 'select',
      options: inactiveOptions,
      helpText: 'Marks the role unavailable for new assignments while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
    },
  }

  const customizeFields = buildCustomizePreviewFields(ROLE_FORM_FIELDS, fieldDefinitions)
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    accent?: true | 'teal' | 'yellow'
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'users', label: 'Users', value: role.users.length, cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'activeUsers', label: 'Active Users', value: activeUsers.length, accent: 'teal', cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'inactiveUsers', label: 'Inactive Users', value: inactiveUsers.length, accent: 'yellow', cardTone: 'yellow', valueTone: 'yellow', supportsColorized: true, supportsLink: false },
    { id: 'status', label: 'Status', value: role.active ? 'Active' : 'Inactive', cardTone: role.active ? 'green' : 'red', valueTone: role.active ? 'green' : 'red', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof role>> = [
    { id: 'users', label: 'Users', getValue: () => role.users.length, getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'activeUsers', label: 'Active Users', getValue: () => activeUsers.length, accent: 'teal', getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'inactiveUsers', label: 'Inactive Users', getValue: () => inactiveUsers.length, accent: 'yellow', getCardTone: () => 'yellow', getValueTone: () => 'yellow' },
    { id: 'status', label: 'Status', getValue: () => (role.active ? 'Active' : 'Inactive'), getCardTone: () => (role.active ? 'green' : 'red'), getValueTone: () => (role.active ? 'green' : 'red') },
  ]
  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: ROLE_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'role',
    entityId: role.id,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'role', entityId: role.id })
  const relatedRecordsTabs = [
    {
      key: 'users',
      label: 'Users',
      count: role.users.length,
      emptyMessage: 'No users are assigned to this role yet.',
      rows: role.users.map((user) => ({
        id: user.id,
        type: user.inactive ? 'Inactive User' : 'User',
        reference: user.userId ?? 'Pending',
        name: user.name ?? '-',
        details: user.email,
        href: `/users/${user.id}`,
      })),
    },
  ]
  const communicationsToolbarTargetId = 'role-communications-toolbar'
  const systemNotesToolbarTargetId = 'role-system-notes-toolbar'

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/roles'}
      backLabel={isCustomizing ? '<- Back to Role Detail' : '<- Back to Roles'}
      meta={role.roleId}
      title={role.name}
      badge={
        !role.active ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-xs font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: 'var(--danger)' }}>
            Inactive
          </span>
        ) : null
      }
      actions={
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${role.id}`}
            newHref="/roles/new"
            duplicateHref={`/roles/new?duplicateFrom=${role.id}`}
            exportTitle={role.name}
            exportFileName={`role-${role.roleId}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="roles"
            deleteId={role.id}
          />
        )
      }
    >
        {!isCustomizing ? (
          <div className="mb-8">
            <TransactionStatsRow
              record={role}
              stats={statDefinitions}
              visibleStatCards={formCustomization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
            />
          </div>
        ) : null}

        {isCustomizing ? (
          <RoleDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.roleCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
            statPreviewCards={statPreviewCards}
          />
        ) : (
          <MasterDataHeaderDetails
            resource="roles"
            id={role.id}
            title="Role Details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
            systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, role.id)}
          />
        )}

        {!isCustomizing ? (
          <>
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
