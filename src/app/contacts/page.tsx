import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtPhone, normalizePhone } from '@/lib/format'
import ContactCreateForm from '@/components/ContactCreateForm'
import DeleteButton from '@/components/DeleteButton'
import CreateModalButton from '@/components/CreateModalButton'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import PaginationFooter from '@/components/PaginationFooter'
import EditButton from '@/components/EditButton'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadContactFormCustomization } from '@/lib/contact-form-customization-store'
import { contactListDefinition } from '@/lib/master-data-list-definitions'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? {
        OR: [
          { contactNumber: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { address: { contains: query } },
          { position: { contains: query } },
          { customer: { name: { contains: query } } },
        ],
      }
    : {}

  const orderBy =
    sort === 'oldest'
      ? [{ createdAt: 'asc' as const }]
      : sort === 'name'
        ? [{ lastName: 'asc' as const }, { firstName: 'asc' as const }]
        : [{ createdAt: 'desc' as const }]

  const [totalContacts, customers, adminUser, companyLogoPages, formCustomization] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    loadCompanyPageLogo(),
    loadContactFormCustomization(),
  ])

  const pagination = getPagination(totalContacts, params.page)

  const contacts = await prisma.contact.findMany({
    where,
    include: { customer: true },
    orderBy,
    skip: pagination.skip,
    take: pagination.pageSize,
  })

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (sort) search.set('sort', sort)
    search.set('page', String(nextPage))
    return `/contacts?${search.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Contacts"
        total={totalContacts}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Contact" title="New Contact">
            <ContactCreateForm userId={adminUser.id} customers={customers} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={contactListDefinition.searchPlaceholder}
        tableId={contactListDefinition.tableId}
        exportFileName={contactListDefinition.exportFileName}
        columns={contactListDefinition.columns}
        sort={sort}
        sortOptions={contactListDefinition.sortOptions}
      >
        <table className="min-w-full" id={contactListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="contact-number">Contact Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="customer">Customer</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="email">Email</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="phone">Phone</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="address">Address</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="position">Position</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={11}>No contacts found</MasterDataEmptyStateRow>
            ) : contacts.map((contact, index) => (
              <tr key={contact.id} style={getMasterDataRowStyle(index, contacts.length)}>
                <MasterDataBodyCell columnId="contact-number" className="px-4 py-2 text-sm font-medium">
                  <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                    {contact.contactNumber ?? 'Pending'}
                  </Link>
                </MasterDataBodyCell>
                <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm text-white">{contact.firstName} {contact.lastName}</MasterDataBodyCell>
                <MasterDataMutedCell columnId="customer">{contact.customer.name}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="email">{contact.email ?? '-'}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="phone">{fmtPhone(contact.phone)}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="address">{contact.address ?? '-'}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="position">{contact.position ?? '-'}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="inactive">{contact.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="created">{formatMasterDataDate(contact.createdAt)}</MasterDataMutedCell>
                <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(contact.updatedAt)}</MasterDataMutedCell>
                <MasterDataBodyCell columnId="actions" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <EditButton
                      resource="contacts"
                      id={contact.id}
                      fields={[
                        ...(formCustomization.fields.firstName.visible ? [{ name: 'firstName', label: 'First Name', value: contact.firstName }] : []),
                        ...(formCustomization.fields.lastName.visible ? [{ name: 'lastName', label: 'Last Name', value: contact.lastName }] : []),
                        ...(formCustomization.fields.email.visible ? [{ name: 'email', label: 'Email', value: contact.email ?? '', type: 'email' as const }] : []),
                        ...(formCustomization.fields.phone.visible ? [{ name: 'phone', label: 'Phone', value: normalizePhone(contact.phone) ?? '' }] : []),
                        ...(formCustomization.fields.address.visible ? [{ name: 'address', label: 'Address', value: contact.address ?? '', type: 'address' as const }] : []),
                        ...(formCustomization.fields.position.visible ? [{ name: 'position', label: 'Position', value: contact.position ?? '' }] : []),
                        ...(formCustomization.fields.customerId.visible
                          ? [{
                              name: 'customerId',
                              label: 'Customer',
                              value: contact.customerId,
                              type: 'select' as const,
                              options: customers.map((customer) => ({ value: customer.id, label: customer.name })),
                            }]
                          : []),
                        ...(formCustomization.fields.inactive.visible
                          ? [{
                              name: 'inactive',
                              label: 'Inactive',
                              value: contact.active ? 'false' : 'true',
                              type: 'checkbox' as const,
                              placeholder: 'Inactive',
                            }]
                          : []),
                      ]}
                    />
                    <DeleteButton resource="contacts" id={contact.id} />
                  </div>
                </MasterDataBodyCell>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={totalContacts}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </MasterDataListSection>
    </div>
  )
}
