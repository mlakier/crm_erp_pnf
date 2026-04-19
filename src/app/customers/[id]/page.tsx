import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import CustomerCreateMenu from '@/components/CustomerCreateMenu'
import CustomerRelatedDocs from '@/components/CustomerRelatedDocs'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
  RecordDetailStatCard,
} from '@/components/RecordDetailPanels'
import { fmtCurrency, fmtPhone, normalizePhone } from '@/lib/format'
import { loadListOptions } from '@/lib/list-options-store'
import CustomerDetailCustomizeMode from '@/components/CustomerDetailCustomizeMode'
import { loadCustomerFormCustomization } from '@/lib/customer-form-customization-store'
import { CUSTOMER_FORM_FIELDS, type CustomerFormFieldKey } from '@/lib/customer-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function CustomerDetailPage({
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

  const [customer, subsidiaries, currencies, listOptions, formCustomization, formRequirements] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        entity: true,
        currency: true,
        contacts: { orderBy: { createdAt: 'desc' } },
        opportunities: { orderBy: { createdAt: 'desc' } },
        quotes: { orderBy: { createdAt: 'desc' } },
        salesOrders: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.entity.findMany({
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.currency.findMany({
      orderBy: { currencyId: 'asc' },
      select: { id: true, currencyId: true, name: true },
    }),
    loadListOptions(),
    loadCustomerFormCustomization(),
    loadFormRequirements(),
  ])

  if (!customer) notFound()

  const pipelineValue = customer.opportunities.reduce((sum, opportunity) => sum + (opportunity.amount ?? 0), 0)
  const detailHref = `/customers/${customer.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the customer record.',
    Contact: 'Contact channels and billing address.',
    Financial: 'Default industry, subsidiary, and currency settings.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<CustomerFormFieldKey, InlineRecordSection['fields'][number]> = {
    customerId: {
      name: 'customerId',
      label: 'Customer ID',
      value: customer.customerId ?? '',
      helpText: 'System-generated customer identifier.',
    },
    name: {
      name: 'name',
      label: 'Name',
      value: customer.name,
      helpText: 'Primary customer or account name.',
    },
    email: {
      name: 'email',
      label: 'Email',
      value: customer.email ?? '',
      type: 'email',
      helpText: 'Primary customer email address.',
    },
    phone: {
      name: 'phone',
      label: 'Phone',
      value: normalizePhone(customer.phone) ?? '',
      helpText: 'Primary customer phone number.',
    },
    address: {
      name: 'address',
      label: 'Billing Address',
      value: customer.address ?? '',
      type: 'address',
      helpText: 'Main billing address for the customer.',
    },
    industry: {
      name: 'industry',
      label: 'Industry',
      value: customer.industry ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...listOptions.customer.industry.map((option) => ({ value: option, label: option }))],
      helpText: 'Customer industry or segment classification.',
      sourceText: 'Customer industry list',
    },
    primarySubsidiaryId: {
      name: 'primarySubsidiaryId',
      label: 'Primary Subsidiary',
      value: customer.entityId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` }))],
      helpText: 'Default legal entity context for this customer.',
      sourceText: 'Subsidiaries master data',
    },
    primaryCurrencyId: {
      name: 'primaryCurrencyId',
      label: 'Primary Currency',
      value: customer.currencyId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` }))],
      helpText: 'Default transaction currency for this customer.',
      sourceText: 'Currencies master data',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: customer.inactive ? 'true' : 'false',
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Marks the customer unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = CUSTOMER_FORM_FIELDS.map((field) => {
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
      const configuredFields = CUSTOMER_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/customers'}
      backLabel={isCustomizing ? '<- Back to Customer Detail' : '<- Back to Customers'}
      meta={customer.customerId ?? 'Pending'}
      title={customer.name}
      badge={
        customer.industry ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
            {customer.industry}
          </span>
        ) : null
      }
      actions={
        <>
          {!isCustomizing ? (
            <CustomerCreateMenu
              customerId={customer.id}
              userId={customer.userId}
              opportunities={customer.opportunities.map((opportunity) => ({
                id: opportunity.id,
                label: `${opportunity.opportunityNumber ?? 'Pending'} - ${opportunity.name}`,
              }))}
              salesOrders={customer.salesOrders.map((salesOrder) => ({
                id: salesOrder.id,
                label: salesOrder.number,
              }))}
            />
          ) : null}
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
          {!isCustomizing ? <DeleteButton resource="customers" id={customer.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <CustomerDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.customerCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="customers"
            id={customer.id}
            title="Customer details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <RecordDetailStatCard label="Contacts" value={customer.contacts.length} />
          <RecordDetailStatCard label="Opportunities" value={customer.opportunities.length} />
          <RecordDetailStatCard label="Pipeline value" value={fmtCurrency(pipelineValue)} accent />
        </div>

        <RecordDetailSection title="Contacts" count={customer.contacts.length}>
          {customer.contacts.length === 0 ? (
            <RecordDetailEmptyState message="No contacts yet" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Contact #</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Email</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Phone</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Position</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {customer.contacts.map((contact) => (
                  <tr key={contact.id} id={`contact-${contact.id}`} tabIndex={-1} className="focus:outline-none transition-shadow">
                    <RecordDetailCell>
                      <Link href={`/contacts/${contact.id}`} style={{ color: 'var(--accent-primary-strong)' }} className="hover:underline">
                        {contact.contactNumber ?? 'Pending'}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{contact.firstName} {contact.lastName}</RecordDetailCell>
                    <RecordDetailCell>{contact.email ?? '-'}</RecordDetailCell>
                    <RecordDetailCell>{fmtPhone(contact.phone)}</RecordDetailCell>
                    <RecordDetailCell>{contact.position ?? '-'}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <CustomerRelatedDocs
          opportunities={customer.opportunities.map((opportunity) => ({
            id: opportunity.id,
            name: opportunity.name,
            stage: opportunity.stage,
            amount: opportunity.amount,
            closeDate: opportunity.closeDate ? opportunity.closeDate.toISOString() : null,
          }))}
          quotes={customer.quotes.map((quote) => ({
            id: quote.id,
            number: quote.number,
            status: quote.status,
            total: quote.total,
            validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
            createdAt: quote.createdAt.toISOString(),
          }))}
          salesOrders={customer.salesOrders.map((salesOrder) => ({
            id: salesOrder.id,
            number: salesOrder.number,
            status: salesOrder.status,
            total: salesOrder.total,
            createdAt: salesOrder.createdAt.toISOString(),
          }))}
          invoices={customer.invoices.map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
            status: invoice.status,
            total: invoice.total,
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
            createdAt: invoice.createdAt.toISOString(),
          }))}
        />
    </RecordDetailPageShell>
  )
}
