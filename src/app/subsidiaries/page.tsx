import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import EntityCreateForm from '@/components/EntityCreateForm'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import { getPagination } from '@/lib/pagination'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadCompanyCabinetFiles } from '@/lib/company-file-cabinet-store'
import { resolveCompanyPageLogo } from '@/lib/company-page-logo'
import { generateNextEntityCode } from '@/lib/entity-code'
import { COUNTRY_OPTIONS } from '@/lib/address-country-config'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { formatMasterDataDate } from '@/lib/master-data-display'
import SubsidiaryHierarchyModal from '@/components/SubsidiaryHierarchyModal'
import TableHorizontalScrollbar from '@/components/TableHorizontalScrollbar'
import { loadSubsidiaryFormCustomization } from '@/lib/subsidiary-form-customization-store'
import { subsidiaryListDefinition } from '@/lib/master-data-list-definitions'

type SubsidiaryHierarchyEntity = {
  id: string
  subsidiaryId: string
  name: string
  country: string | null
  entityType: string | null
  taxId: string | null
  parentEntityId: string | null
}

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? { OR: [{ subsidiaryId: { contains: query } }, { name: { contains: query } }] }
    : {}

  const total = await prisma.entity.count({ where })
  const pagination = getPagination(total, params.page)

  const [entities, currencies, glAccounts, allEntities, nextEntityCode, companySettings, cabinetFiles, formCustomization] = await Promise.all([
    prisma.entity.findMany({
      where,
      include: { defaultCurrency: true, functionalCurrency: true, reportingCurrency: true, parentEntity: true },
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.currency.findMany({ orderBy: { currencyId: 'asc' } }),
    prisma.chartOfAccounts.findMany({ where: { active: true }, orderBy: { accountId: 'asc' }, select: { id: true, accountId: true, name: true } }),
    prisma.entity.findMany({
      orderBy: { subsidiaryId: 'asc' },
      select: { id: true, subsidiaryId: true, name: true, country: true, entityType: true, taxId: true, parentEntityId: true },
    }),
    generateNextEntityCode(),
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
    loadSubsidiaryFormCustomization(),
  ])
  const hierarchyEntities: SubsidiaryHierarchyEntity[] = allEntities

  const companyLogoPages = resolveCompanyPageLogo(companySettings, cabinetFiles)

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Subsidiaries"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Subsidiary" title="New Subsidiary">
            <EntityCreateForm
              initialSubsidiaryId={nextEntityCode}
              currencies={currencies}
              glAccounts={glAccounts}
              parentEntities={allEntities.map(({ id, subsidiaryId, name }) => ({ id, subsidiaryId, name }))}
            />
          </CreateModalButton>
        }
      />

      <SubsidiaryHierarchyModal
        entities={hierarchyEntities}
        logoUrl={companyLogoPages?.url}
        title={companySettings.companyName ? `${companySettings.companyName} Group of Companies` : 'Group of Companies'}
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={subsidiaryListDefinition.searchPlaceholder}
        tableId={subsidiaryListDefinition.tableId}
        exportFileName={subsidiaryListDefinition.exportFileName}
        columns={subsidiaryListDefinition.columns}
        sort={sort}
        sortOptions={subsidiaryListDefinition.sortOptions}
        compactExport={subsidiaryListDefinition.compactExport}
        tableContainerId="subsidiaries-list-scroll"
      >
        <table className="min-w-[1600px] w-full" id={subsidiaryListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="subsidiary-id" className="sticky top-0 left-0 z-20 w-36 min-w-36 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">Subsidiary Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name" className="sticky top-0 z-20 w-64 min-w-64 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ left: '9rem', color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}>Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="country">Country</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="address">Address</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="tax-id">Tax ID</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="parent-subsidiary">Parent Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="legal-name">Legal Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="type">Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="default-currency">Primary Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="functional-currency">Functional Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="reporting-currency">Reporting Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="consolidation-method">Consolidation Method</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="ownership-percent">Ownership %</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {entities.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={subsidiaryListDefinition.columns.length}>No subsidiaries found</MasterDataEmptyStateRow>
            ) : (
              entities.map((entity, index) => (
                <tr key={entity.id} style={getMasterDataRowStyle(index, entities.length)}>
                  <MasterDataBodyCell columnId="subsidiary-id" className="sticky left-0 z-10 w-36 min-w-36 px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--card)' }}>
                    <Link href={`/subsidiaries/${entity.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {entity.subsidiaryId}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataMutedCell columnId="name" className="sticky z-10 w-64 min-w-64 px-4 py-2 text-sm" style={{ left: '9rem', backgroundColor: 'var(--card)' }}>{entity.name}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="country">{entity.country ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="address">{entity.address ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="tax-id">{entity.taxId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="parent-subsidiary">{entity.parentEntity ? `${entity.parentEntity.subsidiaryId} - ${entity.parentEntity.name}` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="legal-name">{entity.legalName ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="type">{entity.entityType ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="default-currency">{entity.defaultCurrency?.currencyId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="functional-currency">{entity.functionalCurrency?.currencyId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="reporting-currency">{entity.reportingCurrency?.currencyId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="consolidation-method">{entity.consolidationMethod ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="ownership-percent">{entity.ownershipPercent?.toString() ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{entity.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(entity.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(entity.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="entities"
                        id={entity.id}
                        fields={[
                          ...(formCustomization.fields.subsidiaryId.visible ? [{ name: 'subsidiaryId', label: 'Subsidiary ID', value: entity.subsidiaryId }] : []),
                          ...(formCustomization.fields.name.visible ? [{ name: 'name', label: 'Name', value: entity.name }] : []),
                          ...(formCustomization.fields.legalName.visible ? [{ name: 'legalName', label: 'Legal Name', value: entity.legalName ?? '' }] : []),
                          ...(formCustomization.fields.entityType.visible ? [{ name: 'entityType', label: 'Type', value: entity.entityType ?? '' }] : []),
                          ...(formCustomization.fields.country.visible ? [{
                              name: 'country',
                              label: 'Country',
                              value: entity.country ?? '',
                              type: 'select' as const,
                              placeholder: 'Select country',
                              options: COUNTRY_OPTIONS.map((option) => ({ value: option.code, label: option.label })),
                            }] : []),
                          ...(formCustomization.fields.address.visible ? [{ name: 'address', label: 'Address', value: entity.address ?? '', type: 'address' as const }] : []),
                          ...(formCustomization.fields.taxId.visible ? [{ name: 'taxId', label: 'Tax ID', value: entity.taxId ?? '' }] : []),
                          ...(formCustomization.fields.registrationNumber.visible ? [{ name: 'registrationNumber', label: 'Registration Number', value: entity.registrationNumber ?? '' }] : []),
                          ...(formCustomization.fields.parentEntityId.visible ? [{
                              name: 'parentEntityId',
                              label: 'Parent Subsidiary',
                              value: entity.parentEntityId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select parent subsidiary',
                              options: allEntities.filter((candidate) => candidate.id !== entity.id).map((candidate) => ({ value: candidate.id, label: `${candidate.subsidiaryId} - ${candidate.name}` })),
                            }] : []),
                          ...(formCustomization.fields.defaultCurrencyId.visible ? [{
                              name: 'defaultCurrencyId',
                              label: 'Primary Currency',
                              value: entity.defaultCurrencyId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select currency',
                              options: currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` })),
                            }] : []),
                          ...(formCustomization.fields.functionalCurrencyId.visible ? [{
                              name: 'functionalCurrencyId',
                              label: 'Functional Currency',
                              value: entity.functionalCurrencyId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select currency',
                              options: currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` })),
                            }] : []),
                          ...(formCustomization.fields.reportingCurrencyId.visible ? [{
                              name: 'reportingCurrencyId',
                              label: 'Reporting Currency',
                              value: entity.reportingCurrencyId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select currency',
                              options: currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` })),
                            }] : []),
                          ...(formCustomization.fields.consolidationMethod.visible ? [{ name: 'consolidationMethod', label: 'Consolidation Method', value: entity.consolidationMethod ?? '' }] : []),
                          ...(formCustomization.fields.ownershipPercent.visible ? [{ name: 'ownershipPercent', label: 'Ownership Percent', value: entity.ownershipPercent?.toString() ?? '', type: 'number' as const }] : []),
                          ...(formCustomization.fields.retainedEarningsAccountId.visible ? [{
                              name: 'retainedEarningsAccountId',
                              label: 'Retained Earnings Account',
                              value: entity.retainedEarningsAccountId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select account',
                              options: glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` })),
                            }] : []),
                          ...(formCustomization.fields.ctaAccountId.visible ? [{
                              name: 'ctaAccountId',
                              label: 'CTA Account',
                              value: entity.ctaAccountId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select account',
                              options: glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` })),
                            }] : []),
                          ...(formCustomization.fields.intercompanyClearingAccountId.visible ? [{
                              name: 'intercompanyClearingAccountId',
                              label: 'Intercompany Clearing Account',
                              value: entity.intercompanyClearingAccountId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select account',
                              options: glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` })),
                            }] : []),
                          ...(formCustomization.fields.dueToAccountId.visible ? [{
                              name: 'dueToAccountId',
                              label: 'Due To Account',
                              value: entity.dueToAccountId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select account',
                              options: glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` })),
                            }] : []),
                          ...(formCustomization.fields.dueFromAccountId.visible ? [{
                              name: 'dueFromAccountId',
                              label: 'Due From Account',
                              value: entity.dueFromAccountId ?? '',
                              type: 'select' as const,
                              placeholder: 'Select account',
                              options: glAccounts.map((account) => ({ value: account.id, label: `${account.accountId} - ${account.name}` })),
                            }] : []),
                          ...(formCustomization.fields.inactive.visible ? [{
                              name: 'inactive',
                              label: 'Inactive',
                              value: String(!entity.active),
                              type: 'select' as const,
                              options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
                            }] : []),
                        ]}
                      />
                      <DeleteButton resource="entities" id={entity.id} />
                    </div>
                  </MasterDataBodyCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TableHorizontalScrollbar targetId="subsidiaries-list-scroll" />
      </MasterDataListSection>
    </div>
  )
}
