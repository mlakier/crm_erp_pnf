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
import { BANK_DEPOSIT_DETAIL_FIELDS } from '@/lib/bank-transaction-detail-customization'
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

export default async function BankDepositDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ customize?: string }>
}) {
  const { id } = await params
  const { customize } = await searchParams
  const isCustomizing = customize === '1'
  const [deposit, customization] = await Promise.all([
    prisma.bankDeposit.findUnique({
      where: { id },
      include: {
        bankAccount: { include: { glAccount: true } },
        currency: true,
        subsidiary: true,
        offsetAccount: true,
      },
    }),
    loadBankTransactionDetailCustomization('deposit'),
  ])

  if (!deposit) notFound()

  const amount = Number(deposit.amount)
  const glLines: TransactionGlImpactRow[] = deposit.offsetAccount
    ? [
        {
          id: `${deposit.id}-cash`,
          date: displayDate(deposit.depositDate),
          journalNumber: deposit.journalEntryId ? 'Posted' : 'Preview',
          sourceType: 'Bank Deposit',
          sourceNumber: deposit.depositNumber,
          account: `${deposit.bankAccount.glAccount.accountNumber} - ${deposit.bankAccount.glAccount.name}`,
          department: '-',
          location: '-',
          class: '-',
          description: 'Cash increase from bank deposit.',
          debit: amount,
          credit: 0,
          txnAmount: amount,
          localAmount: amount,
          functionalAmount: amount,
          groupAmount: amount,
        },
        {
          id: `${deposit.id}-offset`,
          date: displayDate(deposit.depositDate),
          journalNumber: deposit.journalEntryId ? 'Posted' : 'Preview',
          sourceType: 'Bank Deposit',
          sourceNumber: deposit.depositNumber,
          account: `${deposit.offsetAccount.accountNumber} - ${deposit.offsetAccount.name}`,
          department: '-',
          location: '-',
          class: '-',
          description: 'Deposit offset selected from bank activity posting.',
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
      title: 'Deposit Identity',
      description: 'Core bank deposit fields and lifecycle status.',
      fields: [
        { key: 'depositNumber', label: 'Deposit #', value: deposit.depositNumber, column: 1, order: 0 },
        { key: 'status', label: 'Status', value: deposit.status, column: 2, order: 0 },
        { key: 'depositDate', label: 'Deposit Date', value: formatDate(deposit.depositDate), column: 3, order: 0, type: 'date' },
        { key: 'amount', label: 'Amount', value: money(deposit.amount, deposit.currency.code), column: 4, order: 0, fieldType: 'currency' },
      ],
    },
    {
      title: 'Bank Posting',
      description: 'Cash account, offset, subsidiary, and bank-feed linkage.',
      fields: [
        {
          key: 'bankAccountId',
          label: 'Bank Account',
          value: deposit.bankAccount.name,
          href: `/bank-accounts/${deposit.bankAccountId}`,
          column: 1,
          order: 0,
        },
        {
          key: 'cashGl',
          label: 'Cash GL',
          value: `${deposit.bankAccount.glAccount.accountNumber} - ${deposit.bankAccount.glAccount.name}`,
          href: `/chart-of-accounts/${deposit.bankAccount.glAccountId}`,
          column: 2,
          order: 0,
        },
        {
          key: 'offsetAccountId',
          label: 'Offset Account',
          value: deposit.offsetAccount ? `${deposit.offsetAccount.accountNumber} - ${deposit.offsetAccount.name}` : '-',
          href: deposit.offsetAccountId ? `/chart-of-accounts/${deposit.offsetAccountId}` : null,
          column: 3,
          order: 0,
        },
        { key: 'subsidiaryId', label: 'Subsidiary', value: `${deposit.subsidiary.subsidiaryId} - ${deposit.subsidiary.name}`, column: 4, order: 0 },
        { key: 'memo', label: 'Memo', value: deposit.memo ?? '-', column: 1, order: 1 },
        { key: 'bankFeedTransactionId', label: 'Bank Feed Transaction', value: deposit.bankFeedTransactionId ?? '-', column: 2, order: 1 },
        { key: 'journalEntryId', label: 'Journal Entry', value: deposit.journalEntryId ?? '-', href: deposit.journalEntryId ? `/journals/${deposit.journalEntryId}` : null, column: 3, order: 1 },
        { key: 'currencyId', label: 'Currency', value: `${deposit.currency.code} - ${deposit.currency.name}`, column: 4, order: 1 },
      ],
    },
  ]

  const currencyContextSections: RecordHeaderSection[] = [
    {
      title: 'Currency Context',
      description: 'Transaction currency and amount context for posting and reconciliation.',
      fields: [
        { key: 'transactionAmount', label: 'TXN Amount', value: money(deposit.amount, deposit.currency.code), column: 1, order: 0, fieldType: 'currency' },
        { key: 'fxRateAudit', label: 'FX Rate Audit', value: 'Configured exchange rates', column: 2, order: 0 },
        { key: 'fxRateType', label: 'FX Rate Type', value: 'spot', column: 3, order: 0 },
        { key: 'translationStatus', label: 'Translation Status', value: 'Local ready | Functional ready | Group ready', column: 4, order: 0 },
        { key: 'localAmount', label: 'Local Amount', value: money(deposit.amount, deposit.currency.code), column: 1, order: 1, fieldType: 'currency' },
        { key: 'localFxRate', label: 'Local FX Rate', value: `1 ${deposit.currency.code} = 1.000000 ${deposit.currency.code}`, column: 2, order: 1 },
        { key: 'realizedFxFunctional', label: 'Realized FX Functional', value: '-', column: 3, order: 1 },
        { key: 'postingStatus', label: 'Posting Status', value: deposit.status, column: 4, order: 1 },
        { key: 'functionalAmount', label: 'Functional Amount', value: money(deposit.amount, deposit.currency.code), column: 1, order: 2, fieldType: 'currency' },
        { key: 'functionalFxRate', label: 'Functional FX Rate', value: `1 ${deposit.currency.code} = 1.000000 ${deposit.currency.code}`, column: 2, order: 2 },
        { key: 'realizedFxLocal', label: 'Realized FX Local', value: '-', column: 3, order: 2 },
        { key: 'bankFeedOpenItem', label: 'Bank Feed Transaction', value: deposit.bankFeedTransactionId ?? '-', column: 4, order: 2 },
        { key: 'groupAmount', label: 'Group Amount', value: money(deposit.amount, deposit.currency.code), column: 1, order: 3, fieldType: 'currency' },
        { key: 'groupFxRate', label: 'Group FX Rate', value: `1 ${deposit.currency.code} = 1.000000 ${deposit.currency.code}`, column: 2, order: 3 },
        { key: 'realizedFxGroup', label: 'Realized FX Group', value: '-', column: 3, order: 3 },
      ],
    },
  ]

  const referenceSections: RecordHeaderSection[] = [
    {
      title: 'Contact And Counterparty',
      description: 'Bank-side and offset-side references used to understand who or what created the cash movement.',
      fields: [
        { key: 'bankAccountContact', label: 'Bank Account', value: deposit.bankAccount.name, href: `/bank-accounts/${deposit.bankAccountId}`, column: 1, order: 0 },
        { key: 'cashAccount', label: 'Cash Account', value: `${deposit.bankAccount.glAccount.accountNumber} - ${deposit.bankAccount.glAccount.name}`, href: `/chart-of-accounts/${deposit.bankAccount.glAccountId}`, column: 2, order: 0 },
        { key: 'offsetReference', label: 'Offset Reference', value: deposit.offsetAccount ? `${deposit.offsetAccount.accountNumber} - ${deposit.offsetAccount.name}` : '-', href: deposit.offsetAccountId ? `/chart-of-accounts/${deposit.offsetAccountId}` : null, column: 3, order: 0 },
        { key: 'subsidiaryReference', label: 'Subsidiary', value: `${deposit.subsidiary.subsidiaryId} - ${deposit.subsidiary.name}`, column: 4, order: 0 },
      ],
    },
    {
      title: 'Reference Details',
      description: 'System references, source feed links, and audit timestamps.',
      fields: [
        { key: 'bankFeedReference', label: 'Bank Feed Transaction', value: deposit.bankFeedTransactionId ?? '-', column: 1, order: 0 },
        { key: 'journalReference', label: 'Journal Entry', value: deposit.journalEntryId ?? '-', href: deposit.journalEntryId ? `/journals/${deposit.journalEntryId}` : null, column: 2, order: 0 },
        { key: 'createdAt', label: 'Created', value: displayDateTime(deposit.createdAt), column: 3, order: 0 },
        { key: 'updatedAt', label: 'Last Modified', value: displayDateTime(deposit.updatedAt), column: 4, order: 0 },
      ],
    },
  ]

  const stats: TransactionStatDefinition<typeof deposit>[] = [
    { id: 'amount', label: 'Amount', getValue: () => money(deposit.amount, deposit.currency.code), accent: true },
    { id: 'status', label: 'Status', getValue: () => deposit.status },
    { id: 'bank', label: 'Bank Account', getValue: () => deposit.bankAccount.name, getHref: () => `/bank-accounts/${deposit.bankAccountId}` },
    { id: 'date', label: 'Deposit Date', getValue: () => displayDate(deposit.depositDate) },
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
  const detailHref = `/bank-deposits/${deposit.id}`
  const customizePreviewValues: Record<string, string> = {
    transactionAmount: money(deposit.amount, deposit.currency.code),
    localAmount: money(deposit.amount, deposit.currency.code),
    functionalAmount: money(deposit.amount, deposit.currency.code),
    groupAmount: money(deposit.amount, deposit.currency.code),
    fxRateAudit: 'Configured exchange rates',
    fxRateType: 'spot',
    translationStatus: 'Local ready | Functional ready | Group ready',
    depositNumber: deposit.depositNumber,
    status: deposit.status,
    depositDate: displayDate(deposit.depositDate),
    amount: money(deposit.amount, deposit.currency.code),
    bankAccountId: deposit.bankAccount.name,
    cashGl: `${deposit.bankAccount.glAccount.accountNumber} - ${deposit.bankAccount.glAccount.name}`,
    offsetAccountId: deposit.offsetAccount ? `${deposit.offsetAccount.accountNumber} - ${deposit.offsetAccount.name}` : '-',
    subsidiaryId: `${deposit.subsidiary.subsidiaryId} - ${deposit.subsidiary.name}`,
    currencyId: `${deposit.currency.code} - ${deposit.currency.name}`,
    memo: deposit.memo ?? '-',
    bankFeedTransactionId: deposit.bankFeedTransactionId ?? '-',
    journalEntryId: deposit.journalEntryId ?? '-',
    createdAt: displayDateTime(deposit.createdAt),
    updatedAt: displayDateTime(deposit.updatedAt),
  }
  const customizeFields = BANK_DEPOSIT_DETAIL_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue: customizePreviewValues[field.id] ?? '-',
  }))
  const statPreviewCards = [
    { id: 'amount', label: 'Amount', value: money(deposit.amount, deposit.currency.code), accent: true as const },
    { id: 'status', label: 'Status', value: deposit.status },
    { id: 'bank', label: 'Bank Account', value: deposit.bankAccount.name, href: `/bank-accounts/${deposit.bankAccountId}` },
    { id: 'date', label: 'Deposit Date', value: displayDate(deposit.depositDate) },
  ]

  return (
    <RecordDetailPageShell
      backHref="/bank-deposits"
      backLabel="<- Back to Bank Deposits"
      meta={deposit.depositNumber}
      title={`Bank Deposit ${deposit.depositNumber}`}
      badge={<span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>{deposit.status}</span>}
      actions={
        <RecordDetailActionBar
          mode={isCustomizing ? 'customize' : 'detail'}
          newHref="/bank-matching?action=Post%20deposit"
          exportTitle={deposit.depositNumber}
          exportFileName={`bank-deposit-${deposit.depositNumber}`}
          exportSections={exportSections}
          customizeHref={`${detailHref}?customize=1`}
          editHref={`${detailHref}?edit=1`}
          deleteResource="bank-deposits"
          deleteId={deposit.id}
          deleteLabel="Delete"
          detailExtraActions={
            <Link href="/bank-matching?action=Post%20deposit" className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}>
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
            record={deposit}
            stats={stats}
            visibleStatCards={customization.statCards}
          />
        )}
        header={
          isCustomizing ? (
            <BankTransactionDetailCustomizeMode
              type="deposit"
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
              containerDescription="Read the transaction, local, functional, and group amounts from the bank deposit context."
              showSubsections={false}
            />
            <RecordHeaderDetails
              editing={false}
              sections={referenceSections}
              columns={4}
              containerTitle="Reference Details"
              containerDescription="Expanded context from linked records on this bank deposit."
            />
            <RecordHeaderDetails editing={false} sections={headerSections} columns={4} containerTitle="Bank Deposit Details" />
          </div>
          )
        }
        lineItems={!isCustomizing ? (
          <TransactionGlImpactSection
            title="GL Impact"
            rows={glLines}
            emptyMessage="No GL impact preview is available because this deposit has no offset account."
            currencyCodes={{ transaction: deposit.currency.code, local: deposit.currency.code, functional: deposit.currency.code, group: deposit.currency.code }}
          />
        ) : null}
        relatedMasterData={
          <RecordDetailSection title="Related Records" count={2}>
            <div className="grid gap-3 px-6 py-4 text-sm md:grid-cols-2">
              <Link href={`/bank-accounts/${deposit.bankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Bank Account: {deposit.bankAccount.name}</Link>
              {deposit.offsetAccountId ? <Link href={`/chart-of-accounts/${deposit.offsetAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Offset Account: {deposit.offsetAccount?.accountNumber}</Link> : <span style={{ color: 'var(--text-muted)' }}>No offset account linked.</span>}
            </div>
          </RecordDetailSection>
        }
        relatedMasterDataCount={2}
      />
    </RecordDetailPageShell>
  )
}
