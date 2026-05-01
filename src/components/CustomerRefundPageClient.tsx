'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionActionStack from '@/components/TransactionActionStack'
import RecordHeaderDetails, { type RecordHeaderField } from '@/components/RecordHeaderDetails'

type Option = { value: string; label: string }

type RefundSourceOption = {
  id: string
  customerId: string
  customerName: string
  receiptNumber: string
  availableAmount: number
}

const sectionDescriptions: Record<string, string> = {
  'Document Identity': 'Core customer refund identifiers and source overpayment linkage.',
  'Refund Terms': 'Refund amount, bank account, payment method, and lifecycle status.',
  'System Dates': 'System-managed timestamps for this customer refund.',
}

export default function CustomerRefundPageClient({
  mode,
  refundId,
  customers,
  refundSources,
  bankAccountOptions,
  methodOptions,
  statusOptions,
  initialHeaderValues,
}: {
  mode: 'create' | 'edit'
  refundId?: string
  customers: Option[]
  refundSources: RefundSourceOption[]
  bankAccountOptions: Option[]
  methodOptions: Option[]
  statusOptions: Option[]
  initialHeaderValues?: Partial<Record<string, string>>
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    id: initialHeaderValues?.id ?? '',
    number: initialHeaderValues?.number ?? '',
    customerId: initialHeaderValues?.customerId ?? customers[0]?.value ?? '',
    cashReceiptId: initialHeaderValues?.cashReceiptId ?? '',
    bankAccountId: initialHeaderValues?.bankAccountId ?? bankAccountOptions[0]?.value ?? '',
    amount: initialHeaderValues?.amount ?? '',
    date: initialHeaderValues?.date ?? new Date().toISOString().slice(0, 10),
    method: initialHeaderValues?.method ?? methodOptions[0]?.value ?? '',
    reference: initialHeaderValues?.reference ?? '',
    notes: initialHeaderValues?.notes ?? '',
    status: initialHeaderValues?.status ?? statusOptions[0]?.value ?? 'draft',
    createdAt: initialHeaderValues?.createdAt ?? '',
    createdAtDisplay: initialHeaderValues?.createdAtDisplay ?? '',
    updatedAt: initialHeaderValues?.updatedAt ?? '',
    updatedAtDisplay: initialHeaderValues?.updatedAtDisplay ?? '',
  })

  const selectedCustomerId = headerValues.customerId ?? ''
  const filteredSources = useMemo(
    () => refundSources.filter((source) => source.customerId === selectedCustomerId),
    [refundSources, selectedCustomerId],
  )
  const sourceOptions = filteredSources.map((source) => ({
    value: source.id,
    label: `${source.receiptNumber} - ${source.customerName} - Available ${source.availableAmount.toFixed(2)}`,
  }))
  const selectedSource = filteredSources.find((source) => source.id === (headerValues.cashReceiptId ?? '')) ?? null
  const previousSourceIdRef = useRef(headerValues.cashReceiptId ?? '')

  useEffect(() => {
    const previousSourceId = previousSourceIdRef.current
    const previousSource = filteredSources.find((source) => source.id === previousSourceId) ?? null
    const previousAutoAmount = previousSource ? previousSource.availableAmount.toFixed(2) : ''
    const nextAutoAmount = selectedSource ? selectedSource.availableAmount.toFixed(2) : ''

    previousSourceIdRef.current = headerValues.cashReceiptId ?? ''

    if (!selectedSource) return

    setHeaderValues((current) => {
      if ((current.cashReceiptId ?? '') !== selectedSource.id) return current

      const nextValues = { ...current }
      let changed = false

      if (!current.amount || current.amount === previousAutoAmount) {
        nextValues.amount = nextAutoAmount
        changed = true
      }

      if (!current.customerId && selectedSource.customerId) {
        nextValues.customerId = selectedSource.customerId
        changed = true
      }

      return changed ? nextValues : current
    })
  }, [filteredSources, headerValues.cashReceiptId, selectedSource])

  const sections = [
    {
      title: 'Document Identity',
      description: sectionDescriptions['Document Identity'],
      rows: 1,
      fields: [
        {
          key: 'number',
          label: 'Customer Refund Id',
          value: headerValues.number || '',
          displayValue: headerValues.number || 'Auto-generated on save',
          fieldType: 'text',
          helpText: 'Unique identifier for this customer refund.',
        } satisfies RecordHeaderField,
        {
          key: 'customerId',
          label: 'Customer',
          value: headerValues.customerId ?? '',
          displayValue: customers.find((option) => option.value === (headerValues.customerId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: customers,
          fieldType: 'list',
          helpText: 'Customer receiving the refund.',
        } satisfies RecordHeaderField,
        {
          key: 'cashReceiptId',
          label: 'Refund Source',
          value: headerValues.cashReceiptId ?? '',
          displayValue: sourceOptions.find((option) => option.value === (headerValues.cashReceiptId ?? ''))?.label ?? 'Standalone customer refund',
          editable: true,
          type: 'select',
          options: [{ value: '', label: 'Standalone customer refund' }, ...sourceOptions],
          fieldType: 'list',
          helpText: 'Select a refund-pending invoice receipt overpayment, or leave blank for a standalone refund.',
        } satisfies RecordHeaderField,
      ],
    },
    {
      title: 'Refund Terms',
      description: sectionDescriptions['Refund Terms'],
      rows: 2,
      fields: [
        {
          key: 'bankAccountId',
          label: 'Bank Account',
          value: headerValues.bankAccountId ?? '',
          displayValue: bankAccountOptions.find((option) => option.value === (headerValues.bankAccountId ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: bankAccountOptions,
          fieldType: 'list',
          helpText: 'Cash or bank account used for the refund disbursement.',
        } satisfies RecordHeaderField,
        {
          key: 'amount',
          label: 'Amount',
          value: headerValues.amount ?? '',
          displayValue: headerValues.amount || '-',
          editable: true,
          type: 'number',
          fieldType: 'currency',
          helpText: selectedSource
            ? `Available refundable balance on the selected source is ${selectedSource.availableAmount.toFixed(2)}.`
            : 'Refund amount.',
        } satisfies RecordHeaderField,
        {
          key: 'date',
          label: 'Refund Date',
          value: headerValues.date ?? '',
          displayValue: headerValues.date || '-',
          editable: true,
          type: 'date',
          fieldType: 'date',
          helpText: 'Date the refund is issued.',
        } satisfies RecordHeaderField,
        {
          key: 'method',
          label: 'Method',
          value: headerValues.method ?? '',
          displayValue: methodOptions.find((option) => option.value === (headerValues.method ?? ''))?.label ?? '-',
          editable: true,
          type: 'select',
          options: methodOptions,
          fieldType: 'list',
          helpText: 'Disbursement method for the refund.',
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
          helpText: 'Processed refunds post to GL and reduce cash.',
        } satisfies RecordHeaderField,
        {
          key: 'reference',
          label: 'Reference',
          value: headerValues.reference ?? '',
          displayValue: headerValues.reference || '-',
          editable: true,
          type: 'text',
          fieldType: 'text',
          helpText: 'Reference or memo for this refund.',
        } satisfies RecordHeaderField,
        {
          key: 'notes',
          label: 'Notes',
          value: headerValues.notes ?? '',
          displayValue: headerValues.notes || '-',
          editable: true,
          type: 'text',
          fieldType: 'text',
          helpText: 'Internal notes for this refund.',
        } satisfies RecordHeaderField,
      ],
    },
    {
      title: 'System Dates',
      description: sectionDescriptions['System Dates'],
      rows: 1,
      fields: [
        {
          key: 'createdAt',
          label: 'Created',
          value: headerValues.createdAt ?? '',
          displayValue: headerValues.createdAtDisplay || (mode === 'create' ? 'Set on save' : '-'),
          fieldType: 'date',
          helpText: 'Date/time the refund was created.',
        } satisfies RecordHeaderField,
        {
          key: 'updatedAt',
          label: 'Last Modified',
          value: headerValues.updatedAt ?? '',
          displayValue: headerValues.updatedAtDisplay || (mode === 'create' ? 'Set on save' : '-'),
          fieldType: 'date',
          helpText: 'Date/time the refund was last modified.',
        } satisfies RecordHeaderField,
      ],
    },
  ]

  async function handleSubmit(values: Record<string, string>) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(mode === 'create' ? '/api/customer-refunds' : `/api/customer-refunds?id=${encodeURIComponent(refundId ?? '')}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: values.customerId,
          cashReceiptId: values.cashReceiptId || null,
          bankAccountId: values.bankAccountId || null,
          amount: values.amount,
          date: values.date,
          method: values.method,
          reference: values.reference || null,
          notes: values.notes || null,
          status: values.status,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string }
      if (!response.ok) {
        setError(body.error ?? `Error ${mode === 'create' ? 'creating' : 'updating'} customer refund`)
        return { ok: false, error: body.error ?? `Error ${mode === 'create' ? 'creating' : 'updating'} customer refund` }
      }

      router.push(`/customer-refunds/${body.id ?? refundId}`)
      router.refresh()
      return { ok: true }
    } catch {
      const nextError = `Error ${mode === 'create' ? 'creating' : 'updating'} customer refund`
      setError(nextError)
      return { ok: false, error: nextError }
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecordDetailPageShell
      backHref={mode === 'create' ? '/customer-refunds' : `/customer-refunds/${refundId}`}
      backLabel={mode === 'create' ? '<- Back to Customer Refunds' : '<- Back to Customer Refund'}
      meta={mode === 'create' ? 'New' : (headerValues.number || refundId || 'Refund')}
      title={mode === 'create' ? 'New Customer Refund' : `Customer Refund ${headerValues.number || ''}`}
      widthClassName="w-full max-w-none"
      actions={<TransactionActionStack mode={mode === 'create' ? 'create' : 'edit'} cancelHref={mode === 'create' ? '/customer-refunds' : `/customer-refunds/${refundId}`} formId={`customer-refund-form-${mode}`} />}
    >
      <RecordHeaderDetails
        editing
        sections={sections}
        columns={3}
        containerTitle="Customer Refund Details"
        containerDescription="Customer refund, overpayment source, and disbursement details."
        showSubsections={false}
        formId={`customer-refund-form-${mode}`}
        submitMode="controlled"
        onSubmit={handleSubmit}
        onValuesChange={setHeaderValues}
      />
      {error ? <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
      {saving ? <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>Saving...</p> : null}
    </RecordDetailPageShell>
  )
}
