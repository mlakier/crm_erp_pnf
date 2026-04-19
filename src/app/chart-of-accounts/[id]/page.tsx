import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import ChartOfAccountsDetailCustomizeMode from '@/components/ChartOfAccountsDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadChartOfAccountsFormCustomization } from '@/lib/chart-of-accounts-form-customization-store'
import {
  CHART_OF_ACCOUNTS_FORM_FIELDS,
  type ChartOfAccountsFormFieldKey,
} from '@/lib/chart-of-accounts-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

async function getDescendantSubsidiaryIds(parentId: string): Promise<Set<string>> {
  const descendants = new Set<string>([parentId])
  const queue = [parentId]

  while (queue.length > 0) {
    const current = queue.shift() as string
    const children = await prisma.entity.findMany({
      where: { parentEntityId: current },
      select: { id: true },
    })

    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id)
        queue.push(child.id)
      }
    }
  }

  return descendants
}

export default async function ChartOfAccountDetailPage({
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

  const [account, chartFormCustomization, formRequirements] = await Promise.all([
    prisma.chartOfAccounts.findUnique({
      where: { id },
      include: {
        parentSubsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        parentAccount: { select: { id: true, accountId: true, name: true } },
        closeToAccount: { select: { id: true, accountId: true, name: true } },
        subsidiaryAssignments: {
          include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
      },
    }),
    loadChartOfAccountsFormCustomization(),
    loadFormRequirements(),
  ])

  if (!account) notFound()

  const subsidiaries = await prisma.entity.findMany({
    where: account.parentSubsidiaryId && account.includeChildren
      ? { id: { in: Array.from(await getDescendantSubsidiaryIds(account.parentSubsidiaryId)) } }
      : account.parentSubsidiaryId
        ? { id: account.parentSubsidiaryId }
        : { id: { in: account.subsidiaryAssignments.map((entry) => entry.subsidiaryId) } },
    select: { id: true, subsidiaryId: true, name: true },
    orderBy: { subsidiaryId: 'asc' },
  })

  const accountOptions = await prisma.chartOfAccounts.findMany({
    where: { NOT: { id } },
    orderBy: { accountId: 'asc' },
    select: { id: true, accountId: true, name: true },
  })

  const detailHref = `/chart-of-accounts/${account.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Identity and primary classification for the GL account.',
    Reporting: 'Statement mapping and reporting defaults used for financial presentation.',
    Structure: 'Rollup and relationship fields that shape how the account behaves in hierarchies and close logic.',
    Controls: 'Posting, control, inventory, and elimination behavior for operational accounting.',
  }

  const fieldDefinitions: Record<ChartOfAccountsFormFieldKey, InlineRecordSection['fields'][number]> = {
    accountId: { name: 'accountId', label: 'Account Id', value: account.accountId, helpText: 'Unique account number or code used throughout the ledger.' },
    name: { name: 'name', label: 'Name', value: account.name, helpText: 'Reporting name for the account.' },
    description: { name: 'description', label: 'Description', value: account.description ?? '', helpText: 'Longer explanation of the account purpose or usage guidance.' },
    accountType: {
      name: 'accountType',
      label: 'Account Type',
      value: account.accountType,
      type: 'select',
      options: ACCOUNT_TYPE_OPTIONS,
      helpText: 'Broad accounting classification for the account.',
      sourceText: 'System account type values',
    },
    normalBalance: {
      name: 'normalBalance',
      label: 'Normal Balance',
      value: account.normalBalance ?? '',
      type: 'select',
      options: [{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }],
      helpText: 'Default debit or credit orientation for the account.',
      sourceText: 'System balance values',
    },
    financialStatementSection: {
      name: 'financialStatementSection',
      label: 'FS Section',
      value: account.financialStatementSection ?? '',
      helpText: 'Financial statement section used for rollups and presentation.',
    },
    financialStatementGroup: {
      name: 'financialStatementGroup',
      label: 'FS Group',
      value: account.financialStatementGroup ?? '',
      helpText: 'More granular reporting group under the statement section.',
    },
    parentAccountId: {
      name: 'parentAccountId',
      label: 'Parent Account',
      value: account.parentAccountId ?? '',
      type: 'select',
      placeholder: 'Select parent account',
      options: accountOptions.map((option) => ({ value: option.id, label: `${option.accountId} - ${option.name}` })),
      helpText: 'Rollup parent for hierarchical reporting.',
      sourceText: 'Chart of Accounts master data',
    },
    closeToAccountId: {
      name: 'closeToAccountId',
      label: 'Close To Account',
      value: account.closeToAccountId ?? '',
      type: 'select',
      placeholder: 'Select close-to account',
      options: accountOptions.map((option) => ({ value: option.id, label: `${option.accountId} - ${option.name}` })),
      helpText: 'Target account used when closing temporary balances.',
      sourceText: 'Chart of Accounts master data',
    },
    isPosting: { name: 'isPosting', label: 'Posting Account', value: String(account.isPosting), type: 'checkbox', helpText: 'Controls whether journals can post directly to this account.' },
    isControlAccount: { name: 'isControlAccount', label: 'Control Account', value: String(account.isControlAccount), type: 'checkbox', helpText: 'Marks accounts managed primarily by subledgers or protected processes.' },
    allowsManualPosting: { name: 'allowsManualPosting', label: 'Allow Manual Posting', value: String(account.allowsManualPosting), type: 'checkbox', helpText: 'Determines whether users can manually post journals to this account.' },
    requiresSubledgerType: { name: 'requiresSubledgerType', label: 'Requires Subledger Type', value: account.requiresSubledgerType ?? '', helpText: 'Optional validation hint for the related subledger dimension.' },
    cashFlowCategory: { name: 'cashFlowCategory', label: 'Cash Flow Category', value: account.cashFlowCategory ?? '', helpText: 'Classification used for operating, investing, or financing cash flow reporting.' },
    inventory: { name: 'inventory', label: 'Inventory', value: String(account.inventory), type: 'checkbox', helpText: 'Flags the account as inventory-related for downstream logic and reporting.' },
    revalueOpenBalance: { name: 'revalueOpenBalance', label: 'Revalue Open Balance', value: String(account.revalueOpenBalance), type: 'checkbox', helpText: 'Controls whether open balances are revalued for FX processes.' },
    eliminateIntercoTransactions: { name: 'eliminateIntercoTransactions', label: 'Eliminate Interco Transactions', value: String(account.eliminateIntercoTransactions), type: 'checkbox', helpText: 'Marks the account for intercompany elimination handling.' },
    summary: { name: 'summary', label: 'Summary', value: String(account.summary), type: 'checkbox', helpText: 'Indicates a header or summary account rather than a direct posting account.' },
  }

  const customizeFields = CHART_OF_ACCOUNTS_FORM_FIELDS.map((field) => {
    const definition = fieldDefinitions[field.id]
    const rawValue = definition.value ?? ''
    let previewValue = rawValue
    if (definition.type === 'checkbox') {
      previewValue = rawValue === 'true' ? 'Yes' : 'No'
    } else if (definition.options) {
      previewValue = definition.options.find((option) => option.value === rawValue)?.label ?? rawValue
    }

    return {
      id: field.id,
      label: definition.label,
      fieldType: field.fieldType,
      source: field.source,
      description: field.description,
      previewValue,
    }
  })

  const detailSections: InlineRecordSection[] = chartFormCustomization.sections
    .map((sectionTitle) => {
      const configuredFields = CHART_OF_ACCOUNTS_FORM_FIELDS
        .filter((field) => {
          const config = chartFormCustomization.fields[field.id]
          return config.visible && config.section === sectionTitle
        })
        .sort((a, b) => {
          const left = chartFormCustomization.fields[a.id]
          const right = chartFormCustomization.fields[b.id]
          if (left.column !== right.column) return left.column - right.column
          return left.order - right.order
        })
        .map((field) => ({
          ...fieldDefinitions[field.id],
          column: chartFormCustomization.fields[field.id].column,
          order: chartFormCustomization.fields[field.id].order,
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
      backHref={isCustomizing ? detailHref : '/chart-of-accounts'}
      backLabel={isCustomizing ? '<- Back to Chart of Accounts Detail' : '<- Back to Chart of Accounts'}
      meta={account.accountId}
      title={account.name}
      badge={
        <span className="inline-block rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}>
          {account.accountType}
        </span>
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
          {!isCustomizing ? <DeleteButton resource="chart-of-accounts" id={account.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <ChartOfAccountsDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={chartFormCustomization}
            initialRequirements={{ ...formRequirements.chartOfAccountCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="chart-of-accounts"
            id={account.id}
            title="Account details"
            sections={detailSections}
            editing={isEditing}
            columns={chartFormCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Subsidiaries in Scope" count={subsidiaries.length}>
          {subsidiaries.length === 0 ? (
            <RecordDetailEmptyState message="No subsidiaries assigned." />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>Subsidiary Id</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {subsidiaries.map((subsidiary, index) => (
                  <tr key={subsidiary.id} style={index < subsidiaries.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <RecordDetailCell>{subsidiary.subsidiaryId}</RecordDetailCell>
                    <RecordDetailCell>{subsidiary.name}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Other', label: 'Other' },
]
