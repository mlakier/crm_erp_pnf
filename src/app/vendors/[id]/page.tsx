import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtCurrency, normalizePhone } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import VendorCreateMenu from '@/components/VendorCreateMenu'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import VendorDetailCustomizeMode from '@/components/VendorDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
  RecordDetailStatCard,
} from '@/components/RecordDetailPanels'
import { loadVendorFormCustomization } from '@/lib/vendor-form-customization-store'
import { VENDOR_FORM_FIELDS, type VendorFormFieldKey } from '@/lib/vendor-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function VendorDetailPage({
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

  const [vendor, defaultUser, subsidiaries, currencies, formCustomization, formRequirements] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id },
      include: {
        entity: true,
        currency: true,
        purchaseOrders: { orderBy: { createdAt: 'desc' } },
        bills: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.user.findFirst({ where: { email: 'admin@example.com' }, select: { id: true } }),
    prisma.entity.findMany({
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.currency.findMany({
      orderBy: { currencyId: 'asc' },
      select: { id: true, currencyId: true, name: true },
    }),
    loadVendorFormCustomization(),
    loadFormRequirements(),
  ])

  if (!vendor) notFound()

  const totalSpend = vendor.purchaseOrders.reduce((sum, purchaseOrder) => sum + (purchaseOrder.total ?? 0), 0)
  const openInvoices = vendor.bills.filter((bill) => bill.status !== 'paid' && bill.status !== 'void')
  const detailHref = `/vendors/${vendor.id}`

  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity fields for the vendor record.',
    Contact: 'Contact channels and mailing address.',
    Financial: 'Default tax, subsidiary, and currency settings.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<VendorFormFieldKey, InlineRecordSection['fields'][number]> = {
    vendorNumber: {
      name: 'vendorNumber',
      label: 'Vendor ID',
      value: vendor.vendorNumber ?? '',
      helpText: 'System-generated vendor identifier.',
    },
    name: {
      name: 'name',
      label: 'Name',
      value: vendor.name,
      helpText: 'Primary vendor or supplier name.',
    },
    email: {
      name: 'email',
      label: 'Email',
      value: vendor.email ?? '',
      type: 'email',
      helpText: 'Primary vendor email address.',
    },
    phone: {
      name: 'phone',
      label: 'Phone',
      value: normalizePhone(vendor.phone) ?? '',
      helpText: 'Primary vendor phone number.',
    },
    address: {
      name: 'address',
      label: 'Address',
      value: vendor.address ?? '',
      type: 'address',
      helpText: 'Mailing or remittance address for the vendor.',
    },
    taxId: {
      name: 'taxId',
      label: 'Tax ID',
      value: vendor.taxId ?? '',
      helpText: 'Tax identifier for the vendor.',
    },
    primarySubsidiaryId: {
      name: 'primarySubsidiaryId',
      label: 'Primary Subsidiary',
      value: vendor.entityId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` }))],
      helpText: 'Default legal entity context for this vendor.',
      sourceText: 'Subsidiaries master data',
    },
    primaryCurrencyId: {
      name: 'primaryCurrencyId',
      label: 'Primary Currency',
      value: vendor.currencyId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` }))],
      helpText: 'Default transaction currency for this vendor.',
      sourceText: 'Currencies master data',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: String(vendor.inactive),
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Marks the vendor unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = VENDOR_FORM_FIELDS.map((field) => {
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
      const configuredFields = VENDOR_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/vendors'}
      backLabel={isCustomizing ? '<- Back to Vendor Detail' : '<- Back to Vendors'}
      meta={vendor.vendorNumber ?? 'Pending'}
      title={vendor.name}
      badge={
        vendor.taxId ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tax ID: {vendor.taxId}</p>
        ) : null
      }
      actions={
        <>
          {!isCustomizing && defaultUser ? <VendorCreateMenu vendorId={vendor.id} userId={defaultUser.id} /> : null}
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
          {!isCustomizing ? <DeleteButton resource="vendors" id={vendor.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <VendorDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.vendorCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="vendors"
            id={vendor.id}
            title="Vendor details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <RecordDetailStatCard label="Purchase orders" value={vendor.purchaseOrders.length} />
          <RecordDetailStatCard label="Total spend" value={fmtCurrency(totalSpend)} accent="teal" />
          <RecordDetailStatCard label="Open AP invoices" value={openInvoices.length} accent={openInvoices.length > 0 ? 'yellow' : undefined} />
        </div>

        <RecordDetailSection title="Purchase Orders" count={vendor.purchaseOrders.length}>
          {vendor.purchaseOrders.length === 0 ? (
            <RecordDetailEmptyState message="No purchase orders yet" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Number</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Status</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Total</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Date</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {vendor.purchaseOrders.map((purchaseOrder) => (
                  <tr key={purchaseOrder.id} id={`po-${purchaseOrder.id}`} tabIndex={-1} className="focus:outline-none transition-shadow">
                    <RecordDetailCell>
                      <Link href={`/purchase-orders/${purchaseOrder.id}`} style={{ color: 'var(--accent-primary-strong)' }} className="hover:underline">
                        {purchaseOrder.number}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{purchaseOrder.status}</RecordDetailCell>
                    <RecordDetailCell>{fmtCurrency(purchaseOrder.total)}</RecordDetailCell>
                    <RecordDetailCell>{new Date(purchaseOrder.createdAt).toLocaleDateString()}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        {vendor.bills.length > 0 ? (
          <RecordDetailSection title="Bills" count={vendor.bills.length}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Bill #</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Amount</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Due Date</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Status</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {vendor.bills.map((bill) => (
                  <tr key={bill.id}>
                    <RecordDetailCell>
                      <Link href={`/bills/${bill.id}`} style={{ color: 'var(--accent-primary-strong)' }} className="hover:underline">
                        {bill.number}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{fmtCurrency(bill.total)}</RecordDetailCell>
                    <RecordDetailCell>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '-'}</RecordDetailCell>
                    <RecordDetailCell>
                      <StatusBadge status={bill.status} />
                    </RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </RecordDetailSection>
        ) : null}
    </RecordDetailPageShell>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.16)', color: '#86efac' }}>Paid</span>
  if (status === 'approved') return <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>Approved</span>
  if (status === 'void') return <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(107,114,128,0.18)', color: '#9ca3af' }}>Void</span>
  return <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.16)', color: '#fcd34d' }}>Pending</span>
}
