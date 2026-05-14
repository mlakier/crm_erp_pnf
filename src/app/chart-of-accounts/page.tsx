import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import ChartOfAccountsInlineEditTable, { type ChartOfAccountsInlineRow } from '@/components/ChartOfAccountsInlineEditTable'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { chartOfAccountsListDefinition } from '@/lib/master-data-list-definitions'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { loadListOptionsForSource } from '@/lib/list-source'
import { CHART_OF_ACCOUNTS_FORM_FIELDS } from '@/lib/chart-of-accounts-form-customization'
import { DEFAULT_RECORD_LIST_SORT } from '@/lib/record-list-sort'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sanitizeSavedSearchDefinitionState, type SavedSearchCriterion } from '@/lib/saved-search-metadata'
import { loadEffectiveSavedSearchDefinition } from '@/lib/load-effective-saved-search-definition'
import {
  buildChartOfAccountsSavedSearchFields,
  CHART_OF_ACCOUNTS_SAVED_SEARCH_FILTERS,
} from '@/lib/chart-of-accounts-saved-search-metadata'
import { GL_ACCOUNT_CATEGORY_POLICIES, monetaryClassificationLabel, translationTreatmentLabel } from '@/lib/gl-account-accounting-policy'

function isAdminRole(role: string | null | undefined) {
  return (role ?? '').trim().toLowerCase().includes('admin')
}

function buildStringFilter(operator: string, value: string) {
  const trimmed = value.trim()
  switch (operator) {
    case 'startsWith':
      return trimmed ? { startsWith: trimmed, mode: 'insensitive' as const } : null
    case 'is':
      return trimmed ? { equals: trimmed, mode: 'insensitive' as const } : null
    case 'isNot':
      return trimmed ? { not: { equals: trimmed, mode: 'insensitive' as const } } : null
    case 'isEmpty':
      return ''
    case 'isNotEmpty':
      return { not: '' }
    case 'contains':
    default:
      return trimmed ? { contains: trimmed, mode: 'insensitive' as const } : null
  }
}

function buildBooleanFilter(operator: string, value: string) {
  if (operator === 'isEmpty' || operator === 'isNotEmpty') return null
  if (value !== 'true' && value !== 'false') return null
  const parsed = value === 'true'
  return operator === 'isNot' ? { not: parsed } : parsed
}

function buildDateFilter(field: 'createdAt' | 'updatedAt', operator: string, value: string) {
  if (operator === 'isEmpty' || operator === 'isNotEmpty') return null
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const start = new Date(parsed)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return operator === 'isNot'
    ? { NOT: { [field]: { gte: start, lt: end } } }
    : { [field]: { gte: start, lt: end } }
}

function buildChartOfAccountsCriterionCondition(criterion: SavedSearchCriterion) {
  const value = criterion.value.trim()
  const stringFilter = buildStringFilter(criterion.operator, value)

  switch (criterion.fieldId) {
    case 'account-id':
      return stringFilter ? { accountId: stringFilter } : null
    case 'account-number':
      return stringFilter ? { accountNumber: stringFilter } : null
    case 'name':
      return stringFilter ? { name: stringFilter } : null
    case 'description':
      return stringFilter === '' ? { OR: [{ description: null }, { description: '' }] } : stringFilter ? { description: stringFilter } : null
    case 'type':
      if (criterion.operator === 'isEmpty' || criterion.operator === 'isNotEmpty') return null
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { accountType: value } } : { accountType: value }
    case 'account-category':
      if (criterion.operator === 'isEmpty') return { category: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { category: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { category: value } } : { category: value }
    case 'normal-balance':
      if (criterion.operator === 'isEmpty') return { normalBalance: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { normalBalance: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { normalBalance: value } } : { normalBalance: value }
    case 'fs-section':
      return stringFilter === '' ? { OR: [{ financialStatementSection: null }, { financialStatementSection: '' }] } : stringFilter ? { financialStatementSection: stringFilter } : null
    case 'fs-group':
      return stringFilter === '' ? { OR: [{ financialStatementGroup: null }, { financialStatementGroup: '' }] } : stringFilter ? { financialStatementGroup: stringFilter } : null
    case 'fs-category':
      if (criterion.operator === 'isEmpty') return { financialStatementCategory: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { financialStatementCategory: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { financialStatementCategory: value } } : { financialStatementCategory: value }
    case 'account-role':
      if (criterion.operator === 'isEmpty') return { accountRole: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { accountRole: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { accountRole: value } } : { accountRole: value }
    case 'rollforward-category':
      if (criterion.operator === 'isEmpty') return { rollforwardCategory: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { rollforwardCategory: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { rollforwardCategory: value } } : { rollforwardCategory: value }
    case 'parent-account':
      if (criterion.operator === 'isEmpty') return { parentAccountId: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { parentAccountId: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { parentAccountId: value } } : { parentAccountId: value }
    case 'posting':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { isPosting: buildBooleanFilter(criterion.operator, value) }
    case 'control':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { isControlAccount: buildBooleanFilter(criterion.operator, value) }
    case 'inventory':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { inventory: buildBooleanFilter(criterion.operator, value) }
    case 'revalue-open-balance':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { revalueOpenBalance: buildBooleanFilter(criterion.operator, value) }
    case 'monetary-classification':
      if (criterion.operator === 'isEmpty') return { monetaryClassification: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { monetaryClassification: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { monetaryClassification: value } } : { monetaryClassification: value }
    case 'translation-treatment':
      if (criterion.operator === 'isEmpty') return { translationTreatment: null }
      if (criterion.operator === 'isNotEmpty') return { NOT: { translationTreatment: null } }
      if (!value) return null
      return criterion.operator === 'isNot' ? { NOT: { translationTreatment: value } } : { translationTreatment: value }
    case 'summary':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { summary: buildBooleanFilter(criterion.operator, value) }
    case 'subsidiaries':
      if (!value) return null
      if (criterion.operator === 'isEmpty') {
        return { AND: [{ parentSubsidiaryId: null }, { subsidiaryAssignments: { none: {} } }] }
      }
      if (criterion.operator === 'isNotEmpty') {
        return { OR: [{ parentSubsidiaryId: { not: null } }, { subsidiaryAssignments: { some: {} } }] }
      }
      if (criterion.operator === 'isNot') {
        return {
          AND: [
            { parentSubsidiaryId: { not: value } },
            { subsidiaryAssignments: { none: { subsidiaryId: value } } },
          ],
        }
      }
      return {
        OR: [
          { parentSubsidiaryId: value },
          { subsidiaryAssignments: { some: { subsidiaryId: value } } },
        ],
      }
    case 'include-children':
      return buildBooleanFilter(criterion.operator, value) === null ? null : { includeChildren: buildBooleanFilter(criterion.operator, value) }
    case 'active':
      if (criterion.operator === 'isEmpty' || criterion.operator === 'isNotEmpty') return null
      if (value !== 'true' && value !== 'false') return null
      return criterion.operator === 'isNot'
        ? { NOT: { active: value === 'true' } }
        : { active: value === 'true' }
    case 'db-id':
      return stringFilter ? { id: stringFilter } : null
    case 'created':
      return buildDateFilter('createdAt', criterion.operator, value)
    case 'last-modified':
      return buildDateFilter('updatedAt', criterion.operator, value)
    default:
      return null
  }
}

function buildCriteriaWhere(criteria: SavedSearchCriterion[]) {
  const validRows = criteria
    .map((criterion) => ({
      criterion,
      condition: buildChartOfAccountsCriterionCondition(criterion),
    }))
    .filter((entry): entry is { criterion: SavedSearchCriterion; condition: NonNullable<ReturnType<typeof buildChartOfAccountsCriterionCondition>> } => Boolean(entry.condition))

  if (validRows.length === 0) return null

  const infix: Array<'(' | ')' | 'and' | 'or' | Record<string, unknown>> = []

  validRows.forEach(({ criterion, condition }, index) => {
    if (index > 0) infix.push(criterion.joiner)
    for (let count = 0; count < criterion.openParens; count += 1) infix.push('(')
    infix.push(condition)
    for (let count = 0; count < criterion.closeParens; count += 1) infix.push(')')
  })

  const output: Array<'and' | 'or' | Record<string, unknown>> = []
  const operators: Array<'(' | 'and' | 'or'> = []
  const precedence = { or: 1, and: 2 }

  for (const token of infix) {
    if (token === '(') {
      operators.push(token)
      continue
    }
    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as 'and' | 'or')
      }
      if (operators[operators.length - 1] === '(') operators.pop()
      continue
    }
    if (token === 'and' || token === 'or') {
      while (
        operators.length > 0
        && operators[operators.length - 1] !== '('
        && precedence[operators[operators.length - 1] as 'and' | 'or'] >= precedence[token]
      ) {
        output.push(operators.pop() as 'and' | 'or')
      }
      operators.push(token)
      continue
    }
    output.push(token)
  }

  while (operators.length > 0) {
    const operator = operators.pop()
    if (operator && operator !== '(') output.push(operator)
  }

  const stack: Record<string, unknown>[] = []
  for (const token of output) {
    if (token === 'and' || token === 'or') {
      const right = stack.pop()
      const left = stack.pop()
      if (!left || !right) continue
      stack.push(token === 'and' ? { AND: [left, right] } : { OR: [left, right] })
      continue
    }
    stack.push(token)
  }

  return stack[0] ?? null
}

export default async function ChartOfAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; view?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)
  const canInlineEdit = isAdminRole(session?.user?.role)
  const selectedViewId = (params.view ?? '').trim()
  const defaultViewUserId = session?.user?.id ?? null
  const savedDefinition = sanitizeSavedSearchDefinitionState(
    await loadEffectiveSavedSearchDefinition({
      tableId: chartOfAccountsListDefinition.tableId,
      userId: defaultViewUserId,
      selectedViewId,
    }),
  )
  const query = (params.q ?? savedDefinition.filterValues.keyword ?? '').trim()
  const sort = params.sort ?? savedDefinition.filterValues.sort ?? DEFAULT_RECORD_LIST_SORT
  const fieldMetaById = Object.fromEntries(
    CHART_OF_ACCOUNTS_FORM_FIELDS.map((field) => [field.id, field])
  ) as Record<(typeof CHART_OF_ACCOUNTS_FORM_FIELDS)[number]['id'], (typeof CHART_OF_ACCOUNTS_FORM_FIELDS)[number]>

  const keywordWhere = query
    ? {
        OR: [
          { accountId: { contains: query, mode: 'insensitive' as const } },
          { accountNumber: { contains: query, mode: 'insensitive' as const } },
          { name: { contains: query, mode: 'insensitive' as const } },
          { accountType: { contains: query, mode: 'insensitive' as const } },
          { category: { contains: query, mode: 'insensitive' as const } },
          { accountRole: { contains: query, mode: 'insensitive' as const } },
          { rollforwardCategory: { contains: query, mode: 'insensitive' as const } },
          { financialStatementCategory: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : null
  const criteriaWhere = buildCriteriaWhere(savedDefinition.criteria)
  const whereParts = [keywordWhere, criteriaWhere].filter(Boolean)
  const where = whereParts.length > 1 ? { AND: whereParts } : whereParts[0] ?? {}

  const total = await prisma.chartOfAccounts.count({ where })
  const pagination = getPagination(total, params.page)

  const [accounts, accountOptions, accountTypeOptions, normalBalanceOptions, financialStatementCategoryOptions, accountRoleOptions, rollforwardCategoryOptions, monetaryClassificationOptions, translationTreatmentOptions, companyLogoPages, subsidiaries] = await Promise.all([
    prisma.chartOfAccounts.findMany({
      where,
      include: {
        parentAccount: { select: { id: true, accountId: true, accountNumber: true, name: true } },
        parentSubsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        subsidiaryAssignments: {
          include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
      },
      orderBy:
        sort === 'id'
          ? [{ accountId: 'asc' as const }, { accountNumber: 'asc' as const }, { createdAt: 'desc' as const }]
          : sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.chartOfAccounts.findMany({ orderBy: [{ accountId: 'asc' }, { accountNumber: 'asc' }], select: { id: true, accountId: true, accountNumber: true, name: true } }),
    loadListOptionsForSource(fieldMetaById.accountType),
    loadListOptionsForSource(fieldMetaById.normalBalance),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-COA-FS-CATEGORY' }),
    loadListOptionsForSource(fieldMetaById.accountRole),
    loadListOptionsForSource(fieldMetaById.rollforwardCategory),
    loadListOptionsForSource(fieldMetaById.monetaryClassification),
    loadListOptionsForSource(fieldMetaById.translationTreatment),
    loadCompanyPageLogo(),
    prisma.subsidiary.findMany({ orderBy: [{ subsidiaryId: 'asc' }, { name: 'asc' }], select: { id: true, subsidiaryId: true, name: true } }),
  ])
  const accountCategoryOptions = Array.from(
    new Map(
      GL_ACCOUNT_CATEGORY_POLICIES.map((policy) => [
        policy.category,
        { value: policy.category, label: policy.category },
      ]),
    ).values(),
  )
  const chartOfAccountsSavedSearchFields = buildChartOfAccountsSavedSearchFields({
    accountTypeOptions,
    accountCategoryOptions,
    normalBalanceOptions,
    financialStatementCategoryOptions: financialStatementCategoryOptions,
    accountRoleOptions,
    rollforwardCategoryOptions,
    monetaryClassificationOptions,
    translationTreatmentOptions,
    parentAccountOptions: accountOptions.map((option) => ({
      value: option.id,
      label: `${option.accountId} - ${option.accountNumber} - ${option.name}`,
    })),
    subsidiaryOptions: subsidiaries.map((subsidiary) => ({
      value: subsidiary.id,
      label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
    })),
  })

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (query) search.set('q', query)
    if (sort) search.set('sort', sort)
    if (selectedViewId) search.set('view', selectedViewId)
    search.set('page', String(nextPage))
    return `/chart-of-accounts?${search.toString()}`
  }

  const inlineRows: ChartOfAccountsInlineRow[] = accounts.map((account) => ({
    id: account.id,
    accountId: account.accountId,
    accountNumber: account.accountNumber,
    name: account.name,
    description: account.description ?? '',
    accountType: account.accountType,
    category: account.category ?? '',
    normalBalance: account.normalBalance ?? '',
    financialStatementSection: account.financialStatementSection ?? '',
    financialStatementGroup: account.financialStatementGroup ?? '',
    financialStatementCategory: account.financialStatementCategory ?? '',
    accountRole: account.accountRole ?? '',
    rollforwardCategory: account.rollforwardCategory ?? '',
    parentAccountLabel: account.parentAccount ? `${account.parentAccount.accountId} - ${account.parentAccount.name}` : '-',
    parentAccountId: account.parentAccountId ?? '',
    isPosting: account.isPosting,
    isControlAccount: account.isControlAccount,
    allowsManualPosting: account.allowsManualPosting,
    requiresSubledgerType: account.requiresSubledgerType ?? '',
    cashFlowCategory: account.cashFlowCategory ?? '',
    inventory: account.inventory,
    revalueOpenBalance: account.revalueOpenBalance,
    monetaryClassificationLabel: monetaryClassificationLabel(account.monetaryClassification),
    monetaryClassification: account.monetaryClassification ?? '',
    translationTreatmentLabel: translationTreatmentLabel(account.translationTreatment),
    translationTreatment: account.translationTreatment ?? '',
    eliminateIntercoTransactions: account.eliminateIntercoTransactions,
    summary: account.summary,
    subsidiariesLabel: account.parentSubsidiary
      ? account.parentSubsidiary.subsidiaryId
      : account.subsidiaryAssignments.length > 0
        ? account.subsidiaryAssignments.map((entry) => entry.subsidiary.subsidiaryId).join(', ')
        : '-',
    includeChildren: account.includeChildren,
    active: account.active,
    dbId: account.id,
    created: formatMasterDataDate(account.createdAt),
    lastModified: formatMasterDataDate(account.updatedAt),
    closeToAccountId: account.closeToAccountId ?? '',
  }))

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Chart of Accounts"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <Link
            href="/chart-of-accounts/new"
            className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            <span className="mr-1.5 text-lg leading-none">+</span>
            New Account
          </Link>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={chartOfAccountsListDefinition.searchPlaceholder}
        tableId={chartOfAccountsListDefinition.tableId}
        exportFileName={chartOfAccountsListDefinition.exportFileName}
        exportAllUrl={buildMasterDataExportUrl('chart-of-accounts', query, sort, selectedViewId ? { view: selectedViewId } : undefined)}
        columns={chartOfAccountsListDefinition.columns}
        sort={sort}
        sortOptions={chartOfAccountsListDefinition.sortOptions}
        listTitle="Chart of Accounts"
        basePath="/chart-of-accounts"
        filterDefinitions={CHART_OF_ACCOUNTS_SAVED_SEARCH_FILTERS}
        criteriaFields={chartOfAccountsSavedSearchFields}
        resultFields={chartOfAccountsSavedSearchFields}
      >
        <ChartOfAccountsInlineEditTable
          rows={inlineRows}
          accountOptions={accountOptions}
          accountTypeOptions={accountTypeOptions}
          accountCategoryOptions={accountCategoryOptions}
          normalBalanceOptions={normalBalanceOptions}
          financialStatementCategoryOptions={financialStatementCategoryOptions}
          accountRoleOptions={accountRoleOptions}
          rollforwardCategoryOptions={rollforwardCategoryOptions}
          monetaryClassificationOptions={monetaryClassificationOptions}
          translationTreatmentOptions={translationTreatmentOptions}
          allowInlineEdit={canInlineEdit}
        />
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={total}
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
