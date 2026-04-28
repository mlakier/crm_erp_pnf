'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TransactionHeaderSections, { type TransactionHeaderField } from '@/components/TransactionHeaderSections'
import TransactionLineItemsSection from '@/components/TransactionLineItemsSection'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionActionStack from '@/components/TransactionActionStack'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import { fmtCurrency } from '@/lib/format'
import { sumMoney } from '@/lib/money'
import {
  OPPORTUNITY_DETAIL_FIELDS,
  OPPORTUNITY_LINE_COLUMNS,
  type OpportunityDetailCustomizationConfig,
  type OpportunityDetailFieldKey,
} from '@/lib/opportunity-detail-customization'
import { opportunityPageConfig } from '@/lib/transaction-page-configs/opportunity'
import {
  buildConfiguredTransactionSections,
  getOrderedVisibleTransactionLineColumns,
} from '@/lib/transaction-detail-helpers'
import { applyRequirementsToEditableFields, useFormRequirementsState } from '@/lib/form-requirements-client'

type ItemOption = { id: string; name: string; listPrice: number; itemId: string | null }
type CustomerOption = {
  id: string
  customerId: string | null
  name: string
  email: string | null
  phone: string | null
  subsidiary: { id: string; subsidiaryId: string; name: string } | null
  currency: { id: string; currencyId: string; code: string | null; name: string } | null
}
type UserOption = {
  id: string
  userId: string | null
  name: string | null
  email: string
}
type DraftLine = {
  itemId: string | null
  description: string
  notes?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  displayOrder: number
}
type InitialLineItem = {
  itemId: string | null
  description: string
  quantity: number
  unitPrice: number
  notes: string | null
  lineTotal?: number
}
type OpportunityCreateHeaderField = TransactionHeaderField & { key: OpportunityDetailFieldKey }

function formatStage(stage: string | null) {
  if (!stage) return 'Unknown'
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}

export default function OpportunityCreatePageClient({
  users,
  customers,
  items,
  stageOptions,
  subsidiaries,
  currencies,
  customization,
  initialValues,
}: {
  users: UserOption[]
  customers: CustomerOption[]
  items: ItemOption[]
  stageOptions: Array<{ value: string; label: string }>
  subsidiaries: Array<{ id: string; subsidiaryId: string; name: string }>
  currencies: Array<{ id: string; currencyId: string; code: string | null; name: string }>
  customization: OpportunityDetailCustomizationConfig
  initialValues?: {
    name?: string
    amount?: string
    stage?: string
    closeDate?: string
    customerId?: string
    probability?: string
    subsidiaryId?: string
    currencyId?: string
    lineItems?: InitialLineItem[]
  }
}) {
  const router = useRouter()
  const { req, isLocked } = useFormRequirementsState('opportunityCreate')
  const defaultUser = users[0] ?? null
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    id: '',
    customerId: initialValues?.customerId ?? '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    userId: defaultUser?.id ?? '',
    opportunityNumber: '',
    name: initialValues?.name ?? '',
    stage: initialValues?.stage ?? stageOptions[0]?.value ?? 'prospecting',
    amount: initialValues?.amount ?? '',
    closeDate: initialValues?.closeDate ?? '',
    probability: initialValues?.probability ?? '',
    subsidiaryId: initialValues?.subsidiaryId ?? '',
    currencyId: initialValues?.currencyId ?? '',
    quoteNumber: '',
    inactive: 'No',
    createdAt: '',
    updatedAt: '',
  })
  const [draftLines, setDraftLines] = useState<DraftLine[]>(
    (initialValues?.lineItems ?? []).map((line, index) => ({
      itemId: line.itemId,
      description: line.description,
      notes: line.notes,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal ?? line.quantity * line.unitPrice,
      displayOrder: index,
    })),
  )
  const [error, setError] = useState('')

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === (headerValues.customerId ?? '')) ?? null,
    [customers, headerValues.customerId],
  )
  const selectedUser = useMemo(
    () => users.find((user) => user.id === (headerValues.userId ?? '')) ?? null,
    [headerValues.userId, users],
  )

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.customerId ?? 'CUSTOMER'} - ${customer.name}`,
  }))
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.userId && user.name ? `${user.userId} - ${user.name}` : user.userId ?? user.name ?? user.email,
  }))
  const subsidiaryOptions = subsidiaries.map((subsidiary) => ({
    value: subsidiary.id,
    label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
  }))
  const currencyOptions = currencies.map((currency) => ({
    value: currency.id,
    label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
  }))

  const computedLineTotal = useMemo(() => sumMoney(draftLines.map((line) => line.lineTotal)), [draftLines])
  const effectiveAmount = draftLines.length > 0 ? computedLineTotal : Number(headerValues.amount || 0)
  const headerFieldDefinitions: Record<OpportunityDetailFieldKey, OpportunityCreateHeaderField> = {
    id: {
      key: 'id',
      label: 'DB Id',
      value: headerValues.id,
      displayValue: 'Generated on save',
      helpText: 'Internal database identifier for the opportunity record.',
      fieldType: 'text',
    },
    customerId: {
      key: 'customerId',
      label: 'Customer Id',
      value: headerValues.customerId,
      editable: true,
      type: 'select',
      options: customerOptions,
      displayValue: selectedCustomer?.customerId ?? '-',
      helpText: 'Customer identifier linked to this opportunity.',
      fieldType: 'text',
      sourceText: 'Customers master data',
    },
    customerName: {
      key: 'customerName',
      label: 'Customer Name',
      value: selectedCustomer?.name ?? '',
      displayValue: selectedCustomer?.name ?? '-',
      helpText: 'Display name from the linked customer record.',
      fieldType: 'text',
      sourceText: 'Customers master data',
    },
    customerEmail: {
      key: 'customerEmail',
      label: 'Email',
      value: selectedCustomer?.email ?? '',
      displayValue: selectedCustomer?.email ?? '-',
      helpText: 'Primary customer email address.',
      fieldType: 'email',
      sourceText: 'Customers master data',
    },
    customerPhone: {
      key: 'customerPhone',
      label: 'Phone',
      value: selectedCustomer?.phone ?? '',
      displayValue: selectedCustomer?.phone ?? '-',
      helpText: 'Primary customer phone number.',
      fieldType: 'text',
      sourceText: 'Customers master data',
    },
    userId: {
      key: 'userId',
      label: 'User Id',
      value: headerValues.userId,
      editable: true,
      type: 'select',
      options: userOptions,
      displayValue: selectedUser?.userId ?? '-',
      helpText: 'Internal user identifier for the opportunity owner.',
      fieldType: 'text',
      sourceText: 'Users master data',
    },
    opportunityNumber: {
      key: 'opportunityNumber',
      label: 'Opportunity Id',
      value: headerValues.opportunityNumber,
      displayValue: 'Generated on save',
      editable: false,
      helpText: 'Unique identifier for the opportunity.',
      fieldType: 'text',
    },
    name: {
      key: 'name',
      label: 'Opportunity Name',
      value: headerValues.name,
      editable: true,
      type: 'text',
      helpText: 'Display name for the opportunity.',
      fieldType: 'text',
    },
    stage: {
      key: 'stage',
      label: 'Stage',
      value: headerValues.stage,
      editable: true,
      type: 'select',
      options: stageOptions,
      displayValue: stageOptions.find((option) => option.value === headerValues.stage)?.label ?? formatStage(headerValues.stage),
      helpText: 'Current lifecycle stage of the opportunity.',
      fieldType: 'list',
      sourceText: 'Opportunity stage list',
    },
    amount: {
      key: 'amount',
      label: 'Amount',
      value: draftLines.length > 0 ? String(effectiveAmount) : headerValues.amount,
      displayValue: fmtCurrency(effectiveAmount),
      editable: draftLines.length === 0,
      type: 'number',
      helpText: 'Current estimated amount or total of the opportunity.',
      fieldType: 'currency',
    },
    closeDate: {
      key: 'closeDate',
      label: 'Close Date',
      value: headerValues.closeDate,
      editable: true,
      type: 'date',
      helpText: 'Expected close date for the opportunity.',
      fieldType: 'date',
    },
    probability: {
      key: 'probability',
      label: 'Probability',
      value: headerValues.probability,
      editable: true,
      type: 'number',
      displayValue: headerValues.probability ? `${headerValues.probability}%` : '-',
      helpText: 'Forecast probability percentage for the opportunity.',
      fieldType: 'number',
    },
    subsidiaryId: {
      key: 'subsidiaryId',
      label: 'Subsidiary',
      value: headerValues.subsidiaryId,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaryOptions],
      displayValue: subsidiaries.find((subsidiary) => subsidiary.id === headerValues.subsidiaryId)
        ? `${subsidiaries.find((subsidiary) => subsidiary.id === headerValues.subsidiaryId)?.subsidiaryId} - ${subsidiaries.find((subsidiary) => subsidiary.id === headerValues.subsidiaryId)?.name}`
        : '-',
      helpText: 'Owning subsidiary for the opportunity.',
      fieldType: 'list',
      sourceText: 'Subsidiaries master data',
    },
    currencyId: {
      key: 'currencyId',
      label: 'Currency',
      value: headerValues.currencyId,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...currencyOptions],
      displayValue: currencies.find((currency) => currency.id === headerValues.currencyId)
        ? `${currencies.find((currency) => currency.id === headerValues.currencyId)?.code ?? currencies.find((currency) => currency.id === headerValues.currencyId)?.currencyId} - ${currencies.find((currency) => currency.id === headerValues.currencyId)?.name}`
        : '-',
      helpText: 'Transaction currency for the opportunity.',
      fieldType: 'list',
      sourceText: 'Currencies master data',
    },
    quoteNumber: {
      key: 'quoteNumber',
      label: 'Quote',
      value: '',
      displayValue: '-',
      helpText: 'Quote generated from this opportunity.',
      fieldType: 'text',
      sourceText: 'Quote transaction',
    },
    inactive: {
      key: 'inactive',
      label: 'Inactive',
      value: 'No',
      displayValue: 'No',
      helpText: 'Whether the opportunity is inactive.',
      fieldType: 'boolean',
    },
    createdAt: {
      key: 'createdAt',
      label: 'Created',
      value: headerValues.createdAt,
      displayValue: 'Generated on save',
      helpText: 'Date/time the opportunity record was created.',
      fieldType: 'date',
    },
    updatedAt: {
      key: 'updatedAt',
      label: 'Last Modified',
      value: headerValues.updatedAt,
      displayValue: 'Generated on save',
      helpText: 'Date/time the opportunity record was last modified.',
      fieldType: 'date',
    },
  }
  applyRequirementsToEditableFields(headerFieldDefinitions, req, isLocked)


  const headerSections = buildConfiguredTransactionSections({
    fields: OPPORTUNITY_DETAIL_FIELDS,
    layout: customization,
    fieldDefinitions: headerFieldDefinitions,
    sectionDescriptions: opportunityPageConfig.sectionDescriptions,
  })
  const visibleLineColumns = getOrderedVisibleTransactionLineColumns(OPPORTUNITY_LINE_COLUMNS, customization)

  async function handleSubmit(values: Record<string, string>) {
    setError('')

    const response = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        amount: draftLines.length > 0 ? effectiveAmount : values.amount,
        stage: values.stage,
        closeDate: values.closeDate || null,
        customerId: values.customerId,
        userId: values.userId || defaultUser?.id,
        probability: values.probability || null,
        subsidiaryId: values.subsidiaryId || null,
        currencyId: values.currencyId || null,
        lineItems: draftLines,
      }),
    })

    const body = await response.json()
    if (!response.ok) {
      const nextError = body?.error || 'Unable to create opportunity'
      setError(nextError)
      return { ok: false, error: nextError }
    }

    router.push(`/opportunities/${body.id}`)
    return { ok: true }
  }

  return (
    <RecordDetailPageShell
      backHref="/opportunities"
      backLabel="<- Back to Opportunities"
      meta="New"
      title={headerValues.name || (initialValues ? 'Duplicate Opportunity' : 'Opportunity')}
      badge={
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            Opportunity
          </span>
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}
          >
            Draft
          </span>
        </div>
      }
      widthClassName="w-full max-w-none"
      actions={<TransactionActionStack mode="create" cancelHref="/opportunities" formId="create-opportunity-form" />}
    >
      <div className="mb-8">
        <TransactionStatsRow
          record={{
            amount: effectiveAmount,
            closeDate: headerValues.closeDate ? new Date(headerValues.closeDate) : null,
            lineCount: draftLines.length,
            quoteNumber: null,
            quoteHref: null,
            stageLabel: stageOptions.find((option) => option.value === headerValues.stage)?.label ?? formatStage(headerValues.stage),
            stageTone:
              headerValues.stage === 'won'
                ? 'green'
                : headerValues.stage === 'lost'
                  ? 'red'
                  : headerValues.stage === 'negotiation'
                    ? 'yellow'
                    : headerValues.stage === 'qualification' || headerValues.stage === 'qualified'
                      ? 'accent'
                      : 'default',
          }}
          stats={opportunityPageConfig.stats}
          visibleStatCards={customization.statCards}
        />
      </div>

      <TransactionHeaderSections
        editing
        sections={headerSections}
        columns={customization.formColumns}
        formId="create-opportunity-form"
        submitMode="controlled"
        onValuesChange={(nextValues) => {
          setHeaderValues((prev) => {
            const opportunityLikeValues = {
              ...prev,
              ...nextValues,
            }
            const nextCustomer = customers.find((customer) => customer.id === opportunityLikeValues.customerId) ?? null
            return {
              ...opportunityLikeValues,
              customerName: nextCustomer?.name ?? '',
              customerEmail: nextCustomer?.email ?? '',
              customerPhone: nextCustomer?.phone ?? '',
              subsidiaryId: opportunityLikeValues.subsidiaryId || nextCustomer?.subsidiary?.id || '',
              currencyId: opportunityLikeValues.currencyId || nextCustomer?.currency?.id || '',
            }
          })
        }}
        onSubmit={handleSubmit}
      />

      {error ? (
        <p className="mb-4 text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      <TransactionLineItemsSection
        rows={[]}
        editing
        purchaseOrderId="draft-opportunity"
        userId={headerValues.userId || defaultUser?.id || 'draft-user'}
        itemOptions={items.map((item) => ({
          id: item.id,
          itemId: item.itemId ?? 'ITEM',
          name: item.name,
          unitPrice: item.listPrice,
        }))}
        lineColumns={visibleLineColumns}
        lineSettings={customization.lineSettings}
        lineColumnCustomization={customization.lineColumns}
        sectionTitle="Opportunity Line Items"
        draftMode
        onDraftRowsChange={setDraftLines}
      />
    </RecordDetailPageShell>
  )
}

