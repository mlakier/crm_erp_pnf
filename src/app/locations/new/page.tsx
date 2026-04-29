import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { generateNextLocationId } from '@/lib/location-number'
import { prisma } from '@/lib/prisma'
import { LOCATION_FORM_FIELDS, type LocationFormFieldKey } from '@/lib/location-form-customization'
import { loadLocationFormCustomization } from '@/lib/location-form-customization-store'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'

const LOCATION_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the location.',
  Hierarchy: 'Subsidiary context and parent location relationship for rollups.',
  Operations: 'Operational use and inventory availability.',
  Address: 'Physical or operating address.',
}

export default async function NewLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(LOCATION_FORM_FIELDS)
  const [nextLocationId, fieldOptions, formCustomization, formRequirements, duplicateLocation] = await Promise.all([
    generateNextLocationId(),
    loadFieldOptionsMap(fieldMetaById, ['subsidiaryId', 'parentLocationId', 'locationType', 'inactive']),
    loadLocationFormCustomization(),
    loadFormRequirements(),
    duplicateFrom
      ? prisma.location.findUnique({ where: { id: duplicateFrom }, select: { code: true, name: true, subsidiaryId: true, parentLocationId: true, locationType: true, makeInventoryAvailable: true, address: true, inactive: true } })
      : Promise.resolve(null),
  ])

  const initialValues: Partial<Record<LocationFormFieldKey, unknown>> = duplicateLocation
    ? {
        locationId: nextLocationId,
        code: `COPY-${duplicateLocation.code}`.slice(0, 24),
        name: `Copy of ${duplicateLocation.name}`,
        subsidiaryId: duplicateLocation.subsidiaryId,
        parentLocationId: duplicateLocation.parentLocationId,
        locationType: duplicateLocation.locationType,
        makeInventoryAvailable: duplicateLocation.makeInventoryAvailable,
        address: duplicateLocation.address,
        inactive: duplicateLocation.inactive,
      }
    : {
        locationId: nextLocationId,
        makeInventoryAvailable: true,
        inactive: false,
      }

  const fieldDefinitions = buildCreateInlineFieldDefinitions<LocationFormFieldKey, (typeof LOCATION_FORM_FIELDS)[number]>({
    fields: LOCATION_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.locationCreate,
    readOnlyFields: ['locationId'],
    generatedFieldLabels: ['locationId'],
  })

  const sections = buildConfiguredInlineSections({
    fields: LOCATION_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: LOCATION_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="locations"
      backHref="/locations"
      backLabel="<- Back to Locations"
      title="New Location"
      detailsTitle="Location details"
      formId="create-location-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/locations"
      successRedirectBasePath="/locations"
    />
  )
}
