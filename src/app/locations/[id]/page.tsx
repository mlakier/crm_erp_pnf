import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import LocationDetailCustomizeMode from '@/components/LocationDetailCustomizeMode'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { LOCATION_FORM_FIELDS, type LocationFormFieldKey } from '@/lib/location-form-customization'
import { loadLocationFormCustomization } from '@/lib/location-form-customization-store'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

function boolValue(value: boolean) {
  return value ? 'true' : 'false'
}

export default async function LocationDetailPage({
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
  const fieldMetaById = buildFieldMetaById(LOCATION_FORM_FIELDS)

  const [location, allLocations, fieldOptions, layout, formRequirements] = await Promise.all([
    prisma.location.findUnique({
      where: { id },
      include: {
        parentLocation: true,
        subsidiary: true,
        childLocations: { orderBy: { locationId: 'asc' } },
        employees: { orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], select: { id: true, employeeId: true, firstName: true, lastName: true } },
        items: { orderBy: [{ itemId: 'asc' }, { name: 'asc' }], select: { id: true, itemId: true, name: true } },
        invoiceLineItems: { take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, description: true } },
        billLineItems: { take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, description: true } },
        journalEntryLineItems: { take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, description: true, debit: true, credit: true } },
      },
    }),
    prisma.location.findMany({ orderBy: { locationId: 'asc' }, select: { id: true, locationId: true, code: true, name: true } }),
    loadFieldOptionsMap(fieldMetaById as never, ['subsidiaryId', 'parentLocationId', 'locationType', 'inactive']),
    loadLocationFormCustomization(),
    loadFormRequirements(),
  ])

  if (!location) notFound()
  const locationRecord = location as typeof location & {
    childLocations: Array<{ id: string; locationId: string; name: string }>
    subsidiary: { id: string; subsidiaryId: string; name: string } | null
    employees: Array<{ id: string; employeeId: string | null; firstName: string; lastName: string }>
    items: Array<{ id: string; itemId: string | null; name: string }>
    invoiceLineItems: Array<{ id: string; description: string | null }>
    billLineItems: Array<{ id: string; description: string | null }>
    journalEntryLineItems: Array<{ id: string; description: string | null; debit: number; credit: number }>
  }

  const detailHref = `/locations/${location.id}`
  const parentOptions = allLocations
    .filter((entry) => entry.id !== location.id)
    .map((entry) => ({ value: entry.id, label: `${entry.locationId} - ${entry.code} - ${entry.name}` }))
  const inactiveOptions = fieldOptions.inactive ?? [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the location.',
    Hierarchy: 'Subsidiary context and parent location relationship for rollups.',
    Operations: 'Operational use and inventory availability.',
    Address: 'Physical or operating address.',
  }

  const fieldDefinitions: Record<LocationFormFieldKey, InlineRecordSection['fields'][number]> = {
    locationId: { name: 'locationId', label: 'Location Id', value: location.locationId, helpText: 'System-generated location master record identifier.' },
    code: { name: 'code', label: 'Code', value: location.code, helpText: 'Short operating code for the location.' },
    name: { name: 'name', label: 'Name', value: location.name, helpText: 'Display name for the location.' },
    subsidiaryId: { name: 'subsidiaryId', label: 'Subsidiary', value: location.subsidiaryId ?? '', type: 'select', options: fieldOptions.subsidiaryId ?? [], placeholder: 'None', helpText: 'Subsidiary context for this location.', sourceText: getFieldSourceText(fieldMetaById as never, 'subsidiaryId') },
    parentLocationId: { name: 'parentLocationId', label: 'Parent Location', value: location.parentLocationId ?? '', type: 'select', options: parentOptions, placeholder: 'None', helpText: 'Optional parent location.', sourceText: getFieldSourceText(fieldMetaById as never, 'parentLocationId') },
    locationType: { name: 'locationType', label: 'Location Type', value: location.locationType ?? '', type: 'select', options: fieldOptions.locationType ?? [], placeholder: 'None', helpText: 'Operational classification.', sourceText: getFieldSourceText(fieldMetaById as never, 'locationType') },
    makeInventoryAvailable: { name: 'makeInventoryAvailable', label: 'Make Inventory Available', value: boolValue(location.makeInventoryAvailable), type: 'checkbox', placeholder: 'Make Inventory Available', helpText: 'Controls whether inventory is available for transactions.' },
    address: { name: 'address', label: 'Address', value: location.address ?? '', type: 'address', helpText: 'Physical or operating address.' },
    inactive: { name: 'inactive', label: 'Inactive', value: boolValue(location.inactive), type: 'select', options: inactiveOptions, helpText: 'Marks the location unavailable for new records.', sourceText: getFieldSourceText(fieldMetaById as never, 'inactive') },
  }

  const detailSections = buildConfiguredInlineSections({
    fields: LOCATION_FORM_FIELDS,
    layout,
    fieldDefinitions,
    sectionDescriptions,
  })
  const customizeFields = buildCustomizePreviewFields(LOCATION_FORM_FIELDS, fieldDefinitions)
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'childLocations', label: 'Child Locations', value: locationRecord.childLocations.length, cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'employees', label: 'Employees', value: locationRecord.employees.length, cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'items', label: 'Items', value: locationRecord.items.length, cardTone: 'yellow', valueTone: 'yellow', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof locationRecord>> = [
    { id: 'childLocations', label: 'Child Locations', getValue: () => locationRecord.childLocations.length, getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'employees', label: 'Employees', getValue: () => locationRecord.employees.length, getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'items', label: 'Items', getValue: () => locationRecord.items.length, getCardTone: () => 'yellow', getValueTone: () => 'yellow' },
  ]
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'location',
    entityId: location.id,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'location', entityId: location.id })
  const relatedRecordsTabs = [
    {
      key: 'child-locations',
      label: 'Child Locations',
      count: locationRecord.childLocations.length,
      emptyMessage: 'No child locations are linked to this location yet.',
      rows: locationRecord.childLocations.map((child) => ({
        id: child.id,
        type: 'Location',
        reference: child.locationId,
        name: child.name,
        details: 'Child Location',
        href: `/locations/${child.id}`,
      })),
    },
    {
      key: 'employees',
      label: 'Employees',
      count: locationRecord.employees.length,
      emptyMessage: 'No employees are assigned to this location yet.',
      rows: locationRecord.employees.map((employee) => ({
        id: employee.id,
        type: 'Employee',
        reference: employee.employeeId ?? 'Pending',
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        details: '-',
        href: `/employees/${employee.id}`,
      })),
    },
    {
      key: 'items',
      label: 'Items',
      count: locationRecord.items.length,
      emptyMessage: 'No items are assigned to this location yet.',
      rows: locationRecord.items.map((item) => ({
        id: item.id,
        type: 'Item',
        reference: item.itemId ?? 'Pending',
        name: item.name,
        details: '-',
        href: `/items/${item.id}`,
      })),
    },
  ]
  const communicationsToolbarTargetId = 'location-communications-toolbar'
  const systemNotesToolbarTargetId = 'location-system-notes-toolbar'

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/locations'}
      backLabel={isCustomizing ? '<- Back to Location Detail' : '<- Back to Locations'}
      meta={location.locationId}
      title={location.name}
      badge={<span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>{location.code}</span>}
      actions={
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${location.id}`}
            newHref="/locations/new"
            duplicateHref={`/locations/new?duplicateFrom=${location.id}`}
            exportTitle={location.name}
            exportFileName={`location-${location.locationId}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="locations"
            deleteId={location.id}
          />
        )
      }
    >
      {!isCustomizing ? (
        <div className="mb-8">
          <TransactionStatsRow
            record={locationRecord}
            stats={statDefinitions}
            visibleStatCards={layout.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
          />
        </div>
      ) : null}

      {isCustomizing ? (
        <LocationDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={layout}
          initialRequirements={{ ...formRequirements.locationCreate }}
          fields={customizeFields}
          sectionDescriptions={sectionDescriptions}
          statPreviewCards={statPreviewCards}
        />
      ) : (
        <MasterDataHeaderDetails
          resource="locations"
          id={location.id}
          title="Location Details"
          sections={detailSections}
          editing={isEditing}
          columns={layout.formColumns}
          systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, location.id)}
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
