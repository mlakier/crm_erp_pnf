import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionDetailFrame from '@/components/TransactionDetailFrame'
import RecordHeaderDetails, { type RecordHeaderSection } from '@/components/RecordHeaderDetails'
import TransactionGlImpactSection from '@/components/TransactionGlImpactSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import BankTransactionDetailCustomizeMode from '@/components/BankTransactionDetailCustomizeMode'
import { RecordDetailSection } from '@/components/RecordDetailPanels'
import { BANK_TRANSFER_DETAIL_FIELDS } from '@/lib/bank-transaction-detail-customization'
import { loadBankTransactionDetailCustomization } from '@/lib/bank-transaction-detail-customization-store'
import type { TransactionGlImpactRow } from '@/lib/transaction-gl-impact'
import type { TransactionStatDefinition } from '@/lib/transaction-page-config'

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function displayDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function displayDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString('en-US') : '-'
}

function money(amount: unknown, code: string) {
  return `${code} ${Number(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function BankTransferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ customize?: string }>
}) {
  const { id } = await params
  const { customize } = await searchParams
  const isCustomizing = customize === '1'
  const [transfer, customization] = await Promise.all([
    prisma.bankTransfer.findUnique({
      where: { id },
      include: {
        fromBankAccount: { include: { glAccount: true } },
        toBankAccount: { include: { glAccount: true } },
        currency: true,
        subsidiary: true,
      },
    }),
    loadBankTransactionDetailCustomization('transfer'),
  ])

  if (!transfer) notFound()

  const amount = Number(transfer.amount)
  const glLines: TransactionGlImpactRow[] = transfer.toBankAccount
    ? [
        {
          id: `${transfer.id}-to-bank`,
          date: displayDate(transfer.transferDate),
          journalNumber: transfer.journalEntryId ? 'Posted' : 'Preview',
          sourceType: 'Bank Transfer',
          sourceNumber: transfer.transferNumber,
          account: `${transfer.toBankAccount.glAccount.accountNumber} - ${transfer.toBankAccount.glAccount.name}`,
          department: '-',
          location: '-',
          class: '-',
          description: 'Cash increase in destination bank account.',
          debit: amount,
          credit: 0,
          txnAmount: amount,
          localAmount: amount,
          functionalAmount: amount,
          groupAmount: amount,
        },
        {
          id: `${transfer.id}-from-bank`,
          date: displayDate(transfer.transferDate),
          journalNumber: transfer.journalEntryId ? 'Posted' : 'Preview',
          sourceType: 'Bank Transfer',
          sourceNumber: transfer.transferNumber,
          account: `${transfer.fromBankAccount.glAccount.accountNumber} - ${transfer.fromBankAccount.glAccount.name}`,
          department: '-',
          location: '-',
          class: '-',
          description: 'Cash decrease from source bank account.',
          debit: 0,
          credit: amount,
          txnAmount: -amount,
          localAmount: -amount,
          functionalAmount: -amount,
          groupAmount: -amount,
        },
      ]
    : []

  const headerSections: RecordHeaderSection[] = [
    {
      title: 'Transfer Identity',
      description: 'Core bank transfer fields and lifecycle status.',
      fields: [
        { key: 'transferNumber', label: 'Transfer #', value: transfer.transferNumber, column: 1, order: 0 },
        { key: 'status', label: 'Status', value: transfer.status, column: 2, order: 0 },
        { key: 'transferDate', label: 'Transfer Date', value: formatDate(transfer.transferDate), column: 3, order: 0, type: 'date' },
        { key: 'amount', label: 'Amount', value: money(transfer.amount, transfer.currency.code), column: 4, order: 0, fieldType: 'currency' },
      ],
    },
    {
      title: 'Bank Movement',
      description: 'Source bank, destination bank, currency, and posting linkage.',
      fields: [
        { key: 'fromBankAccountId', label: 'From Bank Account', value: transfer.fromBankAccount.name, href: `/bank-accounts/${transfer.fromBankAccountId}`, column: 1, order: 0 },
        { key: 'fromCashGl', label: 'From Cash GL', value: `${transfer.fromBankAccount.glAccount.accountNumber} - ${transfer.fromBankAccount.glAccount.name}`, href: `/chart-of-accounts/${transfer.fromBankAccount.glAccountId}`, column: 2, order: 0 },
        { key: 'toBankAccountId', label: 'To Bank Account', value: transfer.toBankAccount?.name ?? '-', href: transfer.toBankAccountId ? `/bank-accounts/${transfer.toBankAccountId}` : null, column: 3, order: 0 },
        { key: 'toCashGl', label: 'To Cash GL', value: transfer.toBankAccount ? `${transfer.toBankAccount.glAccount.accountNumber} - ${transfer.toBankAccount.glAccount.name}` : '-', href: transfer.toBankAccount ? `/chart-of-accounts/${transfer.toBankAccount.glAccountId}` : null, column: 4, order: 0 },
        { key: 'subsidiaryId', label: 'Subsidiary', value: `${transfer.subsidiary.subsidiaryId} - ${transfer.subsidiary.name}`, column: 1, order: 1 },
        { key: 'currencyId', label: 'Currency', value: `${transfer.currency.code} - ${transfer.currency.name}`, column: 2, order: 1 },
        { key: 'bankFeedTransactionId', label: 'Bank Feed Transaction', value: transfer.bankFeedTransactionId ?? '-', column: 3, order: 1 },
        { key: 'journalEntryId', label: 'Journal Entry', value: transfer.journalEntryId ?? '-', href: transfer.journalEntryId ? `/journals/${transfer.journalEntryId}` : null, column: 4, order: 1 },
        { key: 'memo', label: 'Memo', value: transfer.memo ?? '-', column: 1, order: 2 },
      ],
    },
  ]

  const currencyContextSections: RecordHeaderSection[] = [
    {
      title: 'Currency Context',
      description: 'Transaction currency and amount context for the transfer posting.',
      fields: [
        { key: 'transactionAmount', label: 'TXN Amount', value: money(transfer.amount, transfer.currency.code), column: 1, order: 0, fieldType: 'currency' },
        { key: 'fxRateAudit', label: 'FX Rate Audit', value: 'Configured exchange rates', column: 2, order: 0 },
        { key: 'fxRateType', label: 'FX Rate Type', value: 'spot', column: 3, order: 0 },
        { key: 'translationStatus', label: 'Translation Status', value: 'Local ready | Functional ready | Group ready', column: 4, order: 0 },
        { key: 'localAmount', label: 'Local Amount', value: money(transfer.amount, transfer.currency.code), column: 1, order: 1, fieldType: 'currency' },
        { key: 'localFxRate', label: 'Local FX Rate', value: `1 ${transfer.currency.code} = 1.000000 ${transfer.currency.code}`, column: 2, order: 1 },
        { key: 'realizedFxFunctional', label: 'Realized FX Functional', value: '-', column: 3, order: 1 },
        { key: 'postingStatus', label: 'Posting Status', value: transfer.status, column: 4, order: 1 },
        { key: 'functionalAmount', label: 'Functional Amount', value: money(transfer.amount, transfer.currency.code), column: 1, order: 2, fieldType: 'currency' },
        { key: 'functionalFxRate', label: 'Functional FX Rate', value: `1 ${transfer.currency.code} = 1.000000 ${transfer.currency.code}`, column: 2, order: 2 },
        { key: 'realizedFxLocal', label: 'Realized FX Local', value: '-', column: 3, order: 2 },
        { key: 'bankFeedOpenItem', label: 'Bank Feed Transaction', value: transfer.bankFeedTransactionId ?? '-', column: 4, order: 2 },
        { key: 'groupAmount', label: 'Group Amount', value: money(transfer.amount, transfer.currency.code), column: 1, order: 3, fieldType: 'currency' },
        { key: 'groupFxRate', label: 'Group FX Rate', value: `1 ${transfer.currency.code} = 1.000000 ${transfer.currency.code}`, column: 2, order: 3 },
        { key: 'realizedFxGroup', label: 'Realized FX Group', value: '-', column: 3, order: 3 },
      ],
    },
  ]

  const referenceSections: RecordHeaderSection[] = [
    {
      title: 'Contact And Counterparty',
      description: 'Bank-side references for both sides of the movement.',
      fields: [
        { key: 'fromBankContact', label: 'From Bank Account', value: transfer.fromBankAccount.name, href: `/bank-accounts/${transfer.fromBankAccountId}`, column: 1, order: 0 },
        { key: 'fromCashAccount', label: 'From Cash Account', value: `${transfer.fromBankAccount.glAccount.accountNumber} - ${transfer.fromBankAccount.glAccount.name}`, href: `/chart-of-accounts/${transfer.fromBankAccount.glAccountId}`, column: 2, order: 0 },
        { key: 'toBankContact', label: 'To Bank Account', value: transfer.toBankAccount?.name ?? '-', href: transfer.toBankAccountId ? `/bank-accounts/${transfer.toBankAccountId}` : null, column: 3, order: 0 },
        { key: 'toCashAccount', label: 'To Cash Account', value: transfer.toBankAccount ? `${transfer.toBankAccount.glAccount.accountNumber} - ${transfer.toBankAccount.glAccount.name}` : '-', href: transfer.toBankAccount ? `/chart-of-accounts/${transfer.toBankAccount.glAccountId}` : null, column: 4, order: 0 },
      ],
    },
    {
      title: 'Reference Details',
      description: 'System references, source feed links, and audit timestamps.',
      fields: [
        { key: 'bankFeedReference', label: 'Bank Feed Transaction', value: transfer.bankFeedTransactionId ?? '-', column: 1, order: 0 },
        { key: 'journalReference', label: 'Journal Entry', value: transfer.journalEntryId ?? '-', href: transfer.journalEntryId ? `/journals/${transfer.journalEntryId}` : null, column: 2, order: 0 },
        { key: 'createdAt', label: 'Created', value: displayDateTime(transfer.createdAt), column: 3, order: 0 },
        { key: 'updatedAt', label: 'Last Modified', value: displayDateTime(transfer.updatedAt), column: 4, order: 0 },
      ],
    },
  ]

  const stats: TransactionStatDefinition<typeof transfer>[] = [
    { id: 'amount', label: 'Amount', getValue: () => money(transfer.amount, transfer.currency.code), accent: true },
    { id: 'status', label: 'Status', getValue: () => transfer.status },
    { id: 'bank', label: 'From Bank', getValue: () => transfer.fromBankAccount.name, getHref: () => `/bank-accounts/${transfer.fromBankAccountId}` },
    { id: 'date', label: 'Transfer Date', getValue: () => displayDate(transfer.transferDate) },
  ]
  const exportSections = [...headerSections, ...currencyContextSections, ...referenceSections].map((section) => ({
    title: section.title,
    fields: section.fields.map((field) => ({
      label: field.label,
      value: field.value ?? '',
      type: field.type,
      options: field.options,
    })),
  }))
  const detailHref = `/bank-transfers/${transfer.id}`
  const customizePreviewValues: Record<string, string> = {
    transactionAmount: money(transfer.amount, transfer.currency.code),
    localAmount: money(transfer.amount, transfer.currency.code),
    functionalAmount: money(transfer.amount, transfer.currency.code),
    groupAmount: money(transfer.amount, transfer.currency.code),
    fxRateAudit: 'Configured exchange rates',
    fxRateType: 'spot',
    translationStatus: 'Local ready | Functional ready | Group ready',
    transferNumber: transfer.transferNumber,
    status: transfer.status,
    transferDate: displayDate(transfer.transferDate),
    amount: money(transfer.amount, transfer.currency.code),
    fromBankAccountId: transfer.fromBankAccount.name,
    fromCashGl: `${transfer.fromBankAccount.glAccount.accountNumber} - ${transfer.fromBankAccount.glAccount.name}`,
    toBankAccountId: transfer.toBankAccount?.name ?? '-',
    toCashGl: transfer.toBankAccount ? `${transfer.toBankAccount.glAccount.accountNumber} - ${transfer.toBankAccount.glAccount.name}` : '-',
    subsidiaryId: `${transfer.subsidiary.subsidiaryId} - ${transfer.subsidiary.name}`,
    currencyId: `${transfer.currency.code} - ${transfer.currency.name}`,
    memo: transfer.memo ?? '-',
    bankFeedTransactionId: transfer.bankFeedTransactionId ?? '-',
    journalEntryId: transfer.journalEntryId ?? '-',
    createdAt: displayDateTime(transfer.createdAt),
    updatedAt: displayDateTime(transfer.updatedAt),
  }
  const customizeFields = BANK_TRANSFER_DETAIL_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue: customizePreviewValues[field.id] ?? '-',
  }))
  const statPreviewCards = [
    { id: 'amount', label: 'Amount', value: money(transfer.amount, transfer.currency.code), accent: true as const },
    { id: 'status', label: 'Status', value: transfer.status },
    { id: 'bank', label: 'From Bank', value: transfer.fromBankAccount.name, href: `/bank-accounts/${transfer.fromBankAccountId}` },
    { id: 'date', label: 'Transfer Date', value: displayDate(transfer.transferDate) },
  ]

  return (
    <RecordDetailPageShell
      backHref="/bank-transfers"
      backLabel="<- Back to Bank Transfers"
      meta={transfer.transferNumber}
      title={`Bank Transfer ${transfer.transferNumber}`}
      badge={<span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>{transfer.status}</span>}
      actions={
        <RecordDetailActionBar
          mode={isCustomizing ? 'customize' : 'detail'}
          newHref="/bank-matching?action=Post%20transfer"
          exportTitle={transfer.transferNumber}
          exportFileName={`bank-transfer-${transfer.transferNumber}`}
          exportSections={exportSections}
          customizeHref={`${detailHref}?customize=1`}
          editHref={`${detailHref}?edit=1`}
          deleteResource="bank-transfers"
          deleteId={transfer.id}
          deleteLabel="Delete"
          detailExtraActions={
            <Link href="/bank-matching?action=Post%20transfer" className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}>
              Open Matching
            </Link>
          }
        />
      }
    >
      <TransactionDetailFrame
        showFooterSections={!isCustomizing}
        stats={isCustomizing ? null : (
          <TransactionStatsRow
            record={transfer}
            stats={stats}
            visibleStatCards={customization.statCards}
          />
        )}
        header={
          isCustomizing ? (
            <BankTransactionDetailCustomizeMode
              type="transfer"
              detailHref={detailHref}
              initialLayout={customization}
              fields={customizeFields}
              statPreviewCards={statPreviewCards}
            />
          ) : (
          <div className="space-y-6">
            <RecordHeaderDetails
              editing={false}
              sections={currencyContextSections}
              columns={4}
              containerTitle="4-Currency Context"
              containerDescription="Read the transaction, local, functional, and group amounts from the bank transfer context."
              showSubsections={false}
            />
            <RecordHeaderDetails
              editing={false}
              sections={referenceSections}
              columns={4}
              containerTitle="Reference Details"
              containerDescription="Expanded context from linked records on this bank transfer."
            />
            <RecordHeaderDetails editing={false} sections={headerSections} columns={4} containerTitle="Bank Transfer Details" />
          </div>
          )
        }
        lineItems={!isCustomizing ? (
          <TransactionGlImpactSection
            title="GL Impact"
            rows={glLines}
            emptyMessage="No GL impact preview is available because this transfer does not have a destination bank account."
            currencyCodes={{ transaction: transfer.currency.code, local: transfer.currency.code, functional: transfer.currency.code, group: transfer.currency.code }}
          />
        ) : null}
        relatedMasterData={
          <RecordDetailSection title="Related Records" count={transfer.toBankAccount ? 2 : 1}>
            <div className="grid gap-3 px-6 py-4 text-sm md:grid-cols-2">
              <Link href={`/bank-accounts/${transfer.fromBankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>From Bank: {transfer.fromBankAccount.name}</Link>
              {transfer.toBankAccountId ? <Link href={`/bank-accounts/${transfer.toBankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>To Bank: {transfer.toBankAccount?.name}</Link> : <span style={{ color: 'var(--text-muted)' }}>No destination bank linked.</span>}
            </div>
          </RecordDetailSection>
        }
        relatedMasterDataCount={transfer.toBankAccount ? 2 : 1}
      />
    </RecordDetailPageShell>
  )
}
