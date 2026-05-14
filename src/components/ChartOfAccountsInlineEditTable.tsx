'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import MasterDataInlineEditPortal from '@/components/MasterDataInlineEditPortal'
import ListRowActions from '@/components/ListRowActions'
import SearchableSelect from '@/components/SearchableSelect'
import {
  MasterDataBodyCell,
  MasterDataEmptyStateRow,
  MasterDataHeaderCell,
  MasterDataMutedCell,
} from '@/components/MasterDataTableCells'
import { MASTER_DATA_HEADER_CELL_STYLE, MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'

type SelectOption = {
  value: string
  label: string
}

type AccountOption = {
  id: string
  accountId: string
  accountNumber: string
  name: string
}

export type ChartOfAccountsInlineRow = {
  id: string
  accountId: string
  accountNumber: string
  name: string
  description: string
  accountType: string
  category: string
  normalBalance: string
  financialStatementSection: string
  financialStatementGroup: string
  financialStatementCategory: string
  accountRole: string
  rollforwardCategory: string
  parentAccountLabel: string
  parentAccountId: string
  isPosting: boolean
  isControlAccount: boolean
  allowsManualPosting: boolean
  requiresSubledgerType: string
  cashFlowCategory: string
  inventory: boolean
  revalueOpenBalance: boolean
  monetaryClassificationLabel: string
  monetaryClassification: string
  translationTreatmentLabel: string
  translationTreatment: string
  eliminateIntercoTransactions: boolean
  summary: boolean
  subsidiariesLabel: string
  includeChildren: boolean
  active: boolean
  dbId: string
  created: string
  lastModified: string
  closeToAccountId: string
}

type DraftValue = string | boolean
type DraftMap = Record<string, Partial<Record<EditableField, DraftValue>>>

type EditableField =
  | 'accountNumber'
  | 'name'
  | 'description'
  | 'accountType'
  | 'category'
  | 'normalBalance'
  | 'financialStatementSection'
  | 'financialStatementGroup'
  | 'financialStatementCategory'
  | 'accountRole'
  | 'rollforwardCategory'
  | 'isPosting'
  | 'isControlAccount'
  | 'allowsManualPosting'
  | 'inventory'
  | 'summary'
  | 'active'

const EDITABLE_FIELDS = new Set<string>([
  'account-number',
  'name',
  'description',
  'type',
  'account-category',
  'normal-balance',
  'fs-section',
  'fs-group',
  'fs-category',
  'account-role',
  'rollforward-category',
  'posting',
  'control',
  'inventory',
  'summary',
  'active',
])

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

const TABLE_ID = 'chart-of-accounts-list'

function booleanLabel(value: boolean) {
  return value ? 'Yes' : 'No'
}

function emptyToDash(value: string) {
  return value.trim() ? value : '-'
}

function editableCellClassName(inlineEdit: boolean, changed: boolean) {
  const base = 'min-w-32 rounded-md border px-2 py-1 text-sm text-white outline-none'
  if (!inlineEdit) return ''
  return `${base} ${changed ? 'border-amber-300/70 bg-amber-400/10' : 'border-blue-300/30 bg-blue-400/10 focus:border-blue-300'}`
}

function selectWrapperClassName(changed: boolean) {
  return `min-w-40 rounded-md border ${changed ? 'border-amber-300/70 bg-amber-400/10' : 'border-blue-300/30 bg-blue-400/10'}`
}

export default function ChartOfAccountsInlineEditTable({
  rows,
  accountOptions,
  accountTypeOptions,
  accountCategoryOptions,
  normalBalanceOptions,
  financialStatementCategoryOptions,
  accountRoleOptions,
  rollforwardCategoryOptions,
  monetaryClassificationOptions,
  translationTreatmentOptions,
  allowInlineEdit,
}: {
  rows: ChartOfAccountsInlineRow[]
  accountOptions: AccountOption[]
  accountTypeOptions: SelectOption[]
  accountCategoryOptions: SelectOption[]
  normalBalanceOptions: SelectOption[]
  financialStatementCategoryOptions: SelectOption[]
  accountRoleOptions: SelectOption[]
  rollforwardCategoryOptions: SelectOption[]
  monetaryClassificationOptions: SelectOption[]
  translationTreatmentOptions: SelectOption[]
  allowInlineEdit: boolean
}) {
  const [inlineEdit, setInlineEdit] = useState(false)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const changedRowIds = useMemo(() => Object.keys(drafts).filter((id) => Object.keys(drafts[id] ?? {}).length > 0), [drafts])

  function getValue(row: ChartOfAccountsInlineRow, field: EditableField) {
    return drafts[row.id]?.[field] ?? row[field]
  }

  function setValue(row: ChartOfAccountsInlineRow, field: EditableField, value: DraftValue) {
    setMessage('')
    setError('')
    setDrafts((current) => {
      const original = row[field]
      const nextRowDraft = { ...(current[row.id] ?? {}) }
      if (String(original) === String(value)) {
        delete nextRowDraft[field]
      } else {
        nextRowDraft[field] = value
      }

      const next = { ...current }
      if (Object.keys(nextRowDraft).length === 0) {
        delete next[row.id]
      } else {
        next[row.id] = nextRowDraft
      }
      return next
    })
  }

  function cancelInlineEdit() {
    setInlineEdit(false)
    setDrafts({})
    setError('')
    setMessage('')
  }

  async function saveChanges() {
    const payloads = changedRowIds.map((id) => ({ id, changes: drafts[id] ?? {} }))
    if (payloads.length === 0) {
      setInlineEdit(false)
      return
    }

    startTransition(async () => {
      setError('')
      setMessage('')
      try {
        for (const payload of payloads) {
          const response = await fetch(`/api/chart-of-accounts?id=${encodeURIComponent(payload.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload.changes, inlineEdit: true }),
          })
          if (!response.ok) {
            const body = await response.json().catch(() => null)
            throw new Error(body?.error ?? 'Unable to save chart account changes.')
          }
        }
        setMessage(`Saved ${payloads.length} row${payloads.length === 1 ? '' : 's'}. Refreshing...`)
        setDrafts({})
        setInlineEdit(false)
        window.location.reload()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Unable to save chart account changes.')
      }
    })
  }

  function renderTextInput(row: ChartOfAccountsInlineRow, field: EditableField, columnId: string) {
    const changed = drafts[row.id]?.[field] !== undefined
    if (!inlineEdit) return <MasterDataMutedCell columnId={columnId}>{emptyToDash(String(row[field] ?? ''))}</MasterDataMutedCell>
    return (
      <MasterDataBodyCell columnId={columnId} style={{ backgroundColor: 'rgba(59,130,246,0.06)' }}>
        <input
          value={String(getValue(row, field) ?? '')}
          onChange={(event) => setValue(row, field, event.target.value)}
          className={editableCellClassName(inlineEdit, changed)}
        />
      </MasterDataBodyCell>
    )
  }

  function renderSelectInput(row: ChartOfAccountsInlineRow, field: EditableField, columnId: string, options: SelectOption[]) {
    const changed = drafts[row.id]?.[field] !== undefined
    if (!inlineEdit) return <MasterDataMutedCell columnId={columnId}>{emptyToDash(String(row[field] ?? ''))}</MasterDataMutedCell>
    const selectedValue = String(getValue(row, field) ?? '')
    const selectedLabel = String(row[field] ?? '').trim()
    const selectOptions =
      selectedValue && !options.some((option) => option.value === selectedValue)
        ? [{ value: selectedValue, label: selectedLabel || selectedValue }, ...options]
        : options
    return (
      <MasterDataBodyCell columnId={columnId} style={{ backgroundColor: 'rgba(59,130,246,0.06)' }}>
        <div className={selectWrapperClassName(changed)}>
          <SearchableSelect
            selectedValue={selectedValue}
            options={selectOptions}
            placeholder="-- Select --"
            searchPlaceholder="Search options"
            dropdownWidthMode="trigger"
            textClassName="text-sm"
            onSelect={(value) => setValue(row, field, value)}
          />
        </div>
      </MasterDataBodyCell>
    )
  }

  function renderBooleanInput(row: ChartOfAccountsInlineRow, field: EditableField, columnId: string) {
    const changed = drafts[row.id]?.[field] !== undefined
    if (!inlineEdit) return <MasterDataMutedCell columnId={columnId}>{booleanLabel(Boolean(row[field]))}</MasterDataMutedCell>
    return (
      <MasterDataBodyCell columnId={columnId} style={{ backgroundColor: 'rgba(59,130,246,0.06)' }}>
        <div className={selectWrapperClassName(changed)}>
          <SearchableSelect
            selectedValue={String(getValue(row, field) ?? false)}
            options={BOOLEAN_OPTIONS}
            placeholder="-- Select --"
            searchPlaceholder="Search options"
            dropdownWidthMode="trigger"
            textClassName="text-sm"
            onSelect={(value) => setValue(row, field, value === 'true')}
          />
        </div>
      </MasterDataBodyCell>
    )
  }

  function header(columnId: string, label: string) {
    return (
      <MasterDataHeaderCell
        columnId={columnId}
        style={
          EDITABLE_FIELDS.has(columnId) && inlineEdit
            ? { ...MASTER_DATA_HEADER_CELL_STYLE, backgroundColor: 'rgba(59,130,246,0.12)' }
            : undefined
        }
      >
        {label}
      </MasterDataHeaderCell>
    )
  }

  return (
    <>
      <MasterDataInlineEditPortal
        tableId={TABLE_ID}
        allowInlineEdit={allowInlineEdit}
        inlineEdit={inlineEdit}
        changedCount={changedRowIds.length}
        isPending={isPending}
        message={message}
        error={error}
        onStart={() => setInlineEdit(true)}
        onCancel={cancelInlineEdit}
        onSave={saveChanges}
      />
      <div className="coa-inline-table-shell">
        <table className="min-w-full" id={TABLE_ID}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              {header('account-id', 'Account Id')}
              {header('account-number', 'Account Number')}
              {header('name', 'Name')}
              {header('description', 'Description')}
              {header('type', 'Account Type')}
              {header('account-category', 'Account Category')}
              {header('normal-balance', 'Normal Balance')}
              {header('fs-section', 'FS Section')}
              {header('fs-group', 'FS Group')}
              {header('fs-category', 'FS Category')}
              {header('account-role', 'Account Role')}
              {header('rollforward-category', 'Rollforward Category')}
              {header('parent-account', 'Parent Account')}
              {header('posting', 'Posting')}
              {header('control', 'Control')}
              {header('inventory', 'Inventory')}
              {header('revalue-open-balance', 'Remeasure Open Balance')}
              {header('monetary-classification', 'Monetary Classification')}
              {header('translation-treatment', 'Translation Treatment')}
              {header('summary', 'Summary')}
              {header('subsidiaries', 'Subsidiaries')}
              {header('include-children', 'Include Children')}
              {header('active', 'Active')}
              {header('db-id', 'DB Id')}
              {header('created', 'Created')}
              {header('last-modified', 'Last Modified')}
              {header('actions', 'Actions')}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={27}>No chart accounts found</MasterDataEmptyStateRow>
            ) : (
              rows.map((account, index) => (
                <tr key={account.id} style={getMasterDataRowStyle(index, rows.length)}>
                  <MasterDataBodyCell columnId="account-id">
                    <Link href={`/chart-of-accounts/${account.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {account.accountId}
                    </Link>
                  </MasterDataBodyCell>
                  {renderTextInput(account, 'accountNumber', 'account-number')}
                  {renderTextInput(account, 'name', 'name')}
                  {renderTextInput(account, 'description', 'description')}
                  {renderSelectInput(account, 'accountType', 'type', accountTypeOptions)}
                  {renderSelectInput(account, 'category', 'account-category', accountCategoryOptions)}
                  {renderSelectInput(account, 'normalBalance', 'normal-balance', normalBalanceOptions)}
                  {renderTextInput(account, 'financialStatementSection', 'fs-section')}
                  {renderTextInput(account, 'financialStatementGroup', 'fs-group')}
                  {renderSelectInput(account, 'financialStatementCategory', 'fs-category', financialStatementCategoryOptions)}
                  {renderSelectInput(account, 'accountRole', 'account-role', accountRoleOptions)}
                  {renderSelectInput(account, 'rollforwardCategory', 'rollforward-category', rollforwardCategoryOptions)}
                  <MasterDataMutedCell columnId="parent-account">{account.parentAccountLabel}</MasterDataMutedCell>
                  {renderBooleanInput(account, 'isPosting', 'posting')}
                  {renderBooleanInput(account, 'isControlAccount', 'control')}
                  {renderBooleanInput(account, 'inventory', 'inventory')}
                  <MasterDataMutedCell columnId="revalue-open-balance">{booleanLabel(account.revalueOpenBalance)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="monetary-classification">{account.monetaryClassificationLabel}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="translation-treatment">{account.translationTreatmentLabel}</MasterDataMutedCell>
                  {renderBooleanInput(account, 'summary', 'summary')}
                  <MasterDataMutedCell columnId="subsidiaries">{account.subsidiariesLabel}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="include-children">{booleanLabel(account.includeChildren)}</MasterDataMutedCell>
                  {renderBooleanInput(account, 'active', 'active')}
                  <MasterDataMutedCell columnId="db-id">{account.dbId}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{account.created}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{account.lastModified}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <ListRowActions
                      viewHref={`/chart-of-accounts/${account.id}`}
                      editButton={{
                        resource: 'chart-of-accounts',
                        id: account.id,
                        fields: [
                          { name: 'accountId', label: 'Account Id', value: account.accountId },
                          { name: 'accountNumber', label: 'Account Number', value: account.accountNumber },
                          { name: 'name', label: 'Name', value: account.name },
                          { name: 'description', label: 'Description', value: account.description },
                          { name: 'accountType', label: 'Account Type', value: account.accountType, type: 'select', options: accountTypeOptions },
                          { name: 'category', label: 'Account Category', value: account.category, type: 'select', options: accountCategoryOptions },
                          { name: 'normalBalance', label: 'Normal Balance', value: account.normalBalance, type: 'select', options: normalBalanceOptions },
                          { name: 'financialStatementSection', label: 'FS Section', value: account.financialStatementSection },
                          { name: 'financialStatementGroup', label: 'FS Group', value: account.financialStatementGroup },
                          { name: 'financialStatementCategory', label: 'FS Category', value: account.financialStatementCategory, type: 'select', options: financialStatementCategoryOptions },
                          { name: 'accountRole', label: 'Account Role', value: account.accountRole, type: 'select', options: accountRoleOptions },
                          { name: 'rollforwardCategory', label: 'Rollforward Category', value: account.rollforwardCategory, type: 'select', options: rollforwardCategoryOptions },
                          { name: 'isPosting', label: 'Posting Account', value: String(account.isPosting), type: 'checkbox' },
                          { name: 'isControlAccount', label: 'Control Account', value: String(account.isControlAccount), type: 'checkbox' },
                          { name: 'allowsManualPosting', label: 'Allow Manual Posting', value: String(account.allowsManualPosting), type: 'checkbox' },
                          { name: 'requiresSubledgerType', label: 'Requires Subledger Type', value: account.requiresSubledgerType },
                          { name: 'cashFlowCategory', label: 'Cash Flow Category', value: account.cashFlowCategory },
                          { name: 'inventory', label: 'Inventory', value: String(account.inventory), type: 'checkbox' },
                          { name: 'revalueOpenBalance', label: 'Remeasure Open Balance', value: String(account.revalueOpenBalance), type: 'checkbox' },
                          { name: 'monetaryClassification', label: 'Monetary Classification', value: account.monetaryClassification, type: 'select', options: monetaryClassificationOptions },
                          { name: 'translationTreatment', label: 'Translation Treatment', value: account.translationTreatment, type: 'select', options: translationTreatmentOptions },
                          { name: 'eliminateIntercoTransactions', label: 'Eliminate Interco Transactions', value: String(account.eliminateIntercoTransactions), type: 'checkbox' },
                          { name: 'summary', label: 'Summary', value: String(account.summary), type: 'checkbox' },
                          { name: 'parentAccountId', label: 'Parent Account', value: account.parentAccountId, type: 'select', placeholder: 'Select parent account', options: accountOptions.filter((option) => option.id !== account.id).map((option) => ({ value: option.id, label: `${option.accountId} - ${option.accountNumber} - ${option.name}` })) },
                          { name: 'closeToAccountId', label: 'Close To Account', value: account.closeToAccountId, type: 'select', placeholder: 'Select close-to account', options: accountOptions.filter((option) => option.id !== account.id).map((option) => ({ value: option.id, label: `${option.accountId} - ${option.accountNumber} - ${option.name}` })) },
                        ],
                      }}
                      deleteButton={{ resource: 'chart-of-accounts', id: account.id }}
                    />
                  </MasterDataBodyCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
