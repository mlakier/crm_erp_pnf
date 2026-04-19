import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import CurrencyDetailCustomizeMode from '@/components/CurrencyDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
  RecordDetailStatCard,
} from '@/components/RecordDetailPanels'
import { loadCurrencyFormCustomization } from '@/lib/currency-form-customization-store'
import { CURRENCY_FORM_FIELDS, type CurrencyFormFieldKey } from '@/lib/currency-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function CurrencyDetailPage({
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

  const [currency, currencyFormCustomization, formRequirements] = await Promise.all([
    prisma.currency.findUnique({
      where: { id },
      include: {
        entities: { orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } },
        customers: { orderBy: { name: 'asc' }, select: { id: true, name: true, customerId: true } },
        vendors: { orderBy: { name: 'asc' }, select: { id: true, name: true, vendorNumber: true } },
      },
    }),
    loadCurrencyFormCustomization(),
    loadFormRequirements(),
  ])

  if (!currency) notFound()

  const detailHref = `/currencies/${currency.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity and presentation fields for the currency.',
    Settings: 'Rounding, status, and base-currency behavior.',
  }
  const fieldDefinitions: Record<CurrencyFormFieldKey, InlineRecordSection['fields'][number]> = {
    currencyId: { name: 'currencyId', label: 'Currency Id', value: currency.currencyId, helpText: 'Unique ISO or internal code for the currency.' },
    name: { name: 'name', label: 'Name', value: currency.name, helpText: 'Display name for the currency.' },
    symbol: { name: 'symbol', label: 'Symbol', value: currency.symbol ?? '', helpText: 'Printed symbol used on forms and reports.' },
    decimals: { name: 'decimals', label: 'Decimal Places', value: String(currency.decimals), type: 'number', helpText: 'Number of decimal places used for this currency.' },
    isBase: { name: 'isBase', label: 'Base Currency', value: String(currency.isBase), type: 'select', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], helpText: 'Marks whether this is the primary company currency.', sourceText: 'System base currency flag' },
    inactive: { name: 'inactive', label: 'Inactive', value: String(!currency.active), type: 'select', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], helpText: 'Marks the currency unavailable for new records while preserving history.', sourceText: 'System status values' },
  }
  const customizeFields = CURRENCY_FORM_FIELDS.map((field) => ({
    id: field.id,
    label: fieldDefinitions[field.id].label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue:
      fieldDefinitions[field.id].options?.find((option) => option.value === fieldDefinitions[field.id].value)?.label
      ?? fieldDefinitions[field.id].value
      ?? '',
  }))
  const detailSections: InlineRecordSection[] = currencyFormCustomization.sections
    .map((sectionTitle) => {
      const configuredFields = CURRENCY_FORM_FIELDS
        .filter((field) => {
          const config = currencyFormCustomization.fields[field.id]
          return config.visible && config.section === sectionTitle
        })
        .sort((a, b) => {
          const left = currencyFormCustomization.fields[a.id]
          const right = currencyFormCustomization.fields[b.id]
          if (left.column !== right.column) return left.column - right.column
          return left.order - right.order
        })
        .map((field) => ({
          ...fieldDefinitions[field.id],
          column: currencyFormCustomization.fields[field.id].column,
          order: currencyFormCustomization.fields[field.id].order,
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
      backHref={isCustomizing ? detailHref : '/currencies'}
      backLabel={isCustomizing ? '<- Back to Currency Detail' : '<- Back to Currencies'}
      meta={currency.currencyId}
      title={currency.name}
      badge={
        currency.symbol ? (
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            {currency.symbol}
          </span>
        ) : null
      }
      actions={
        <>
          {!isEditing && !isCustomizing ? (
            <Link
              href={`${detailHref}?customize=1`}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
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
          {!isCustomizing ? <DeleteButton resource="currencies" id={currency.id} /> : null}
        </>
      }
    >
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <RecordDetailStatCard label="Subsidiaries" value={currency.entities.length} />
          <RecordDetailStatCard label="Customers" value={currency.customers.length} />
          <RecordDetailStatCard label="Vendors" value={currency.vendors.length} />
        </div>

        {isCustomizing ? (
          <CurrencyDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={currencyFormCustomization}
            initialRequirements={{ ...formRequirements.currencyCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="currencies"
            id={currency.id}
            title="Currency details"
            sections={detailSections}
            editing={isEditing}
            columns={currencyFormCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Subsidiaries (Default Currency)" count={currency.entities.length}>
          {currency.entities.length === 0 ? (
            <RecordDetailEmptyState message="No subsidiaries use this as default currency" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Code</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {currency.entities.map((entity) => (
                  <tr key={entity.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/subsidiaries/${entity.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {entity.subsidiaryId}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{entity.name}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <RecordDetailSection title="Customers" count={currency.customers.length}>
          {currency.customers.length === 0 ? (
            <RecordDetailEmptyState message="No customers with this primary currency" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Customer #</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {currency.customers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/customers/${customer.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {customer.customerId ?? 'Pending'}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{customer.name}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <RecordDetailSection title="Vendors" count={currency.vendors.length}>
          {currency.vendors.length === 0 ? (
            <RecordDetailEmptyState message="No vendors with this primary currency" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Vendor Id</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {currency.vendors.map((vendor) => (
                  <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/vendors/${vendor.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {vendor.vendorNumber ?? 'Pending'}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{vendor.name}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
