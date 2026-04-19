import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtCurrency, fmtPhone, normalizePhone } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import ContactDetailCustomizeMode from '@/components/ContactDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailField,
  RecordDetailHeaderCell,
  RecordDetailSection,
  RecordDetailStatCard,
} from '@/components/RecordDetailPanels'
import { loadContactFormCustomization } from '@/lib/contact-form-customization-store'
import { CONTACT_FORM_FIELDS, type ContactFormFieldKey } from '@/lib/contact-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function ContactDetailPage({
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

  const [contact, customers, formCustomization, formRequirements] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            opportunities: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        user: true,
      },
    }),
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    loadContactFormCustomization(),
    loadFormRequirements(),
  ])

  if (!contact) notFound()

  const detailHref = `/contacts/${contact.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the contact record.',
    Contact: 'Communication channels and mailing information.',
    Relationship: 'Customer ownership and job-context fields.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<ContactFormFieldKey, InlineRecordSection['fields'][number]> = {
    contactNumber: {
      name: 'contactNumber',
      label: 'Contact ID',
      value: contact.contactNumber ?? '',
      helpText: 'System-generated contact identifier.',
    },
    firstName: {
      name: 'firstName',
      label: 'First Name',
      value: contact.firstName,
      helpText: 'Contact given name.',
    },
    lastName: {
      name: 'lastName',
      label: 'Last Name',
      value: contact.lastName,
      helpText: 'Contact family name.',
    },
    email: {
      name: 'email',
      label: 'Email',
      value: contact.email ?? '',
      type: 'email',
      helpText: 'Primary contact email address.',
    },
    phone: {
      name: 'phone',
      label: 'Phone',
      value: normalizePhone(contact.phone) ?? '',
      helpText: 'Primary contact phone number.',
    },
    address: {
      name: 'address',
      label: 'Address',
      value: contact.address ?? '',
      type: 'address',
      helpText: 'Mailing or business address for the contact.',
    },
    position: {
      name: 'position',
      label: 'Position',
      value: contact.position ?? '',
      helpText: 'Job title or role for the contact.',
    },
    customerId: {
      name: 'customerId',
      label: 'Customer',
      value: contact.customerId,
      type: 'select',
      options: customers.map((customer) => ({ value: customer.id, label: customer.name })),
      helpText: 'Customer account this contact belongs to.',
      sourceText: 'Customers master data',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: contact.active ? 'false' : 'true',
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Marks the contact unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = CONTACT_FORM_FIELDS.map((field) => {
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
      const configuredFields = CONTACT_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/contacts'}
      backLabel={isCustomizing ? '<- Back to Contact Detail' : '<- Back to Contacts'}
      meta={contact.contactNumber ?? 'Pending'}
      title={`${contact.firstName} ${contact.lastName}`}
      badge={
        contact.position ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
            {contact.position}
          </span>
        ) : null
      }
      actions={
        <>
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
          {!isCustomizing ? <DeleteButton resource="contacts" id={contact.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <ContactDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.contactCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="contacts"
            id={contact.id}
            title="Contact details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <RecordDetailStatCard label="Customer" value={contact.customer.name} />
          <RecordDetailStatCard label="Owner" value={contact.user.name ?? contact.user.email} />
          <RecordDetailStatCard label="Open opportunities" value={contact.customer.opportunities.length} accent />
        </div>

        <RecordDetailSection title="Linked customer" count={1}>
          <div className="mb-4 flex items-center justify-between px-6 pt-6">
            <Link href={`/customers/${contact.customer.id}`} className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
              {'View customer ->'}
            </Link>
          </div>
          <div className="px-6 pb-6">
            <p className="text-lg font-semibold text-white">{contact.customer.name}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <RecordDetailField label="Industry">{contact.customer.industry ?? '-'}</RecordDetailField>
              <RecordDetailField label="Customer email">{contact.customer.email ?? '-'}</RecordDetailField>
              <RecordDetailField label="Customer phone">{fmtPhone(contact.customer.phone)}</RecordDetailField>
              <RecordDetailField label="Address">{contact.customer.address ?? '-'}</RecordDetailField>
            </dl>
          </div>
        </RecordDetailSection>

        <RecordDetailSection title="Recent customer opportunities" count={contact.customer.opportunities.length}>
          {contact.customer.opportunities.length === 0 ? (
            <p className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No opportunities for this customer yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                    <RecordDetailHeaderCell>Stage</RecordDetailHeaderCell>
                    <RecordDetailHeaderCell>Amount</RecordDetailHeaderCell>
                    <RecordDetailHeaderCell>Close Date</RecordDetailHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {contact.customer.opportunities.map((opportunity, index) => (
                    <tr key={opportunity.id} style={index < contact.customer.opportunities.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                      <RecordDetailCell>
                        <Link href={`/opportunities/${opportunity.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                          {opportunity.name}
                        </Link>
                      </RecordDetailCell>
                      <RecordDetailCell>{opportunity.stage}</RecordDetailCell>
                      <RecordDetailCell>{fmtCurrency(opportunity.amount)}</RecordDetailCell>
                      <RecordDetailCell>{opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString() : '-'}</RecordDetailCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
