import { prisma } from '@/lib/prisma'
import RecordCreateWithContactsPageClient from '@/components/RecordCreateWithContactsPageClient'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadVendorFormCustomization } from '@/lib/vendor-form-customization-store'
import { VENDOR_FORM_FIELDS, type VendorFormFieldKey } from '@/lib/vendor-form-customization'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { createDraftContactInput, type DraftContactInput } from '@/components/DraftContactsSection'

const VENDOR_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the vendor record.',
  Contact: 'Contact channels and mailing address.',
  Financial: 'Default tax, subsidiary, and currency settings.',
  Status: 'Availability and active-state controls.',
}

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(VENDOR_FORM_FIELDS)
  const [adminUser, formCustomization, formRequirements, fieldOptions, duplicateVendor] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    loadVendorFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, ['primarySubsidiaryId', 'primaryCurrencyId', 'inactive']),
    duplicateFrom
      ? prisma.vendor.findUnique({
          where: { id: duplicateFrom },
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            taxId: true,
            subsidiaryId: true,
            currencyId: true,
            contacts: {
              orderBy: { createdAt: 'asc' },
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                position: true,
                receivesQuotesSalesOrders: true,
                receivesInvoices: true,
                receivesInvoiceCc: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ])

  if (!adminUser) {
    return <p className="p-8 text-white">No admin user found.</p>
  }

  const initialValues: Partial<Record<VendorFormFieldKey, unknown>> | undefined = duplicateVendor
    ? {
        name: `Copy of ${duplicateVendor.name}`,
        email: duplicateVendor.email,
        phone: duplicateVendor.phone,
        address: duplicateVendor.address,
        taxId: duplicateVendor.taxId,
        primarySubsidiaryId: duplicateVendor.subsidiaryId,
        primaryCurrencyId: duplicateVendor.currencyId,
      }
    : undefined

  const initialContacts: DraftContactInput[] =
    duplicateVendor?.contacts.length
      ? duplicateVendor.contacts.map((contact, index) => ({
          id: `duplicate-contact-${index}`,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          position: contact.position ?? '',
          isPrimaryForCustomer: false,
          receivesQuotesSalesOrders: contact.receivesQuotesSalesOrders,
          receivesInvoices: contact.receivesInvoices,
          receivesInvoiceCc: contact.receivesInvoiceCc,
        }))
      : [createDraftContactInput(false)]

  const fieldDefinitions = buildCreateInlineFieldDefinitions<VendorFormFieldKey, (typeof VENDOR_FORM_FIELDS)[number]>({
    fields: VENDOR_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.vendorCreate,
    readOnlyFields: ['vendorNumber'],
    generatedFieldLabels: ['vendorNumber'],
    typeOverrides: {
      email: 'email',
    },
  })

  const sections = buildConfiguredInlineSections({
    fields: VENDOR_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: VENDOR_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateWithContactsPageClient
      resource="vendors"
      backHref="/vendors"
      backLabel="<- Back to Vendors"
      title="New Vendor"
      detailsTitle="Vendor details"
      formId="create-vendor-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/vendors"
      successRedirectBasePath="/vendors"
      extraPayload={{ userId: adminUser.id }}
      contactMode="vendor"
      initialContacts={initialContacts}
    />
  )
}
