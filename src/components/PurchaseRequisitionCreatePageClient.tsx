'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TransactionHeaderSections, {
  type TransactionHeaderField,
  type TransactionHeaderSection,
} from '@/components/TransactionHeaderSections'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionLineItemsSection from '@/components/TransactionLineItemsSection'
import { buildConfiguredTransactionSections, getOrderedVisibleTransactionLineColumns } from '@/lib/transaction-detail-helpers'
import { applyRequirementsToEditableFields, useFormRequirementsState } from '@/lib/form-requirements-client'
import {
  PURCHASE_REQUISITION_DETAIL_FIELDS,
  PURCHASE_REQUISITION_LINE_COLUMNS,
  type PurchaseRequisitionDetailCustomizationConfig,
  type PurchaseRequisitionDetailFieldKey,
  type PurchaseRequisitionLineColumnKey,
} from '@/lib/purchase-requisitions-detail-customization'
import { purchaseRequisitionPageConfig } from '@/lib/transaction-page-configs/purchase-requisition'
import { fmtCurrency, fmtPhone } from '@/lib/format'
import { calcLineTotal, sumMoney } from '@/lib/money'

type VendorOption = {
  id: string
  vendorNumber: string | null
  name: string
  email: string | null
  phone: string | null
  taxId: string | null
  address: string | null
  inactive: boolean
  subsidiary: { id: string; subsidiaryId: string; name: string } | null
  currency: { id: string; currencyId: string; code: string; name: string } | null
}

type DepartmentOption = {
  id: string
  departmentId: string
  name: string
}

type SubsidiaryOption = {
  id: string
  subsidiaryId: string
  name: string
}

type CurrencyOption = {
  id: string
  currencyId: string
  code: string
  name: string
}

type ItemOption = {
  id: string
  itemId: string | null
  name: string
  listPrice: number | null
}

type DraftLinePayload = {
  itemId: string | null
  description: string
  notes?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  displayOrder: number
}

const REQUISITION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function PurchaseRequisitionCreatePageClient({
  nextNumber,
  userId,
  userLabel,
  vendors,
  departments,
  subsidiaries,
  currencies,
  items,
  customization,
  initialHeaderValues,
  initialDraftRows,
}: {
  nextNumber: string
  userId: string
  userLabel: string
  vendors: VendorOption[]
  departments: DepartmentOption[]
  subsidiaries: SubsidiaryOption[]
  currencies: CurrencyOption[]
  items: ItemOption[]
  customization: PurchaseRequisitionDetailCustomizationConfig
  initialHeaderValues?: Partial<Record<string, string>>
  initialDraftRows?: DraftLinePayload[]
}) {
  const router = useRouter()
  const { req, isLocked } = useFormRequirementsState('purchaseRequisitionCreate')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    number: initialHeaderValues?.number ?? nextNumber,
    status: initialHeaderValues?.status ?? 'draft',
    priority: initialHeaderValues?.priority ?? 'medium',
    title: initialHeaderValues?.title ?? '',
    description: initialHeaderValues?.description ?? '',
    neededByDate: initialHeaderValues?.neededByDate ?? '',
    notes: initialHeaderValues?.notes ?? '',
    vendorId: initialHeaderValues?.vendorId ?? '',
    departmentId: initialHeaderValues?.departmentId ?? '',
    subsidiaryId: initialHeaderValues?.subsidiaryId ?? '',
    currencyId: initialHeaderValues?.currencyId ?? '',
  })
  const [draftRows, setDraftRows] = useState<DraftLinePayload[]>(initialDraftRows ?? [])
  const [error, setError] = useState('')

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === (headerValues.vendorId ?? '')) ?? null,
    [headerValues.vendorId, vendors]
  )
  const computedTotal = useMemo(() => sumMoney(draftRows.map((row) => row.lineTotal)), [draftRows])

  const vendorOptions = vendors.map((vendor) => ({
    value: vendor.id,
    label: `${vendor.vendorNumber ?? 'VENDOR'} - ${vendor.name}`,
  }))
  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: `${department.departmentId} - ${department.name}`,
  }))
  const subsidiaryOptions = subsidiaries.map((subsidiary) => ({
    value: subsidiary.id,
    label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
  }))
  const currencyOptions = currencies.map((currency) => ({
    value: currency.id,
    label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
  }))

  const headerFieldDefinitions: Record<
    PurchaseRequisitionDetailFieldKey,
    TransactionHeaderField & { key: PurchaseRequisitionDetailFieldKey }
  > = {
    vendorName: {
      key: 'vendorName',
      label: 'Vendor Name',
      value: selectedVendor?.name ?? '',
      displayValue: selectedVendor?.name ?? '-',
      helpText: 'Display name from the linked vendor record.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
    },
    vendorNumber: {
      key: 'vendorNumber',
      label: 'Vendor #',
      value: selectedVendor?.vendorNumber ?? '',
      displayValue: selectedVendor?.vendorNumber ?? '-',
      helpText: 'Internal vendor identifier from the linked vendor record.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
    },
    vendorEmail: {
      key: 'vendorEmail',
      label: 'Email',
      value: selectedVendor?.email ?? '',
      displayValue: selectedVendor?.email ?? '-',
      helpText: 'Primary vendor email address.',
      fieldType: 'email',
      sourceText: 'Vendors master data',
    },
    vendorPhone: {
      key: 'vendorPhone',
      label: 'Phone',
      value: selectedVendor?.phone ?? '',
      displayValue: selectedVendor?.phone ? fmtPhone(selectedVendor.phone) : '-',
      helpText: 'Primary vendor phone number.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
    },
    vendorTaxId: {
      key: 'vendorTaxId',
      label: 'Tax ID',
      value: selectedVendor?.taxId ?? '',
      displayValue: selectedVendor?.taxId ?? '-',
      helpText: 'Vendor tax registration or identification number.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
    },
    vendorAddress: {
      key: 'vendorAddress',
      label: 'Address',
      value: selectedVendor?.address ?? '',
      displayValue: selectedVendor?.address ?? '-',
      helpText: 'Mailing or remittance address from the linked vendor record.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
    },
    vendorPrimarySubsidiary: {
      key: 'vendorPrimarySubsidiary',
      label: 'Primary Subsidiary',
      value: selectedVendor?.subsidiary
        ? `${selectedVendor.subsidiary.subsidiaryId} - ${selectedVendor.subsidiary.name}`
        : '',
      displayValue: selectedVendor?.subsidiary
        ? `${selectedVendor.subsidiary.subsidiaryId} - ${selectedVendor.subsidiary.name}`
        : '-',
      helpText: 'Default subsidiary context from the linked vendor record.',
      fieldType: 'list',
      sourceText: 'Vendors master data',
    },
    vendorPrimaryCurrency: {
      key: 'vendorPrimaryCurrency',
      label: 'Primary Currency',
      value: selectedVendor?.currency
        ? `${selectedVendor.currency.code ?? selectedVendor.currency.currencyId} - ${selectedVendor.currency.name}`
        : '',
      displayValue: selectedVendor?.currency
        ? `${selectedVendor.currency.code ?? selectedVendor.currency.currencyId} - ${selectedVendor.currency.name}`
        : '-',
      helpText: 'Default transaction currency from the linked vendor record.',
      fieldType: 'list',
      sourceText: 'Vendors master data',
    },
    vendorInactive: {
      key: 'vendorInactive',
      label: 'Inactive',
      value: selectedVendor ? (selectedVendor.inactive ? 'Yes' : 'No') : '',
      displayValue: selectedVendor ? (selectedVendor.inactive ? 'Yes' : 'No') : '-',
      helpText: 'Indicates whether the linked vendor is inactive for new activity.',
      fieldType: 'checkbox',
      sourceText: 'Vendors master data',
    },
    id: {
      key: 'id',
      label: 'DB Id',
      value: '',
      displayValue: '-',
      helpText: 'Internal database identifier for the requisition record.',
      fieldType: 'text',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    number: {
      key: 'number',
      label: 'Purchase Requisition Id',
      value: headerValues.number ?? nextNumber,
      editable: true,
      type: 'text',
      helpText: 'Unique purchase requisition number used across procurement workflows.',
      fieldType: 'text',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Document numbering, source context, and ownership for this requisition.',
    },
    userId: {
      key: 'userId',
      label: 'User Id',
      value: userLabel,
      displayValue: userLabel || '-',
      helpText: 'Internal user identifier for the requisition creator.',
      fieldType: 'text',
      sourceText: 'Users master data',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    departmentRecordId: {
      key: 'departmentRecordId',
      label: 'Department Id',
      value: '',
      displayValue: '-',
      helpText: 'Internal department identifier linked to this requisition.',
      fieldType: 'text',
      sourceText: 'Departments master data',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    vendorRecordId: {
      key: 'vendorRecordId',
      label: 'Vendor Id',
      value: selectedVendor?.vendorNumber ?? '',
      displayValue: selectedVendor?.vendorNumber ?? '-',
      helpText: 'Internal vendor identifier linked to this requisition.',
      fieldType: 'text',
      sourceText: 'Vendors master data',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    subsidiaryRecordId: {
      key: 'subsidiaryRecordId',
      label: 'Subsidiary Id',
      value: '',
      displayValue: '-',
      helpText: 'Internal subsidiary identifier linked to this requisition.',
      fieldType: 'text',
      sourceText: 'Subsidiaries master data',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    currencyRecordId: {
      key: 'currencyRecordId',
      label: 'Currency Id',
      value: '',
      displayValue: '-',
      helpText: 'Internal currency identifier linked to this requisition.',
      fieldType: 'text',
      sourceText: 'Currencies master data',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and foreign-key references for this requisition.',
    },
    createdBy: {
      key: 'createdBy',
      label: 'Created By',
      value: userLabel,
      displayValue: userLabel || '-',
      helpText: 'User who will create the purchase requisition.',
      fieldType: 'text',
      sourceText: 'Users master data',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Document numbering, source context, and ownership for this requisition.',
    },
    createdFrom: {
      key: 'createdFrom',
      label: 'Created From',
      value: '',
      displayValue: '-',
      helpText: 'Source transaction that created this requisition.',
      fieldType: 'text',
      sourceText: 'Source transaction',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Document numbering, source context, and ownership for this requisition.',
    },
    approvedBy: {
      key: 'approvedBy',
      label: 'Approved By',
      value: '',
      displayValue: '-',
      helpText: 'User who approved the requisition based on the approval activity trail.',
      fieldType: 'text',
      sourceText: 'System Notes / activity history',
      subsectionTitle: 'Workflow & Timing',
      subsectionDescription: 'Current workflow status, urgency, approval context, and required-by timing.',
    },
    title: {
      key: 'title',
      label: 'Title',
      value: headerValues.title ?? '',
      editable: true,
      type: 'text',
      helpText: 'Brief internal title for the requisition.',
      fieldType: 'text',
      subsectionTitle: 'Request Details',
      subsectionDescription: 'Business purpose, summary, and internal notes for the requisition request.',
    },
    description: {
      key: 'description',
      label: 'Description',
      value: headerValues.description ?? '',
      editable: true,
      type: 'text',
      helpText: 'Header description for the requisition.',
      fieldType: 'text',
      subsectionTitle: 'Request Details',
      subsectionDescription: 'Business purpose, summary, and internal notes for the requisition request.',
    },
    status: {
      key: 'status',
      label: 'Status',
      value: headerValues.status ?? 'draft',
      editable: true,
      type: 'select',
      options: REQUISITION_STATUS_OPTIONS,
      helpText: 'Current workflow state of the requisition.',
      fieldType: 'list',
      sourceText: 'System purchase requisition statuses',
      subsectionTitle: 'Workflow & Timing',
      subsectionDescription: 'Current workflow status, urgency, approval context, and required-by timing.',
    },
    priority: {
      key: 'priority',
      label: 'Priority',
      value: headerValues.priority ?? 'medium',
      editable: true,
      type: 'select',
      options: PRIORITY_OPTIONS,
      helpText: 'Urgency level for the requested spend.',
      fieldType: 'list',
      sourceText: 'System purchase requisition priorities',
      subsectionTitle: 'Workflow & Timing',
      subsectionDescription: 'Current workflow status, urgency, approval context, and required-by timing.',
    },
    neededByDate: {
      key: 'neededByDate',
      label: 'Needed By',
      value: headerValues.neededByDate ?? '',
      displayValue: headerValues.neededByDate || '-',
      editable: true,
      type: 'text',
      helpText: 'Date the requested goods or services are needed.',
      fieldType: 'date',
      subsectionTitle: 'Workflow & Timing',
      subsectionDescription: 'Current workflow status, urgency, approval context, and required-by timing.',
    },
    departmentId: {
      key: 'departmentId',
      label: 'Department',
      value: headerValues.departmentId ?? '',
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...departmentOptions],
      helpText: 'Department requesting or funding the spend.',
      fieldType: 'list',
      sourceText: 'Departments master data',
      subsectionTitle: 'Sourcing & Financials',
      subsectionDescription: 'Department, vendor, subsidiary, currency, and financial context for the request.',
    },
    vendorId: {
      key: 'vendorId',
      label: 'Vendor',
      value: headerValues.vendorId ?? '',
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...vendorOptions],
      helpText: 'Preferred vendor linked to this requisition.',
      fieldType: 'list',
      sourceText: 'Vendors master data',
      subsectionTitle: 'Sourcing & Financials',
      subsectionDescription: 'Department, vendor, subsidiary, currency, and financial context for the request.',
    },
    subsidiaryId: {
      key: 'subsidiaryId',
      label: 'Subsidiary',
      value: headerValues.subsidiaryId ?? '',
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaryOptions],
      helpText: 'Subsidiary that owns the requisition.',
      fieldType: 'list',
      sourceText: 'Subsidiaries master data',
      subsectionTitle: 'Sourcing & Financials',
      subsectionDescription: 'Department, vendor, subsidiary, currency, and financial context for the request.',
    },
    currencyId: {
      key: 'currencyId',
      label: 'Currency',
      value: headerValues.currencyId ?? '',
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...currencyOptions],
      helpText: 'Transaction currency for the requisition.',
      fieldType: 'list',
      sourceText: 'Currencies master data',
      subsectionTitle: 'Sourcing & Financials',
      subsectionDescription: 'Department, vendor, subsidiary, currency, and financial context for the request.',
    },
    total: {
      key: 'total',
      label: 'Total',
      value: String(computedTotal),
      displayValue: fmtCurrency(computedTotal),
      helpText: 'Current document total based on all requisition line amounts.',
      fieldType: 'currency',
      subsectionTitle: 'Sourcing & Financials',
      subsectionDescription: 'Department, vendor, subsidiary, currency, and financial context for the request.',
    },
    notes: {
      key: 'notes',
      label: 'Notes',
      value: headerValues.notes ?? '',
      editable: true,
      type: 'text',
      helpText: 'Internal notes or comments for the requisition.',
      fieldType: 'text',
      subsectionTitle: 'Request Details',
      subsectionDescription: 'Business purpose, summary, and internal notes for the requisition request.',
    },
    createdAt: {
      key: 'createdAt',
      label: 'Created',
      value: '',
      displayValue: '-',
      helpText: 'Date/time the requisition record was created.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this requisition record.',
    },
    updatedAt: {
      key: 'updatedAt',
      label: 'Last Modified',
      value: '',
      displayValue: '-',
      helpText: 'Date/time the requisition record was last modified.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this requisition record.',
    },
  }
  applyRequirementsToEditableFields(headerFieldDefinitions, req, isLocked)


  const headerSections: TransactionHeaderSection[] = buildConfiguredTransactionSections({
    fields: PURCHASE_REQUISITION_DETAIL_FIELDS,
    layout: customization,
    fieldDefinitions: headerFieldDefinitions,
    sectionDescriptions: purchaseRequisitionPageConfig.sectionDescriptions,
  })
  const orderedVisibleLineColumns = getOrderedVisibleTransactionLineColumns(
    PURCHASE_REQUISITION_LINE_COLUMNS,
    customization
  )

  const requisitionCompatibleLineColumns = orderedVisibleLineColumns.map((column) => ({
    id: column.id as PurchaseRequisitionLineColumnKey,
    label: column.label,
  }))

  async function handleCreate(values: Record<string, string>) {
    setError('')

    try {
      const filteredLines = draftRows
        .map((row, index) => ({
          ...row,
          quantity: Math.max(1, row.quantity || 1),
          unitPrice: Math.max(0, row.unitPrice || 0),
          lineTotal: calcLineTotal(row.quantity || 1, row.unitPrice || 0),
          displayOrder: index,
        }))
        .filter((row) => row.description.trim() || row.itemId)

      const response = await fetch('/api/purchase-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: values.number?.trim() || nextNumber,
          status: values.status?.trim() || 'draft',
          title: values.title?.trim() || null,
          description: values.description?.trim() || null,
          priority: values.priority?.trim() || 'medium',
          neededByDate: values.neededByDate?.trim() || null,
          notes: values.notes?.trim() || null,
          vendorId: values.vendorId?.trim() || null,
          departmentId: values.departmentId?.trim() || null,
          subsidiaryId: values.subsidiaryId?.trim() || null,
          currencyId: values.currencyId?.trim() || null,
          userId,
          total: sumMoney(filteredLines.map((row) => row.lineTotal)),
          lineItems: filteredLines,
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        const nextError = body?.error || 'Unable to create purchase requisition'
        setError(nextError)
        return { ok: false, error: nextError }
      }

      router.push(`/purchase-requisitions/${body.id}`)
      return { ok: true }
    } catch {
      const nextError = 'Unable to create purchase requisition'
      setError(nextError)
      return { ok: false, error: nextError }
    }
  }

  return (
    <RecordDetailPageShell
      backHref="/purchase-requisitions"
      backLabel="<- Back to Purchase Requisitions"
      meta="New"
      title={initialHeaderValues ? 'Duplicate Purchase Requisition' : 'New Purchase Requisition'}
      widthClassName="w-full max-w-none"
      actions={
        <>
          <button
            type="button"
            onClick={() => router.push('/purchase-requisitions')}
            className="rounded-md border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-purchase-requisition-form"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            Save
          </button>
        </>
      }
    >
      <TransactionHeaderSections
        editing
        sections={headerSections}
        columns={customization.formColumns}
        containerTitle="Purchase Requisition Details"
        containerDescription="Core purchase requisition fields organized into configurable sections."
        showSubsections={false}
        formId="new-purchase-requisition-form"
        submitMode="controlled"
        onSubmit={handleCreate}
        onValuesChange={(nextValues) => {
          setHeaderValues((previousValues) => {
            const vendorChanged = nextValues.vendorId !== previousValues.vendorId
            if (!vendorChanged) return nextValues

            const nextVendor = vendors.find((vendor) => vendor.id === nextValues.vendorId)
            if (!nextVendor) return nextValues

            return {
              ...nextValues,
              subsidiaryId: nextValues.subsidiaryId || nextVendor.subsidiary?.id || '',
              currencyId: nextValues.currencyId || nextVendor.currency?.id || '',
            }
          })
        }}
      />

      <TransactionLineItemsSection
        rows={[]}
        editing
        purchaseOrderId="draft-purchase-requisition"
        userId={userId || 'draft-user'}
        itemOptions={items.map((item) => ({
          id: item.id,
          itemId: item.itemId ?? 'Pending',
          name: item.name,
          unitPrice: item.listPrice ?? 0,
          itemDrivenValues: {
            description: item.name,
            unitPrice: String(item.listPrice ?? 0),
          },
        }))}
        lineColumns={requisitionCompatibleLineColumns}
        lineSettings={customization.lineSettings}
        lineColumnCustomization={customization.lineColumns}
        sectionTitle="Purchase Requisition Line Items"
        draftMode
        onDraftRowsChange={setDraftRows}
        lineItemApiBasePath="/api/purchase-requisitions/line-items"
        parentIdFieldName="requisitionId"
        tableId="purchase-requisition-new-line-items"
      />

      {error ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </RecordDetailPageShell>
  )
}

