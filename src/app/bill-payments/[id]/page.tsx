import Link from 'next/link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import { loadListValues } from '@/lib/load-list-values'
import { createRecordLabelMapFromValues, formatRecordLabel } from '@/lib/record-status-label'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionDetailFrame from '@/components/TransactionDetailFrame'
import TransactionHeaderSections, { type TransactionHeaderField } from '@/components/TransactionHeaderSections'
import BillPaymentDetailCustomizeMode from '@/components/BillPaymentDetailCustomizeMode'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import SystemNotesSection from '@/components/SystemNotesSection'
import CommunicationsSection from '@/components/CommunicationsSection'
import MasterDataDetailExportMenu from '@/components/MasterDataDetailExportMenu'
import MasterDataDetailCreateMenu from '@/components/MasterDataDetailCreateMenu'
import TransactionActionStack from '@/components/TransactionActionStack'
import DeleteButton from '@/components/DeleteButton'
import BillPaymentRelatedDocuments from '@/components/BillPaymentRelatedDocuments'
import { parseCommunicationSummary, parseFieldChangeSummary } from '@/lib/activity'
import {
  buildLinkedReferenceFieldDefinitions,
  buildLinkedReferencePreviewSources,
} from '@/lib/linked-record-reference-catalogs'
import { buildTransactionCommunicationComposePayload } from '@/lib/transaction-communications'
import {
  buildConfiguredTransactionSections,
  buildTransactionCustomizePreviewFields,
  buildTransactionExportHeaderFields,
} from '@/lib/transaction-detail-helpers'
import {
  BILL_PAYMENT_DETAIL_FIELDS,
  BILL_PAYMENT_REFERENCE_SOURCES,
  BILL_PAYMENT_STAT_CARDS,
  type BillPaymentDetailFieldKey,
} from '@/lib/bill-payment-detail-customization'
import { loadBillPaymentDetailCustomization } from '@/lib/bill-payment-detail-customization-store'
import type { TransactionStatDefinition } from '@/lib/transaction-page-config'

type BillPaymentHeaderField = {
  key: BillPaymentDetailFieldKey
} & TransactionHeaderField

export default async function BillPaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string; customize?: string }>
}) {
  await connection()
  const { id } = await params
  const { edit, customize } = await searchParams
  const isEditing = edit === '1'
  const isCustomizing = customize === '1'
  const { moneySettings } = await loadCompanyDisplaySettings()

  const [payment, statusValues, methodValues, customization] = await Promise.all([
    prisma.billPayment.findUnique({
      where: { id },
      include: {
        bill: {
          include: {
            vendor: true,
            purchaseOrder: {
              include: {
                vendor: true,
                user: true,
                requisition: true,
                receipts: true,
              },
            },
          },
        },
      },
    }),
    loadListValues('BILL-PAYMENT-STATUS'),
    loadListValues('PAYMENT-METHOD'),
    loadBillPaymentDetailCustomization(),
  ])

  if (!payment) notFound()

  const detailHref = `/bill-payments/${payment.id}`
  const statusLabelMap = createRecordLabelMapFromValues(statusValues)
  const formattedStatus = formatRecordLabel(payment.status, statusLabelMap)
  const statusOptions = statusValues.map((value) => ({ value: value.toLowerCase(), label: value }))
  const methodOptions = methodValues.map((value) => ({ value: value.toLowerCase(), label: value }))

  const sectionDescriptions: Record<string, string> = {
    'Document Identity': 'Core bill payment identifiers and source-bill context.',
    'Payment Terms': 'Amount, timing, method, status, and payment notes.',
    'Record Keys': 'Internal and linked transaction identifiers for this bill payment.',
    'System Dates': 'System-managed timestamps for this bill payment.',
  }

  const billPaymentStats: TransactionStatDefinition<typeof payment>[] = [
    {
      id: 'amount',
      label: 'Payment Amount',
      accent: true,
      getValue: (record) => fmtCurrency(record.amount, undefined, moneySettings),
      getValueTone: () => 'accent',
    },
    {
      id: 'status',
      label: 'Status',
      getValue: () => formattedStatus,
      getValueTone: () =>
        payment.status === 'completed'
          ? 'green'
          : payment.status === 'processed'
            ? 'accent'
            : payment.status === 'pending'
              ? 'yellow'
              : payment.status === 'cancelled'
                ? 'red'
                : 'default',
    },
    {
      id: 'date',
      label: 'Date',
      getValue: (record) => fmtDocumentDate(record.date, moneySettings),
    },
    {
      id: 'bill',
      label: 'Bill',
      getValue: (record) => record.bill.number,
      getHref: (record) => `/bills/${record.bill.id}`,
      getValueTone: () => 'accent',
    },
  ]

  const statPreviewCards = billPaymentStats.map((stat) => ({
    id: stat.id,
    label: stat.label,
    value: stat.getValue(payment),
    href: stat.getHref?.(payment) ?? null,
    accent: stat.accent,
    valueTone: stat.getValueTone?.(payment),
    cardTone: stat.getCardTone?.(payment),
    supportsColorized: Boolean(stat.accent || stat.getValueTone || stat.getCardTone),
    supportsLink: Boolean(stat.getHref),
  }))

  const activities = await prisma.activity.findMany({
    where: {
      entityType: 'bill-payment',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
  })

  const activityUserIds = Array.from(new Set(activities.map((activity) => activity.userId).filter(Boolean))) as string[]
  const activityUsers = activityUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: activityUserIds } },
        select: { id: true, userId: true, name: true, email: true },
      })
    : []
  const activityUserLabelById = new Map(
    activityUsers.map((user) => [
      user.id,
      user.userId && user.name ? `${user.userId} - ${user.name}` : user.userId ?? user.name ?? user.email,
    ]),
  )

  const headerFieldDefinitions: Record<BillPaymentDetailFieldKey, BillPaymentHeaderField> = {
    id: {
      key: 'id',
      label: 'DB Id',
      value: payment.id,
      helpText: 'Internal database identifier for this bill payment.',
      fieldType: 'text',
      subsectionTitle: 'Record Keys',
      subsectionDescription: 'Internal and linked transaction identifiers for this bill payment.',
    },
    number: {
      key: 'number',
      label: 'Bill Payment Id',
      value: payment.number,
      helpText: 'Identifier for this bill payment.',
      fieldType: 'text',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Core bill payment identifiers and source-bill context.',
    },
    billId: {
      key: 'billId',
      label: 'Bill',
      value: payment.billId,
      displayValue: (
        <Link href={`/bills/${payment.bill.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
          {payment.bill.number}
        </Link>
      ),
      editable: true,
      type: 'select',
      options: [{ value: payment.bill.id, label: payment.bill.number }],
      helpText: 'Linked bill for this payment.',
      fieldType: 'text',
      sourceText: 'Bill transaction',
      subsectionTitle: 'Document Identity',
      subsectionDescription: 'Core bill payment identifiers and source-bill context.',
      href: `/bills/${payment.bill.id}`,
    },
    amount: {
      key: 'amount',
      label: 'Amount',
      value: String(payment.amount),
      displayValue: fmtCurrency(payment.amount, undefined, moneySettings),
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
      value: payment.date.toISOString().slice(0, 10),
      displayValue: fmtDocumentDate(payment.date, moneySettings),
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
      value: payment.method ?? '',
      displayValue: payment.method ?? '-',
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
      value: payment.reference ?? '',
      displayValue: payment.reference ?? '-',
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
      value: payment.status,
      displayValue: formattedStatus,
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
      value: payment.notes ?? '',
      displayValue: payment.notes ?? '-',
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
      value: payment.createdAt.toISOString(),
      displayValue: fmtDocumentDate(payment.createdAt, moneySettings),
      helpText: 'Date/time the bill payment record was created.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this bill payment.',
    },
    updatedAt: {
      key: 'updatedAt',
      label: 'Last Modified',
      value: payment.updatedAt.toISOString(),
      displayValue: fmtDocumentDate(payment.updatedAt, moneySettings),
      helpText: 'Date/time the bill payment record was last modified.',
      fieldType: 'date',
      subsectionTitle: 'System Dates',
      subsectionDescription: 'System-managed timestamps for this bill payment.',
    },
  }

  const headerSections = buildConfiguredTransactionSections({
    fields: BILL_PAYMENT_DETAIL_FIELDS,
    layout: customization,
    fieldDefinitions: headerFieldDefinitions,
    sectionDescriptions,
  })

  const referenceFieldDefinitions = buildLinkedReferenceFieldDefinitions(
    BILL_PAYMENT_REFERENCE_SOURCES,
    { bill: payment.bill },
    { bill: `/bills/${payment.bill.id}` },
  )

  const allFieldDefinitions = {
    ...headerFieldDefinitions,
    ...referenceFieldDefinitions,
  }

  const customizeFields = buildTransactionCustomizePreviewFields({
    fields: BILL_PAYMENT_DETAIL_FIELDS,
    fieldDefinitions: allFieldDefinitions,
    previewOverrides: {
      amount: fmtCurrency(payment.amount, undefined, moneySettings),
      date: fmtDocumentDate(payment.date, moneySettings),
      createdAt: fmtDocumentDate(payment.createdAt, moneySettings),
      updatedAt: fmtDocumentDate(payment.updatedAt, moneySettings),
    },
  })

  const systemNotes = activities
    .map((activity) => {
      const parsed = parseFieldChangeSummary(activity.summary)
      if (!parsed) return null
      return {
        id: activity.id,
        date: fmtDocumentDate(activity.createdAt, moneySettings),
        setBy: activity.userId ? activityUserLabelById.get(activity.userId) ?? activity.userId : 'System',
        context: parsed.context,
        fieldName: parsed.fieldName,
        oldValue: parsed.oldValue,
        newValue: parsed.newValue,
      }
    })
    .filter((note): note is Exclude<typeof note, null> => Boolean(note))

  const communications = activities
    .map((activity) => {
      const parsed = parseCommunicationSummary(activity.summary)
      if (!parsed) return null
      return {
        id: activity.id,
        date: fmtDocumentDate(activity.createdAt, moneySettings),
        direction: parsed.direction || '-',
        channel: parsed.channel || '-',
        subject: parsed.subject || '-',
        from: parsed.from || '-',
        to: parsed.to || '-',
        status: parsed.status || '-',
      }
    })
    .filter((communication): communication is Exclude<typeof communication, null> => Boolean(communication))

  const referenceSourceDefinitions = buildLinkedReferencePreviewSources(BILL_PAYMENT_REFERENCE_SOURCES, {
    bill: payment.bill,
  })

  const referenceSections = (customization.referenceLayouts ?? [])
    .map((referenceLayout) => {
      const source = BILL_PAYMENT_REFERENCE_SOURCES.find((entry) => entry.id === referenceLayout.referenceId)
      if (!source) return null
      const fields = source.fields
        .filter((field) => referenceLayout.fields[field.id]?.visible)
        .sort((left, right) => {
          const leftConfig = referenceLayout.fields[left.id]
          const rightConfig = referenceLayout.fields[right.id]
          if (!leftConfig || !rightConfig) return 0
          if (leftConfig.column !== rightConfig.column) return leftConfig.column - rightConfig.column
          return leftConfig.order - rightConfig.order
        })
        .map((field) => ({
          ...allFieldDefinitions[field.id],
          column: referenceLayout.fields[field.id]?.column ?? 1,
          order: referenceLayout.fields[field.id]?.order ?? 0,
        }))
      if (fields.length === 0) return null
      return {
        title: source.label,
        description: source.description,
        columns: referenceLayout.formColumns,
        rows: Math.max(1, ...fields.map((field) => Math.max(1, (field.order ?? 0) + 1))),
        fields,
      }
    })
    .filter((section): section is { title: string; description: string; columns: number; rows: number; fields: TransactionHeaderField[] } => Boolean(section))

  const referenceColumns = Math.max(1, ...referenceSections.map((section) => section.columns))

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/bill-payments'}
      backLabel={isCustomizing ? '<- Back to Bill Payment Detail' : '<- Back to Bill Payments'}
      meta={payment.number}
      title={`Bill Payment for ${payment.bill.vendor.name}`}
      widthClassName="w-full max-w-none"
      actions={
        isCustomizing ? null : (
          <TransactionActionStack
            mode={isEditing ? 'edit' : 'detail'}
            cancelHref={detailHref}
            formId={`inline-record-form-${payment.id}`}
            recordId={payment.id}
            primaryActions={
              isEditing ? (
                <Link
                  href={`${detailHref}?customize=1`}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Customize
                </Link>
              ) : (
                <>
                  <MasterDataDetailCreateMenu
                    newHref="/bill-payments/new"
                    duplicateHref={`/bill-payments/new?duplicateFrom=${encodeURIComponent(payment.id)}`}
                  />
                  <MasterDataDetailExportMenu
                    title={payment.number}
                    fileName={`bill-payment-${payment.number}`}
                    sections={headerSections.map((section) => ({
                      title: section.title,
                      fields: buildTransactionExportHeaderFields([section]),
                    }))}
                  />
                  <Link
                    href={`${detailHref}?customize=1`}
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                  >
                    Customize
                  </Link>
                  <Link
                    href={`${detailHref}?edit=1`}
                    className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                  >
                    Edit
                  </Link>
                  <DeleteButton endpoint="/api/bill-payments" id={payment.id} label={payment.number} />
                </>
              )
            }
          />
        )
      }
    >
      <TransactionDetailFrame
        showFooterSections={!isCustomizing}
        stats={
          isCustomizing ? null : (
            <TransactionStatsRow
              record={payment}
              stats={billPaymentStats}
              visibleStatCards={customization.statCards}
              visibleStatIds={BILL_PAYMENT_STAT_CARDS.map((card) => card.id)}
            />
          )
        }
        header={
          isCustomizing ? (
            <BillPaymentDetailCustomizeMode
              detailHref={detailHref}
              initialLayout={customization}
              fields={customizeFields}
              referenceSourceDefinitions={referenceSourceDefinitions}
              sectionDescriptions={sectionDescriptions}
              statPreviewCards={statPreviewCards}
            />
          ) : (
            <div className="space-y-6">
              {referenceSections.length > 0 ? (
                <TransactionHeaderSections
                  editing={false}
                  sections={referenceSections.map((section) => ({
                    title: section.title,
                    description: section.description,
                    rows: section.rows,
                    fields: section.fields,
                  }))}
                  columns={referenceColumns}
                  containerTitle="Reference Details"
                  containerDescription="Expanded context from linked records on this bill payment."
                  showSubsections={false}
                />
              ) : null}
              <TransactionHeaderSections
                purchaseOrderId={payment.id}
                editing={isEditing}
                sections={headerSections}
                columns={customization.formColumns}
                containerTitle="Bill Payment Details"
                containerDescription="Core bill payment fields organized into configurable sections."
                showSubsections={false}
                updateUrl={`/api/bill-payments?id=${encodeURIComponent(payment.id)}`}
              />
            </div>
          )
        }
        lineItems={null}
        relatedDocuments={isCustomizing ? null : (
          <BillPaymentRelatedDocuments
            purchaseRequisitions={
              payment.bill.purchaseOrder?.requisition
                ? [
                    {
                      id: payment.bill.purchaseOrder.requisition.id,
                      number: payment.bill.purchaseOrder.requisition.number,
                      status: payment.bill.purchaseOrder.requisition.status,
                      total: Number(payment.bill.purchaseOrder.requisition.total),
                      createdAt: payment.bill.purchaseOrder.requisition.createdAt.toISOString(),
                    },
                  ]
                : []
            }
            purchaseOrders={
              payment.bill.purchaseOrder
                ? [
                    {
                      id: payment.bill.purchaseOrder.id,
                      number: payment.bill.purchaseOrder.number,
                      status: payment.bill.purchaseOrder.status,
                      total: Number(payment.bill.purchaseOrder.total),
                      createdAt: payment.bill.purchaseOrder.createdAt.toISOString(),
                    },
                  ]
                : []
            }
            receipts={
              payment.bill.purchaseOrder?.receipts.map((receipt) => ({
                id: receipt.id,
                number: receipt.id,
                date: receipt.date.toISOString(),
                status: receipt.status,
                quantity: receipt.quantity,
                notes: receipt.notes ?? null,
              })) ?? []
            }
            bills={[
              {
                id: payment.bill.id,
                number: payment.bill.number,
                status: payment.bill.status,
                total: Number(payment.bill.total),
                date: payment.bill.date.toISOString(),
                dueDate: payment.bill.dueDate ? payment.bill.dueDate.toISOString() : null,
                notes: payment.bill.notes ?? null,
              },
            ]}
            moneySettings={moneySettings}
          />
        )}
        supplementarySections={null}
        communications={isCustomizing ? null : (
          <CommunicationsSection
            rows={communications}
            compose={buildTransactionCommunicationComposePayload({
              recordId: payment.id,
              number: payment.number,
              counterpartyName: payment.bill.vendor.name,
              counterpartyEmail: payment.bill.vendor.email ?? null,
              status: formattedStatus,
              total: fmtCurrency(payment.amount, undefined, moneySettings),
              lineItems: [],
              sendEmailEndpoint: '/api/bill-payments?action=send-email',
              recordIdFieldName: 'billPaymentId',
              documentLabel: 'Bill Payment',
            })}
          />
        )}
        systemNotes={isCustomizing ? null : <SystemNotesSection notes={systemNotes} />}
      />
    </RecordDetailPageShell>
  )
}
