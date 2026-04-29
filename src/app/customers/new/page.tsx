import { prisma } from '@/lib/prisma'
import RecordCreateWithContactsPageClient from '@/components/RecordCreateWithContactsPageClient'
import { loadCustomerFormCustomization } from '@/lib/customer-form-customization-store'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { CUSTOMER_FORM_FIELDS, type CustomerFormFieldKey } from '@/lib/customer-form-customization'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { createDraftContactInput, type DraftContactInput } from '@/components/DraftContactsSection'

const CUSTOMER_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the customer record.',
  Contact: 'Contact channels and billing address.',
  Financial: 'Default industry, subsidiary, and currency settings.',
  Status: 'Availability and active-state controls.',
}

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(CUSTOMER_FORM_FIELDS)
  const [adminUser, formCustomization, formRequirements, fieldOptions, duplicateCustomer] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    loadCustomerFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, ['industry', 'primarySubsidiaryId', 'primaryCurrencyId', 'inactive']),
    duplicateFrom
      ? prisma.customer.findUnique({
          where: { id: duplicateFrom },
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            industry: true,
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
                isPrimaryForCustomer: true,
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

  const initialValues: Partial<Record<CustomerFormFieldKey, unknown>> | undefined = duplicateCustomer
    ? {
        name: `Copy of ${duplicateCustomer.name}`,
        email: duplicateCustomer.email,
        phone: duplicateCustomer.phone,
        address: duplicateCustomer.address,
        industry: duplicateCustomer.industry,
        primarySubsidiaryId: duplicateCustomer.subsidiaryId,
        primaryCurrencyId: duplicateCustomer.currencyId,
      }
    : undefined

  const initialContacts: DraftContactInput[] =
    duplicateCustomer?.contacts.length
      ? duplicateCustomer.contacts.map((contact, index) => ({
          id: `duplicate-contact-${index}`,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          position: contact.position ?? '',
          isPrimaryForCustomer: contact.isPrimaryForCustomer,
          receivesQuotesSalesOrders: contact.receivesQuotesSalesOrders,
          receivesInvoices: contact.receivesInvoices,
          receivesInvoiceCc: contact.receivesInvoiceCc,
        }))
      : [createDraftContactInput(true)]

  const fieldDefinitions = buildCreateInlineFieldDefinitions<CustomerFormFieldKey, (typeof CUSTOMER_FORM_FIELDS)[number]>({
    fields: CUSTOMER_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.customerCreate,
    readOnlyFields: ['customerId'],
    generatedFieldLabels: ['customerId'],
    typeOverrides: {
      email: 'email',
    },
  })

  const sections = buildConfiguredInlineSections({
    fields: CUSTOMER_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: CUSTOMER_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateWithContactsPageClient
      resource="customers"
      backHref="/customers"
      backLabel="<- Back to Customers"
      title="New Customer"
      detailsTitle="Customer details"
      formId="create-customer-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/customers"
      successRedirectBasePath="/customers"
      extraPayload={{ userId: adminUser.id }}
      contactMode="customer"
      initialContacts={initialContacts}
    />
  )
}
