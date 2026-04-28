'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionActionStack from '@/components/TransactionActionStack'
import TransactionHeaderSections, { type TransactionHeaderField } from '@/components/TransactionHeaderSections'
import { buildConfiguredTransactionSections } from '@/lib/transaction-detail-helpers'
import { applyRequirementsToEditableFields, useFormRequirementsState } from '@/lib/form-requirements-client'
import {
  BILL_PAYMENT_DETAIL_FIELDS,
  type BillPaymentDetailCustomizationConfig,
  type BillPaymentDetailFieldKey,
} from '@/lib/bill-payment-detail-customization'

type BillOption = {
  id: string
  number: string
  vendorName: string
}

type Option = { value: string; label: string }

type BillPaymentHeaderField = {
  key: BillPaymentDetailFieldKey
} & TransactionHeaderField

const sectionDescriptions: Record<string, string> = {
  'Document Identity': 'Core bill payment identifiers and source-bill context.',
  'Payment Terms': 'Amount, timing, method, status, and payment notes.',
  'Record Keys': 'Internal and linked transaction identifiers for this bill payment.',
  'System Dates': 'System-managed timestamps for this bill payment.',
}

export default function BillPaymentCreatePageClient({
  bills,
  methodOptions,
  statusOptions,
  customization,
  initialHeaderValues,
}: {
  bills: BillOption[]
  methodOptions: Option[]
  statusOptions: Option[]
  customization: BillPaymentDetailCustomizationConfig
  initialHeaderValues?: Partial<Record<string, string>>
}) {
  const router = useRouter()
  const { req, isLocked } = useFormRequirementsState('billPaymentCreate')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    billId: initialHeaderValues?.billId ?? bills[0]?.id ?? '',
    amount: initialHeaderValues?.amount ?? '',
    date: initialHeaderValues?.date ?? new Date().toISOString().slice(0, 10),
    method: initialHeaderValues?.method ?? methodOptions[0]?.value ?? '',
    reference: initialHeaderValues?.reference ?? '',
    status: initialHeaderValues?.status ?? statusOptions[0]?.value ?? '',
    notes: initialHeaderValues?.notes ?? '',
  })

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === (headerValues.billId ?? '')) ?? null,
    [headerValues.billId, bills],
  )

  const billOptions = bills.map((bill) => ({
    value: bill.id,
    label: `${bill.number} - ${bill.vendorName}`,
  }))

  const headerFieldDefinitions: Record<BillPaymentDetailFieldKey, BillPaymentHeaderField> = {
    id: {
      key: 'id',
      label: 'DB Id',
      value: '',
      displayValue: 'Auto-generated on save',
      helpText: 'Internal database identifier for this bill payment.',
      fieldType: 'text',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and linked transaction identifiers for this bill payment.',
    },
    number: {
      key: 'number',
      label: 'Bill Payment Id',
      value: '',
      displayValue: 'Auto-generated on save',
      helpText: 'Identifier for this bill payment.',
      fieldType: 'text',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Core bill payment identifiers and source-bill context.',
    },
    billId: {
      key: 'billId',
      label: 'Bill',
      value: headerValues.billId ?? '',
      displayValue: selectedBill?.number ?? '-',
      editable: true,
      type: 'select',
      options: billOptions,
      helpText: 'Linked bill for this payment.',
      fieldType: 'list',
      sourceText: 'Bill transaction',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Core bill payment identifiers and source-bill context.',
    },
    amount: {
      key: 'amount',
      label: 'Amount',
      value: headerValues.amount ?? '',
      displayValue: headerValues.amount || '-',
      editable: true,
      type: 'number',
      helpText: 'Payment amount applied to the bill.',
      fieldType: 'currency',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    date: {
      key: 'date',
      label: 'Date',
      value: headerValues.date ?? '',
      displayValue: headerValues.date || '-',
      editable: true,
      type: 'date',
      helpText: 'Date the bill payment was recorded.',
      fieldType: 'date',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    method: {
      key: 'method',
      label: 'Method',
      value: headerValues.method ?? '',
      displayValue: methodOptions.find((option) => option.value === (headerValues.method ?? ''))?.label ?? '-',
      editable: true,
      type: 'select',
      options: methodOptions,
      helpText: 'Payment method used for this bill payment.',
      fieldType: 'list',
      sourceText: 'Payment method list',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    reference: {
      key: 'reference',
      label: 'Reference',
      value: headerValues.reference ?? '',
      displayValue: headerValues.reference || '-',
      editable: true,
      type: 'text',
      helpText: 'Reference number or memo for this payment.',
      fieldType: 'text',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    status: {
      key: 'status',
      label: 'Status',
      value: headerValues.status ?? '',
      displayValue: statusOptions.find((option) => option.value === (headerValues.status ?? ''))?.label ?? '-',
      editable: true,
      type: 'select',
      options: statusOptions,
      helpText: 'Status of this bill payment.',
      fieldType: 'list',
      sourceText: 'Bill payment status list',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    notes: {
      key: 'notes',
      label: 'Notes',
      value: headerValues.notes ?? '',
      displayValue: headerValues.notes || '-',
      editable: true,
      type: 'text',
      helpText: 'Free-form notes for this bill payment.',
      fieldType: 'text',
      subsectionTitle: 'Payment Terms',
      subsectionDescription: 'Monetary amount, date, payment method, and status.',
    },
    createdAt: {
      key: 'createdAt',
      label: 'Created',
      value: '',
      displayValue: 'Set on save',
      helpText: 'Date/time the bill payment was created.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this bill payment.',
    },
    updatedAt: {
      key: 'updatedAt',
      label: 'Last Modified',
      value: '',
      displayValue: 'Set on save',
      helpText: 'Date/time the bill payment was last modified.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this bill payment.',
    },
  }
  applyRequirementsToEditableFields(headerFieldDefinitions, req, isLocked)


  const headerSections = buildConfiguredTransactionSections({
    fields: BILL_PAYMENT_DETAIL_FIELDS,
    layout: customization,
    fieldDefinitions: headerFieldDefinitions,
    sectionDescriptions,
  })

  async function handleSubmit(values: Record<string, string>) {
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/bill-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: values.billId,
          amount: values.amount,
          date: values.date,
          method: values.method,
          status: values.status,
          reference: values.reference || null,
          notes: values.notes || null,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string }
      if (!response.ok || !body.id) {
        setError(body.error ?? 'Error creating bill payment')
        return { ok: false, error: body.error ?? 'Error creating bill payment' }
      }

      router.push(`/bill-payments/${body.id}`)
      return { ok: true }
    } catch {
      const nextError = 'Error creating bill payment'
      setError(nextError)
      return { ok: false, error: nextError }
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecordDetailPageShell
      backHref="/bill-payments"
      backLabel="<- Back to Bill Payments"
      meta="New"
      title="New Bill Payment"
      widthClassName="w-full max-w-none"
      actions={<TransactionActionStack mode="create" cancelHref="/bill-payments" formId="create-bill-payment-form" />}
    >
      <TransactionHeaderSections
        editing
        sections={headerSections}
        columns={customization.formColumns}
        containerTitle="Bill Payment Details"
        containerDescription="Core bill payment fields organized into configurable sections."
        showSubsections={false}
        formId="create-bill-payment-form"
        submitMode="controlled"
        onSubmit={handleSubmit}
        onValuesChange={setHeaderValues}
      />
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
    </RecordDetailPageShell>
  )
}

