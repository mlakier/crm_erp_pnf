import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import { COUNTRY_OPTIONS } from '@/lib/address-country-config'
import SubsidiaryDetailCustomizeMode from '@/components/SubsidiaryDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadSubsidiaryFormCustomization } from '@/lib/subsidiary-form-customization-store'
import { SUBSIDIARY_FORM_FIELDS, type SubsidiaryFormFieldKey } from '@/lib/subsidiary-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function SubsidiaryDetailPage({
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

  const [entity, currencies, parentEntities, glAccounts, formCustomization, formRequirements] = await Promise.all([
    prisma.entity.findUnique({
      where: { id },
      include: {
        defaultCurrency: true,
        functionalCurrency: true,
        reportingCurrency: true,
        parentEntity: true,
        childEntities: { orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } },
        employees: { orderBy: { lastName: 'asc' }, select: { id: true, firstName: true, lastName: true, title: true, email: true } },
        customers: { orderBy: { name: 'asc' }, select: { id: true, name: true, customerId: true } },
        vendors: { orderBy: { name: 'asc' }, select: { id: true, name: true, vendorNumber: true } },
        retainedEarningsAccount: { select: { id: true, accountId: true, name: true } },
        ctaAccount: { select: { id: true, accountId: true, name: true } },
        intercompanyClearingAccount: { select: { id: true, accountId: true, name: true } },
        dueToAccount: { select: { id: true, accountId: true, name: true } },
        dueFromAccount: { select: { id: true, accountId: true, name: true } },
      },
    }),
    prisma.currency.findMany({
      orderBy: { currencyId: 'asc' },
      select: { id: true, currencyId: true, name: true },
    }),
    prisma.entity.findMany({
      where: { NOT: { id } },
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { accountId: 'asc' },
      select: { id: true, accountId: true, name: true },
    }),
    loadSubsidiaryFormCustomization(),
    loadFormRequirements(),
  ])

  if (!entity) notFound()

  const detailHref = `/subsidiaries/${entity.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity and operating name for the subsidiary.',
    Registration: 'Legal registration, country, and statutory identifiers.',
    Hierarchy: 'Parent-child relationships used for organization and consolidation.',
    Currency: 'Default, functional, and reporting currency settings.',
    Consolidation: 'Consolidation ownership and group reporting configuration.',
    Accounting: 'Default account mappings used for close and intercompany activity.',
    Status: 'Availability and active-state controls.',
  }

  const currencyOptions = currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` }))
  const parentOptions = parentEntities.map((candidate) => ({ value: candidate.id, label: `${candidate.subsidiaryId} - ${candidate.name}` }))
  const glOptions = glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` }))

  const fieldDefinitions: Record<SubsidiaryFormFieldKey, InlineRecordSection['fields'][number]> = {
    subsidiaryId: { name: 'subsidiaryId', label: 'Subsidiary ID', value: entity.subsidiaryId, helpText: 'System-generated legal entity code.' },
    name: { name: 'name', label: 'Name', value: entity.name, helpText: 'Operating name of the subsidiary.' },
    legalName: { name: 'legalName', label: 'Legal Name', value: entity.legalName ?? '', helpText: 'Registered legal entity name.' },
    entityType: { name: 'entityType', label: 'Type', value: entity.entityType ?? '', helpText: 'Entity classification such as corporation, LLC, or branch.' },
    country: {
      name: 'country',
      label: 'Country',
      value: entity.country ?? '',
      type: 'select',
      placeholder: 'Select country',
      options: COUNTRY_OPTIONS.map((option) => ({ value: option.code, label: option.label })),
      helpText: 'Country of registration or primary operation.',
      sourceText: 'Country reference list',
    },
    address: { name: 'address', label: 'Address', value: entity.address ?? '', type: 'address', helpText: 'Mailing or registered office address.' },
    taxId: { name: 'taxId', label: 'Tax ID', value: entity.taxId ?? '', helpText: 'Primary tax registration or identification number.' },
    registrationNumber: { name: 'registrationNumber', label: 'Registration Number', value: entity.registrationNumber ?? '', helpText: 'Corporate registration number where applicable.' },
    parentEntityId: {
      name: 'parentEntityId',
      label: 'Parent Subsidiary',
      value: entity.parentEntityId ?? '',
      type: 'select',
      placeholder: 'Select parent subsidiary',
      options: parentOptions,
      helpText: 'Parent entity used for hierarchy and consolidation.',
      sourceText: 'Subsidiaries master data',
    },
    defaultCurrencyId: {
      name: 'defaultCurrencyId',
      label: 'Primary Currency',
      value: entity.defaultCurrencyId ?? '',
      type: 'select',
      placeholder: 'Select currency',
      options: currencyOptions,
      helpText: 'Default transaction currency for the subsidiary.',
      sourceText: 'Currencies master data',
    },
    functionalCurrencyId: {
      name: 'functionalCurrencyId',
      label: 'Functional Currency',
      value: entity.functionalCurrencyId ?? '',
      type: 'select',
      placeholder: 'Select currency',
      options: currencyOptions,
      helpText: 'Currency of the primary economic environment.',
      sourceText: 'Currencies master data',
    },
    reportingCurrencyId: {
      name: 'reportingCurrencyId',
      label: 'Reporting Currency',
      value: entity.reportingCurrencyId ?? '',
      type: 'select',
      placeholder: 'Select currency',
      options: currencyOptions,
      helpText: 'Currency used for group or reporting presentation.',
      sourceText: 'Currencies master data',
    },
    consolidationMethod: { name: 'consolidationMethod', label: 'Consolidation Method', value: entity.consolidationMethod ?? '', helpText: 'How the entity is consolidated into group reporting.' },
    ownershipPercent: { name: 'ownershipPercent', label: 'Ownership Percent', value: entity.ownershipPercent?.toString() ?? '', type: 'number', helpText: 'Ownership percentage held in the subsidiary.' },
    retainedEarningsAccountId: {
      name: 'retainedEarningsAccountId',
      label: 'Retained Earnings Account',
      value: entity.retainedEarningsAccountId ?? '',
      type: 'select',
      placeholder: 'Select account',
      options: glOptions,
      helpText: 'Default retained earnings account for close activity.',
      sourceText: 'Chart of Accounts',
    },
    ctaAccountId: {
      name: 'ctaAccountId',
      label: 'CTA Account',
      value: entity.ctaAccountId ?? '',
      type: 'select',
      placeholder: 'Select account',
      options: glOptions,
      helpText: 'Cumulative translation adjustment account.',
      sourceText: 'Chart of Accounts',
    },
    intercompanyClearingAccountId: {
      name: 'intercompanyClearingAccountId',
      label: 'Intercompany Clearing Account',
      value: entity.intercompanyClearingAccountId ?? '',
      type: 'select',
      placeholder: 'Select account',
      options: glOptions,
      helpText: 'Clearing account for intercompany activity.',
      sourceText: 'Chart of Accounts',
    },
    dueToAccountId: {
      name: 'dueToAccountId',
      label: 'Due To Account',
      value: entity.dueToAccountId ?? '',
      type: 'select',
      placeholder: 'Select account',
      options: glOptions,
      helpText: 'Default due-to intercompany account.',
      sourceText: 'Chart of Accounts',
    },
    dueFromAccountId: {
      name: 'dueFromAccountId',
      label: 'Due From Account',
      value: entity.dueFromAccountId ?? '',
      type: 'select',
      placeholder: 'Select account',
      options: glOptions,
      helpText: 'Default due-from intercompany account.',
      sourceText: 'Chart of Accounts',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: String(!entity.active),
      type: 'select',
      options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
      helpText: 'Marks the subsidiary unavailable for new activity while preserving history.',
      sourceText: 'System status values',
    },
  }

  const customizeFields = SUBSIDIARY_FORM_FIELDS.map((field) => {
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
      const configuredFields = SUBSIDIARY_FORM_FIELDS
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
      backHref={isCustomizing ? detailHref : '/subsidiaries'}
      backLabel={isCustomizing ? '<- Back to Subsidiary Detail' : '<- Back to Subsidiaries'}
      meta={entity.subsidiaryId}
      title={entity.name}
      badge={
        entity.entityType ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
            {entity.entityType}
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
          {!isCustomizing ? <DeleteButton resource="entities" id={entity.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <SubsidiaryDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={formCustomization}
            initialRequirements={{ ...formRequirements.subsidiaryCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="entities"
            id={entity.id}
            title="Subsidiary details"
            sections={detailSections}
            editing={isEditing}
            columns={formCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Child Subsidiaries" count={entity.childEntities.length}>
          {entity.childEntities.length === 0 ? (
            <RecordDetailEmptyState message="No child subsidiaries" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Subsidiary ID</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {entity.childEntities.map((child) => (
                  <tr key={child.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/subsidiaries/${child.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {child.subsidiaryId}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{child.name}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <RecordDetailSection title="Employees" count={entity.employees.length}>
          {entity.employees.length === 0 ? (
            <RecordDetailEmptyState message="No employees in this subsidiary" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Title</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Email</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {entity.employees.map((employee) => (
                  <tr key={employee.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/employees/${employee.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {employee.firstName} {employee.lastName}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{employee.title ?? '-'}</RecordDetailCell>
                    <RecordDetailCell>{employee.email ?? '-'}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>

        <RecordDetailSection title="Customers" count={entity.customers.length}>
          {entity.customers.length === 0 ? (
            <RecordDetailEmptyState message="No customers in this subsidiary" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Customer #</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {entity.customers.map((customer) => (
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

        <RecordDetailSection title="Vendors" count={entity.vendors.length}>
          {entity.vendors.length === 0 ? (
            <RecordDetailEmptyState message="No vendors in this subsidiary" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Vendor ID</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {entity.vendors.map((vendor) => (
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
