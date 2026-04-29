import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadContactFormCustomization } from '@/lib/contact-form-customization-store'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { CONTACT_FORM_FIELDS, type ContactFormFieldKey } from '@/lib/contact-form-customization'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'

const CONTACT_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the contact record.',
  Contact: 'Communication channels and mailing information.',
  Relationship: 'Customer or vendor ownership and job-context fields.',
  Status: 'Availability and active-state controls.',
}

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string; customerId?: string; vendorId?: string }>
}) {
  const { duplicateFrom, customerId, vendorId } = await searchParams
  const fieldMetaById = buildFieldMetaById(CONTACT_FORM_FIELDS)
  const [adminUser, formCustomization, formRequirements, fieldOptions, duplicateContact] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    loadContactFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, ['customerId', 'vendorId', 'inactive']),
    duplicateFrom
      ? prisma.contact.findUnique({
          where: { id: duplicateFrom },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            position: true,
            customerId: true,
            vendorId: true,
            isPrimaryForCustomer: true,
            receivesQuotesSalesOrders: true,
            receivesInvoices: true,
            receivesInvoiceCc: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!adminUser) {
    return <p className="p-8 text-white">No admin user found.</p>
  }

  const initialValues: Partial<Record<ContactFormFieldKey, unknown>> | undefined = duplicateContact
      ? {
        firstName: duplicateContact.firstName,
        lastName: duplicateContact.lastName,
        email: duplicateContact.email,
        phone: duplicateContact.phone,
        address: duplicateContact.address,
        position: duplicateContact.position,
        customerId: duplicateContact.customerId,
        vendorId: duplicateContact.vendorId,
        isPrimaryForCustomer: duplicateContact.isPrimaryForCustomer,
        receivesQuotesSalesOrders: duplicateContact.receivesQuotesSalesOrders,
        receivesInvoices: duplicateContact.receivesInvoices,
        receivesInvoiceCc: duplicateContact.receivesInvoiceCc,
      }
    : {
        customerId: customerId ?? undefined,
        vendorId: vendorId ?? undefined,
      }

  const fieldDefinitions = buildCreateInlineFieldDefinitions<ContactFormFieldKey, (typeof CONTACT_FORM_FIELDS)[number]>({
    fields: CONTACT_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.contactCreate,
    readOnlyFields: ['contactNumber'],
    generatedFieldLabels: ['contactNumber'],
    typeOverrides: {
      email: 'email',
      isPrimaryForCustomer: 'checkbox',
      receivesQuotesSalesOrders: 'checkbox',
      receivesInvoices: 'checkbox',
      receivesInvoiceCc: 'checkbox',
    },
  })

  const sections = buildConfiguredInlineSections({
    fields: CONTACT_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: CONTACT_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="contacts"
      backHref="/contacts"
      backLabel="<- Back to Contacts"
      title="New Contact"
      detailsTitle="Contact details"
      formId="create-contact-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/contacts"
      successRedirectBasePath="/contacts"
      extraPayload={{ userId: adminUser.id }}
    />
  )
}
