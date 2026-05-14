'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import RecordHeaderDetails, { type RecordHeaderField } from '@/components/RecordHeaderDetails'
import TransactionDetailFrame from '@/components/TransactionDetailFrame'
import { RecordDetailStatCard } from '@/components/RecordDetailPanels'
import SearchableSelect from '@/components/SearchableSelect'

type Option = { value: string; label: string }
type OpenItemOption = Option & {
  openItemNumber: string
  openItemType: string
  sourceNumber: string | null
  accountLabel: string | null
  subsidiaryId: string
  transactionCurrencyId: string
  localCurrencyId: string | null
  functionalCurrencyId: string | null
  groupCurrencyId: string | null
  counterpartyType: string | null
  counterpartyId: string | null
  postingDate?: string | null
  dueDate?: string | null
  remainingTransactionAmount: number
  remainingLocalAmount: number
  remainingFunctionalAmount: number
  remainingGroupAmount: number
}
type ClearingLineDraft = {
  key: string
  lineRole: string
  fromOpenItemId: string
  toOpenItemId: string
  transactionAmount: string
  memo: string
}

const sectionDescriptions: Record<string, string> = {
  'Document Identity': 'Core clearing document type and lifecycle state.',
  'Clearing Context': 'Business date, posting date, accounting period, and non-cash clearing amount.',
  'Source and Counterparty': 'Optional source and counterparty references for manual clearing traceability.',
  'Notes and System Dates': 'Memo and system-managed timestamps.',
}

export default function ClearingDocumentPageClient({
  mode,
  clearingDocumentId,
  subsidiaryOptions,
  currencyOptions,
  accountingPeriodOptions,
  openItemOptions,
  statusOptions,
  initialHeaderValues,
  initialLines,
}: {
  mode: 'create' | 'edit'
  clearingDocumentId?: string
  subsidiaryOptions: Option[]
  currencyOptions: Option[]
  accountingPeriodOptions: Option[]
  openItemOptions: OpenItemOption[]
  statusOptions: Option[]
  initialHeaderValues?: Partial<Record<string, string>>
  initialLines?: ClearingLineDraft[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    id: initialHeaderValues?.id ?? '',
    clearingNumber: initialHeaderValues?.clearingNumber ?? '',
    clearingType: initialHeaderValues?.clearingType ?? 'manual-clearing',
    status: initialHeaderValues?.status ?? 'draft',
    subsidiaryId: initialHeaderValues?.subsidiaryId ?? '',
    transactionCurrencyId: initialHeaderValues?.transactionCurrencyId ?? '',
    localCurrencyId: initialHeaderValues?.localCurrencyId ?? '',
    functionalCurrencyId: initialHeaderValues?.functionalCurrencyId ?? '',
    groupCurrencyId: initialHeaderValues?.groupCurrencyId ?? '',
    clearingDate: initialHeaderValues?.clearingDate ?? new Date().toISOString().slice(0, 10),
    postingDate: initialHeaderValues?.postingDate ?? '',
    accountingPeriodId: initialHeaderValues?.accountingPeriodId ?? '',
    transactionAmount: initialHeaderValues?.transactionAmount ?? '0.00',
    localAmount: initialHeaderValues?.localAmount ?? '0.00',
    functionalAmount: initialHeaderValues?.functionalAmount ?? '0.00',
    groupAmount: initialHeaderValues?.groupAmount ?? '0.00',
    sourceTransactionType: initialHeaderValues?.sourceTransactionType ?? '',
    sourceTransactionId: initialHeaderValues?.sourceTransactionId ?? '',
    counterpartyType: initialHeaderValues?.counterpartyType ?? '',
    counterpartyId: initialHeaderValues?.counterpartyId ?? '',
    memo: initialHeaderValues?.memo ?? '',
    createdAt: initialHeaderValues?.createdAt ?? '',
    createdAtDisplay: initialHeaderValues?.createdAtDisplay ?? '',
    updatedAt: initialHeaderValues?.updatedAt ?? '',
    updatedAtDisplay: initialHeaderValues?.updatedAtDisplay ?? '',
  })
  const [lines, setLines] = useState<ClearingLineDraft[]>(
    initialLines && initialLines.length > 0
      ? initialLines
      : [
          {
            key: 'line-1',
            lineRole: 'manual-settlement',
            fromOpenItemId: '',
            toOpenItemId: '',
            transactionAmount: '',
            memo: '',
          },
      ],
  )
  const openItemById = new Map(openItemOptions.map((option) => [option.value, option]))

  function amountValue(value: string) {
    const nextAmount = Number(value)
    return Number.isFinite(nextAmount) ? nextAmount : 0
  }

  function amountLabel(value: number | null | undefined) {
    return Number(value ?? 0).toFixed(2)
  }

  function signedAmountLabel(value: number | null | undefined) {
    if (value == null) return '-'
    return Number(value).toFixed(2)
  }

  function currencyLabel(value: string | null | undefined) {
    return currencyOptions.find((option) => option.value === (value ?? ''))?.label ?? '-'
  }

  function currencyCode(value: string | null | undefined) {
    const label = currencyLabel(value)
    return label === '-' ? '' : label.split(' - ')[0] ?? label
  }

  function dateOnly(value: string | null | undefined) {
    return value ? value.slice(0, 10) : ''
  }

  function maxDate(values: Array<string | null | undefined>) {
    return values
      .map(dateOnly)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .at(-1) ?? ''
  }

  function sameNullable(left: string | null | undefined, right: string | null | undefined) {
    if (!left || !right) return true
    return left === right
  }

  function getEligibleFromOptions() {
    return openItemOptions.filter((option) => {
      if (option.remainingTransactionAmount <= 0) return false
      if (headerValues.subsidiaryId && option.subsidiaryId !== headerValues.subsidiaryId) return false
      if (headerValues.transactionCurrencyId && option.transactionCurrencyId !== headerValues.transactionCurrencyId) return false
      return true
    })
  }

  function getEligibleToOptions(line: ClearingLineDraft) {
    const fromItem = openItemById.get(line.fromOpenItemId)
    return openItemOptions.filter((option) => {
      if (option.value === line.fromOpenItemId) return false
      if (option.remainingTransactionAmount <= 0) return false
      if (fromItem) {
        if (option.subsidiaryId !== fromItem.subsidiaryId) return false
        if (option.transactionCurrencyId !== fromItem.transactionCurrencyId) return false
        if (!sameNullable(option.counterpartyType, fromItem.counterpartyType)) return false
        if (!sameNullable(option.counterpartyId, fromItem.counterpartyId)) return false
      }
      if (!fromItem && headerValues.subsidiaryId && option.subsidiaryId !== headerValues.subsidiaryId) return false
      if (!fromItem && headerValues.transactionCurrencyId && option.transactionCurrencyId !== headerValues.transactionCurrencyId) return false
      return true
    })
  }

  function getSuggestedAmount(line: ClearingLineDraft) {
    const fromItem = openItemById.get(line.fromOpenItemId)
    const toItem = openItemById.get(line.toOpenItemId)
    const fromRemaining = fromItem?.remainingTransactionAmount ?? 0
    const toRemaining = toItem?.remainingTransactionAmount ?? fromRemaining
    const nextAmount = Math.min(fromRemaining, toRemaining)
    return nextAmount > 0 ? nextAmount.toFixed(2) : ''
  }

  function validateLine(line: ClearingLineDraft) {
    const fromItem = openItemById.get(line.fromOpenItemId)
    const toItem = openItemById.get(line.toOpenItemId)
    const errors: string[] = []
    const warnings: string[] = []
    const amount = amountValue(line.transactionAmount)
    const hasInput = Boolean(line.fromOpenItemId || line.toOpenItemId || line.transactionAmount || line.memo)

    if (!hasInput) {
      return { hasInput, errors, warnings, fromItem, toItem, amount }
    }
    if (!fromItem) errors.push('Choose a source open item.')
    if (!toItem) errors.push('Choose a target open item.')
    if (fromItem && toItem && fromItem.value === toItem.value) errors.push('Source and target must be different open items.')
    if (fromItem && toItem && fromItem.subsidiaryId !== toItem.subsidiaryId) errors.push('Source and target subsidiaries do not match.')
    if (fromItem && toItem && fromItem.transactionCurrencyId !== toItem.transactionCurrencyId) errors.push('Source and target currencies do not match.')
    if (fromItem && toItem && !sameNullable(fromItem.counterpartyType, toItem.counterpartyType)) {
      errors.push('Source and target counterparty types do not match.')
    }
    if (fromItem && toItem && !sameNullable(fromItem.counterpartyId, toItem.counterpartyId)) {
      errors.push('Source and target counterparties do not match.')
    }
    if (amount <= 0) errors.push('Enter a positive clearing amount.')
    if (fromItem && amount > fromItem.remainingTransactionAmount) {
      errors.push(`Amount exceeds source remaining balance ${amountLabel(fromItem.remainingTransactionAmount)}.`)
    }
    if (toItem && amount > toItem.remainingTransactionAmount) {
      errors.push(`Amount exceeds target remaining balance ${amountLabel(toItem.remainingTransactionAmount)}.`)
    }
    if (fromItem && !headerValues.subsidiaryId) warnings.push('Header subsidiary will be sourced from the selected open item.')
    if (fromItem && !headerValues.transactionCurrencyId) warnings.push('Header currency will be sourced from the selected open item.')
    return { hasInput, errors, warnings, fromItem, toItem, amount }
  }

  function getEarliestAllowedPostingDate() {
    return maxDate(
      lines.flatMap((line) => {
        const fromItem = openItemById.get(line.fromOpenItemId)
        const toItem = openItemById.get(line.toOpenItemId)
        return [
          fromItem?.postingDate,
          toItem?.postingDate,
        ]
      }),
    )
  }

  function prorateLayerAmount(
    layerAmount: number | null | undefined,
    item: OpenItemOption | null | undefined,
    transactionAmount: number,
  ) {
    if (!item || layerAmount == null) return null
    const remainingTransactionAmount = Math.abs(item.remainingTransactionAmount)
    if (remainingTransactionAmount <= 0) return null
    return Number(layerAmount) * (transactionAmount / remainingTransactionAmount)
  }

  function formatLayerAmount(amount: number | null | undefined, currencyId: string | null | undefined) {
    if (amount == null) return '-'
    const code = currencyCode(currencyId)
    return `${code ? `${code} ` : ''}${signedAmountLabel(amount)}`
  }

  function buildPreviewRows() {
    return lines.flatMap((line, index) => {
      const fromItem = openItemById.get(line.fromOpenItemId)
      const toItem = openItemById.get(line.toOpenItemId)
      const amount = amountValue(line.transactionAmount)
      if (amount <= 0 || (!fromItem && !toItem)) return []

      const sourceLocal = prorateLayerAmount(fromItem?.remainingLocalAmount, fromItem, amount)
      const sourceFunctional = prorateLayerAmount(fromItem?.remainingFunctionalAmount, fromItem, amount)
      const sourceGroup = prorateLayerAmount(fromItem?.remainingGroupAmount, fromItem, amount)
      const targetLocal = prorateLayerAmount(toItem?.remainingLocalAmount, toItem, amount)
      const targetFunctional = prorateLayerAmount(toItem?.remainingFunctionalAmount, toItem, amount)
      const targetGroup = prorateLayerAmount(toItem?.remainingGroupAmount, toItem, amount)
      const realizedFxLocal = sourceLocal != null && targetLocal != null ? targetLocal - sourceLocal : null
      const realizedFxFunctional =
        sourceFunctional != null && targetFunctional != null ? targetFunctional - sourceFunctional : null
      const realizedFxGroup = sourceGroup != null && targetGroup != null ? targetGroup - sourceGroup : null

      return [
        {
          key: `${line.key}-source`,
          lineNumber: index * 2 + 1,
          role: 'Source',
          item: fromItem,
          fromOpenItem: fromItem?.sourceNumber ?? fromItem?.openItemNumber ?? '-',
          fromAccount: fromItem?.accountLabel ?? null,
          toOpenItem: '-',
          toAccount: null,
          transactionAmount: amount,
          localAmount: sourceLocal,
          functionalAmount: sourceFunctional,
          groupAmount: sourceGroup,
          realizedFxLocal: realizedFxLocal == null ? null : 0,
          realizedFxFunctional: realizedFxFunctional == null ? null : 0,
          realizedFxGroup: realizedFxGroup == null ? null : 0,
        },
        {
          key: `${line.key}-target`,
          lineNumber: index * 2 + 2,
          role: 'Target',
          item: toItem,
          fromOpenItem: '-',
          fromAccount: null,
          toOpenItem: toItem?.sourceNumber ?? toItem?.openItemNumber ?? '-',
          toAccount: toItem?.accountLabel ?? null,
          transactionAmount: -amount,
          localAmount: targetLocal == null ? null : -targetLocal,
          functionalAmount: targetFunctional == null ? null : -targetFunctional,
          groupAmount: targetGroup == null ? null : -targetGroup,
          realizedFxLocal,
          realizedFxFunctional,
          realizedFxGroup,
        },
      ]
    })
  }

  const sections = [
    {
      title: 'Document Identity',
      description: sectionDescriptions['Document Identity'],
      rows: 1,
      fields: [
        {
          key: 'clearingNumber',
          label: 'Business Id',
          value: headerValues.clearingNumber ?? '',
          displayValue: headerValues.clearingNumber || 'Auto-generated on save',
          fieldType: 'text',
          helpText: 'Internal operational identifier for this manual clearing document.',
        } satisfies RecordHeaderField,
        {
          key: 'clearingType',
          label: 'Clearing Type',
          value: headerValues.clearingType ?? '',
          displayValue:
            [
              { value: 'manual-clearing', label: 'Manual Clearing' },
              { value: 'manual-reclass', label: 'Manual Reclass' },
              { value: 'manual-adjustment', label: 'Manual Adjustment' },
            ].find((option) => option.value === (headerValues.clearingType ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [
            { value: 'manual-clearing', label: 'Manual Clearing' },
            { value: 'manual-reclass', label: 'Manual Reclass' },
            { value: 'manual-adjustment', label: 'Manual Adjustment' },
          ],
          fieldType: 'list',
          helpText: 'Business pattern for the manual clearing transaction.',
        } satisfies RecordHeaderField,
        {
          key: 'status',
          label: 'Status',
          value: headerValues.status ?? '',
          displayValue: statusOptions.find((option) => option.value === (headerValues.status ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: statusOptions,
          fieldType: 'list',
          helpText: 'Manual lifecycle state. Draft, Pending Approval, and Approved are supported in this first pass.',
        } satisfies RecordHeaderField,
      ],
    },
    {
      title: 'Clearing Context',
      description: sectionDescriptions['Clearing Context'],
      rows: 3,
      fields: [
        {
          key: 'subsidiaryId',
          label: 'Subsidiary',
          value: headerValues.subsidiaryId ?? '',
          displayValue: subsidiaryOptions.find((option) => option.value === (headerValues.subsidiaryId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...subsidiaryOptions],
          fieldType: 'list',
          helpText: 'Subsidiary/legal-entity context for this manual clearing transaction.',
        } satisfies RecordHeaderField,
        {
          key: 'clearingDate',
          label: 'Clearing Date',
          value: headerValues.clearingDate ?? '',
          displayValue: headerValues.clearingDate || '-',
          editable: true,
          type: 'date',
          fieldType: 'date',
          helpText: 'Business date for this manual clearing document.',
        } satisfies RecordHeaderField,
        {
          key: 'postingDate',
          label: 'Posting Date',
          value: headerValues.postingDate ?? '',
          displayValue: headerValues.postingDate || '-',
          editable: true,
          type: 'date',
          fieldType: 'date',
          helpText: 'Optional posting date reserved for later posting workflow.',
        } satisfies RecordHeaderField,
        {
          key: 'accountingPeriodId',
          label: 'Accounting Period',
          value: headerValues.accountingPeriodId ?? '',
          displayValue: accountingPeriodOptions.find((option) => option.value === (headerValues.accountingPeriodId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...accountingPeriodOptions],
          fieldType: 'list',
          helpText: 'Optional accounting period for this manual clearing document.',
        } satisfies RecordHeaderField,
        {
          key: 'transactionAmount',
          label: 'Transaction Amount',
          value: headerValues.transactionAmount ?? '',
          displayValue: headerValues.transactionAmount || '-',
          editable: true,
          type: 'number',
          fieldType: 'currency',
          helpText: 'Amount in transaction currency.',
        } satisfies RecordHeaderField,
        {
          key: 'transactionCurrencyId',
          label: 'Transaction Currency',
          value: headerValues.transactionCurrencyId ?? '',
          displayValue: currencyOptions.find((option) => option.value === (headerValues.transactionCurrencyId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...currencyOptions],
          fieldType: 'list',
          helpText: 'Currency used to offset the selected open items. Cash receipt/payment settlement belongs in bank matching.',
        } satisfies RecordHeaderField,
        {
          key: 'localAmount',
          label: 'Local Amount',
          value: headerValues.localAmount ?? '',
          displayValue: headerValues.localAmount || '-',
          editable: true,
          type: 'number',
          fieldType: 'currency',
          helpText: 'Amount in statutory/local currency.',
        } satisfies RecordHeaderField,
        {
          key: 'localCurrencyId',
          label: 'Local Currency',
          value: headerValues.localCurrencyId ?? '',
          displayValue: currencyOptions.find((option) => option.value === (headerValues.localCurrencyId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...currencyOptions],
          fieldType: 'list',
          helpText: 'Statutory or company-code currency.',
        } satisfies RecordHeaderField,
        {
          key: 'functionalAmount',
          label: 'Functional Amount',
          value: headerValues.functionalAmount ?? '',
          displayValue: headerValues.functionalAmount || '-',
          editable: true,
          type: 'number',
          fieldType: 'currency',
          helpText: 'Amount in functional currency.',
        } satisfies RecordHeaderField,
        {
          key: 'functionalCurrencyId',
          label: 'Functional Currency',
          value: headerValues.functionalCurrencyId ?? '',
          displayValue: currencyOptions.find((option) => option.value === (headerValues.functionalCurrencyId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...currencyOptions],
          fieldType: 'list',
          helpText: 'Primary economic-environment currency of the entity.',
        } satisfies RecordHeaderField,
        {
          key: 'groupAmount',
          label: 'Group Amount',
          value: headerValues.groupAmount ?? '',
          displayValue: headerValues.groupAmount || '-',
          editable: true,
          type: 'number',
          fieldType: 'currency',
          helpText: 'Amount in group/reporting currency.',
        } satisfies RecordHeaderField,
        {
          key: 'groupCurrencyId',
          label: 'Group Currency',
          value: headerValues.groupCurrencyId ?? '',
          displayValue: currencyOptions.find((option) => option.value === (headerValues.groupCurrencyId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'None' }, ...currencyOptions],
          fieldType: 'list',
          helpText: 'Consolidated group/reporting currency.',
        } satisfies RecordHeaderField,
      ],
    },
    {
      title: 'Source and Counterparty',
      description: sectionDescriptions['Source and Counterparty'],
      rows: 2,
      fields: [
        {
          key: 'sourceTransactionType',
          label: 'Source Transaction Type',
          value: headerValues.sourceTransactionType ?? '',
          displayValue:
            [
              { value: '', label: 'None' },
              { value: 'invoice-receipt', label: 'Invoice Receipt' },
              { value: 'bill-payment', label: 'Bill Payment' },
              { value: 'customer-refund', label: 'Customer Refund' },
              { value: 'journal-entry', label: 'Journal Entry' },
              { value: 'open-item-clearing-workbench', label: 'Open Item Clearing Workbench' },
            ].find((option) => option.value === (headerValues.sourceTransactionType ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [
            { value: '', label: 'None' },
            { value: 'invoice-receipt', label: 'Invoice Receipt' },
            { value: 'bill-payment', label: 'Bill Payment' },
            { value: 'customer-refund', label: 'Customer Refund' },
            { value: 'journal-entry', label: 'Journal Entry' },
            { value: 'open-item-clearing-workbench', label: 'Open Item Clearing Workbench' },
          ],
          fieldType: 'list',
          helpText: 'Optional source transaction family linked to this manual clearing document.',
        } satisfies RecordHeaderField,
        {
          key: 'sourceTransactionId',
          label: 'Source Transaction DB Id',
          value: headerValues.sourceTransactionId ?? '',
          displayValue: headerValues.sourceTransactionId || '-',
          editable: true,
          type: 'text',
          fieldType: 'text',
          helpText: 'Optional source transaction database identifier for traceability.',
        } satisfies RecordHeaderField,
        {
          key: 'counterpartyType',
          label: 'Counterparty Type',
          value: headerValues.counterpartyType ?? '',
          displayValue:
            [
              { value: '', label: 'None' },
              { value: 'customer', label: 'Customer' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'employee', label: 'Employee' },
            ].find((option) => option.value === (headerValues.counterpartyType ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: [
            { value: '', label: 'None' },
            { value: 'customer', label: 'Customer' },
            { value: 'vendor', label: 'Vendor' },
            { value: 'employee', label: 'Employee' },
          ],
          fieldType: 'list',
          helpText: 'Optional counterparty family for manual clearing context.',
        } satisfies RecordHeaderField,
        {
          key: 'counterpartyId',
          label: 'Counterparty DB Id',
          value: headerValues.counterpartyId ?? '',
          displayValue: headerValues.counterpartyId || '-',
          editable: true,
          type: 'text',
          fieldType: 'text',
          helpText: 'Optional counterparty database identifier for traceability.',
        } satisfies RecordHeaderField,
      ],
    },
    {
      title: 'Notes and System Dates',
      description: sectionDescriptions['Notes and System Dates'],
      rows: 2,
      fields: [
        {
          key: 'memo',
          label: 'Memo',
          value: headerValues.memo ?? '',
          displayValue: headerValues.memo || '-',
          editable: true,
          type: 'text',
          fieldType: 'text',
          helpText: 'Internal memo for this manual clearing document.',
        } satisfies RecordHeaderField,
        {
          key: 'createdAt',
          label: 'Created',
          value: headerValues.createdAt ?? '',
          displayValue: headerValues.createdAtDisplay || (mode === 'create' ? 'Set on save' : '-'),
          fieldType: 'date',
          helpText: 'Date/time the clearing document was created.',
        } satisfies RecordHeaderField,
        {
          key: 'updatedAt',
          label: 'Last Modified',
          value: headerValues.updatedAt ?? '',
          displayValue: headerValues.updatedAtDisplay || (mode === 'create' ? 'Set on save' : '-'),
          fieldType: 'date',
          helpText: 'Date/time the clearing document was last modified.',
        } satisfies RecordHeaderField,
      ],
    },
  ]

  async function handleSubmit(values: Record<string, string>) {
    const earliestAllowedPostingDate = getEarliestAllowedPostingDate()
    const requestedPostingDate = values.postingDate || values.clearingDate
    if (earliestAllowedPostingDate && requestedPostingDate && requestedPostingDate < earliestAllowedPostingDate) {
      const nextError = `Posting date cannot be earlier than selected source or target open item dates. Use ${earliestAllowedPostingDate} or later.`
      setError(nextError)
      return { ok: false, error: nextError }
    }

    const invalidLine = lines
      .map((line, index) => ({ line, index, validation: validateLine(line) }))
      .find((line) => line.validation.hasInput && line.validation.errors.length > 0)
    if (invalidLine) {
      const nextError = `Fix clearing line ${invalidLine.index + 1}: ${invalidLine.validation.errors[0]}`
      setError(nextError)
      return { ok: false, error: nextError }
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        mode === 'create'
          ? '/api/clearing-documents'
          : `/api/clearing-documents?id=${encodeURIComponent(clearingDocumentId ?? '')}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            lines,
          }),
        },
      )

      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string }
      if (!response.ok || !body.id) {
        const nextError = body.error ?? `Error ${mode === 'create' ? 'creating' : 'saving'} clearing document`
        setError(nextError)
        return { ok: false, error: nextError }
      }

      router.push(`/clearing-documents/${body.id}`)
      return { ok: true }
    } catch {
      const nextError = `Error ${mode === 'create' ? 'creating' : 'saving'} clearing document`
      setError(nextError)
      return { ok: false, error: nextError }
    } finally {
      setSaving(false)
    }
  }

  function saveDraft() {
    const nextValues = mode === 'create' ? { ...headerValues, status: 'draft' } : headerValues
    return handleSubmit(nextValues)
  }

  function submitForApproval() {
    return handleSubmit({ ...headerValues, status: 'pending approval' })
  }

  const detailHref = clearingDocumentId ? `/clearing-documents/${clearingDocumentId}` : '/clearing-documents'
  const lineTotal = lines.reduce((sum, line) => sum + (Number(line.transactionAmount || 0) || 0), 0)

  function updateLine(lineKey: string, field: keyof ClearingLineDraft, nextValue: string) {
    setLines((current) =>
      current.map((line) => (line.key === lineKey ? { ...line, [field]: nextValue } : line)),
    )
  }

  function updateLineSelection(lineKey: string, field: 'fromOpenItemId' | 'toOpenItemId', nextValue: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== lineKey) return line
        const nextLine = { ...line, [field]: nextValue }
        if (field === 'fromOpenItemId') {
          const fromItem = openItemById.get(nextValue)
          const toItem = openItemById.get(nextLine.toOpenItemId)
          if (toItem && fromItem && !getEligibleToOptions({ ...nextLine, fromOpenItemId: nextValue }).some((option) => option.value === toItem.value)) {
            nextLine.toOpenItemId = ''
          }
          if (!nextLine.transactionAmount) {
            nextLine.transactionAmount = getSuggestedAmount(nextLine)
          }
        }
        if (field === 'toOpenItemId' && !nextLine.transactionAmount) {
          nextLine.transactionAmount = getSuggestedAmount(nextLine)
        }
        return nextLine
      }),
    )

    if (field === 'fromOpenItemId') {
      const fromItem = openItemById.get(nextValue)
      if (fromItem) {
        setHeaderValues((current) => ({
          ...current,
          subsidiaryId: current.subsidiaryId || fromItem.subsidiaryId,
          transactionCurrencyId: current.transactionCurrencyId || fromItem.transactionCurrencyId,
          counterpartyType: current.counterpartyType || fromItem.counterpartyType || '',
          counterpartyId: current.counterpartyId || fromItem.counterpartyId || '',
        }))
      }
    }
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        key: `line-${Date.now()}-${current.length + 1}`,
        lineRole: 'manual-settlement',
        fromOpenItemId: '',
        toOpenItemId: '',
        transactionAmount: '',
        memo: '',
      },
    ])
  }

  function removeLine(lineKey: string) {
    setLines((current) =>
      current.length > 1
        ? current.filter((line) => line.key !== lineKey)
        : [
            {
              key: 'line-1',
              lineRole: 'manual-settlement',
              fromOpenItemId: '',
              toOpenItemId: '',
              transactionAmount: '',
              memo: '',
            },
          ],
    )
  }

  function applySuggestedAmount(lineKey: string) {
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey ? { ...line, transactionAmount: getSuggestedAmount(line) } : line,
      ),
    )
  }

  const fromOptions = getEligibleFromOptions()
  const lineValidations = lines.map((line) => validateLine(line))
  const validLineCount = lineValidations.filter((validation) => validation.hasInput && validation.errors.length === 0).length
  const invalidLineCount = lineValidations.filter((validation) => validation.hasInput && validation.errors.length > 0).length
  const previewRows = buildPreviewRows()
  const currencyReadoutSections = [
    {
      title: 'Currency Layers',
      description: 'Preview the transaction, local, functional, and group layers before the clearing document is saved.',
      rows: 2,
      fields: [
        {
          key: 'previewTransactionAmount',
          label: 'Transaction Amount',
          value: headerValues.transactionAmount,
          displayValue: `${currencyLabel(headerValues.transactionCurrencyId)} ${amountLabel(amountValue(headerValues.transactionAmount))}`,
          fieldType: 'currency',
        } satisfies RecordHeaderField,
        {
          key: 'previewLocalAmount',
          label: 'Local Amount',
          value: headerValues.localAmount,
          displayValue: `${currencyLabel(headerValues.localCurrencyId)} ${amountLabel(amountValue(headerValues.localAmount))}`,
          fieldType: 'currency',
        } satisfies RecordHeaderField,
        {
          key: 'previewFunctionalAmount',
          label: 'Functional Amount',
          value: headerValues.functionalAmount,
          displayValue: `${currencyLabel(headerValues.functionalCurrencyId)} ${amountLabel(amountValue(headerValues.functionalAmount))}`,
          fieldType: 'currency',
        } satisfies RecordHeaderField,
        {
          key: 'previewGroupAmount',
          label: 'Group Amount',
          value: headerValues.groupAmount,
          displayValue: `${currencyLabel(headerValues.groupCurrencyId)} ${amountLabel(amountValue(headerValues.groupAmount))}`,
          fieldType: 'currency',
        } satisfies RecordHeaderField,
      ],
    },
  ]
  const workflowSummarySections = [
    {
      title: 'Workflow Summary',
      description: 'Drafts can be saved without posting. Submit for Approval moves this document into the journal-style approval queue.',
      rows: 1,
      fields: [
        {
          key: 'workflowStatusPreview',
          label: 'Current Status',
          value: headerValues.status,
          displayValue:
            statusOptions.find((option) => option.value === headerValues.status)?.label ??
            (headerValues.status || 'Draft'),
          fieldType: 'list',
        } satisfies RecordHeaderField,
        {
          key: 'workflowNextStep',
          label: 'Next Step',
          value: '',
          displayValue: headerValues.status === 'draft' ? 'Submit for Approval' : 'Review / approve before posting',
          fieldType: 'text',
        } satisfies RecordHeaderField,
        {
          key: 'workflowPosting',
          label: 'Posting',
          value: '',
          displayValue: 'Not posted by save. Posting happens after approval.',
          fieldType: 'text',
        } satisfies RecordHeaderField,
      ],
    },
  ]

  return (
    <RecordDetailPageShell
      backHref="/clearing-documents"
      backLabel="<- Back to Clearing Documents"
      meta={mode === 'create' ? 'New' : headerValues.clearingNumber || ''}
      title={mode === 'create' ? 'New Clearing Document' : `Edit Clearing Document ${headerValues.clearingNumber || ''}`}
      widthClassName="w-full max-w-none"
      actions={
        <RecordDetailActionBar
          mode={mode === 'create' ? 'create' : 'edit'}
          detailHref={detailHref}
          onSave={() => void saveDraft()}
          saving={saving}
          saveError={error}
          saveButtonLabel={mode === 'create' ? 'Save Draft' : 'Save Changes'}
          createExtraActions={
            <button
              type="button"
              onClick={() => void submitForApproval()}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Submitting...' : 'Submit for Approval'}
            </button>
          }
          editExtraActions={
            headerValues.status === 'draft' || headerValues.status === 'pending approval' ? (
              <button
                type="button"
                onClick={() => void submitForApproval()}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            ) : null
          }
        />
      }
    >
      <TransactionDetailFrame
        showFooterSections={false}
        stats={
          <div className="grid gap-4 sm:grid-cols-4">
            <RecordDetailStatCard label="Status" value={statusOptions.find((option) => option.value === headerValues.status)?.label ?? 'Draft'} cardTone={headerValues.status === 'draft' ? 'gray' : 'green'} valueTone={headerValues.status === 'draft' ? 'gray' : 'green'} />
            <RecordDetailStatCard label="Transaction Amount" value={amountLabel(amountValue(headerValues.transactionAmount || String(lineTotal)))} accent />
            <RecordDetailStatCard label="Valid Lines" value={validLineCount} cardTone={invalidLineCount > 0 ? 'red' : 'green'} valueTone={invalidLineCount > 0 ? 'red' : 'green'} />
            <RecordDetailStatCard label="Posting Date" value={headerValues.postingDate || headerValues.clearingDate || '-'} />
          </div>
        }
        header={
          <div className="space-y-6">
            <RecordHeaderDetails
              editing={false}
              sections={workflowSummarySections}
              columns={3}
              containerTitle="How To Read This Clearing"
              containerDescription="This draft mirrors the posted clearing document view so approval and posting intent are visible before save."
              showSubsections={false}
            />
            <RecordHeaderDetails
              editing={false}
              sections={currencyReadoutSections}
              columns={3}
              containerTitle="4-Currency Context"
              containerDescription="Read the transaction, local, functional, and group layers without assuming untranslated amounts exist."
              showSubsections={false}
            />
            <RecordHeaderDetails
              editing
              sections={sections}
              columns={2}
              containerTitle="Clearing Document Details"
              containerDescription="Non-cash open-item offset, source, counterparty, and traceability fields for this manual clearing document."
              showSubsections={false}
              formId={mode === 'create' ? 'create-clearing-document-form' : `edit-clearing-document-form-${clearingDocumentId}`}
              submitMode="controlled"
              onSubmit={handleSubmit}
              onValuesChange={setHeaderValues}
            />
          </div>
        }
        lineItems={
          <>
      <div className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <h2 className="text-base font-semibold text-white">Clearing Workbench</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Select the open item being relieved first. Targets are filtered to the same subsidiary, transaction currency, and counterparty before the backend posts the non-cash offset.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            Add Line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>From Open Item</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>To Open Item</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Preview</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Memo</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const validation = lineValidations[index]
                return (
                <tr key={line.key} style={index < lines.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}>
                  <td className="px-3 py-2">
                    <SearchableSelect
                      selectedValue={line.lineRole}
                      options={[
                        { value: 'manual-settlement', label: 'Manual Open-Item Offset' },
                        { value: 'manual-reclass', label: 'Manual Reclass' },
                        { value: 'manual-adjustment', label: 'Manual Adjustment' },
                      ]}
                      placeholder="Select role"
                      searchPlaceholder="Search role"
                      sortMode="label"
                      textClassName="text-sm"
                      dropdownWidthMode="trigger"
                      onSelect={(value) => updateLine(line.key, 'lineRole', value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SearchableSelect
                      selectedValue={line.fromOpenItemId}
                      options={fromOptions}
                      placeholder="None"
                      searchPlaceholder="Search from open item"
                      sortMode="label"
                      textClassName="text-sm"
                      dropdownWidthMode="trigger"
                      onSelect={(value) => updateLineSelection(line.key, 'fromOpenItemId', value)}
                    />
                    {validation?.fromItem ? (
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Remaining {amountLabel(validation.fromItem.remainingTransactionAmount)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <SearchableSelect
                      selectedValue={line.toOpenItemId}
                      options={getEligibleToOptions(line)}
                      placeholder={line.fromOpenItemId ? 'Eligible targets' : 'Pick source first'}
                      searchPlaceholder="Search to open item"
                      sortMode="label"
                      textClassName="text-sm"
                      dropdownWidthMode="trigger"
                      onSelect={(value) => updateLineSelection(line.key, 'toOpenItemId', value)}
                    />
                    {validation?.toItem ? (
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Remaining {amountLabel(validation.toItem.remainingTransactionAmount)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.transactionAmount}
                        onChange={(event) => updateLine(line.key, 'transactionAmount', event.target.value)}
                        className="w-28 rounded-md border bg-transparent px-2 py-1.5 text-right text-sm text-white"
                        style={{ borderColor: 'var(--border-muted)' }}
                      />
                      <button
                        type="button"
                        onClick={() => applySuggestedAmount(line.key)}
                        className="rounded-md border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Max
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {validation?.hasInput ? (
                      validation.errors.length > 0 ? (
                        <div className="max-w-xs rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                          {validation.errors[0]}
                        </div>
                      ) : (
                        <div className="max-w-xs rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                          Eligible to clear {amountLabel(validation.amount)}
                        </div>
                      )
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Waiting for selection</span>
                    )}
                    {validation?.warnings[0] ? (
                      <p className="mt-1 text-xs" style={{ color: 'var(--warning)' }}>{validation.warnings[0]}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.memo}
                      onChange={(event) => updateLine(line.key, 'memo', event.target.value)}
                      className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                      style={{ borderColor: 'var(--border-muted)' }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="rounded-md border px-2 py-1 text-xs font-medium"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
          Draft line total: {lineTotal.toFixed(2)}
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Clearing Lines</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Line-level linkage to open items, non-cash applications, and source transactions.
              </p>
            </div>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}>
              {previewRows.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {[
                  'Line',
                  'Role',
                  'From Open Item',
                  'To Open Item',
                  'Amount',
                  'Local Amount',
                  'Functional Amount',
                  'Group Amount',
                  'Realized FX Local',
                  'Realized FX Functional',
                  'Realized FX Group',
                ].map((column) => (
                  <th
                    key={column}
                    className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wide ${
                      ['Amount', 'Local Amount', 'Functional Amount', 'Group Amount', 'Realized FX Local', 'Realized FX Functional', 'Realized FX Group'].includes(column)
                        ? 'text-right'
                        : ''
                    }`}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Select a from item, to item, and amount to preview clearing lines.
                  </td>
                </tr>
              ) : (
                previewRows.map((row, index) => {
                  const transactionCurrencyId = row.item?.transactionCurrencyId ?? headerValues.transactionCurrencyId
                  const localCurrencyId = row.item?.localCurrencyId ?? headerValues.localCurrencyId
                  const functionalCurrencyId = row.item?.functionalCurrencyId ?? headerValues.functionalCurrencyId
                  const groupCurrencyId = row.item?.groupCurrencyId ?? headerValues.groupCurrencyId
                  return (
                    <tr key={row.key} style={index < previewRows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{row.lineNumber}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{row.role}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                        <div>{row.fromOpenItem}</div>
                        {row.fromAccount ? (
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            Account: {row.fromAccount}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                        <div>{row.toOpenItem}</div>
                        {row.toAccount ? (
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            Account: {row.toAccount}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.transactionAmount, transactionCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.localAmount, localCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.functionalAmount, functionalCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.groupAmount, groupCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.realizedFxLocal, localCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.realizedFxFunctional, functionalCurrencyId)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{formatLayerAmount(row.realizedFxGroup, groupCurrencyId)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
        Manual draft clearing is live for non-cash offsets, netting, reclasses, and write-off style applications. Normal bank receipts and vendor payments should be posted from bank matching instead.
      </div>
      {error ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
      {saving ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Saving...
        </p>
      ) : null}
          </>
        }
      />
    </RecordDetailPageShell>
  )
}
