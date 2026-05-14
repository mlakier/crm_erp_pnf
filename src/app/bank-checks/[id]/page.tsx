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
import { BANK_CHECK_DETAIL_FIELDS } from '@/lib/bank-transaction-detail-customization'
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

export default async function BankCheckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ customize?: string }>
}) {
  const { id } = await params
  const { customize } = await searchParams
  const isCustomizing = customize === '1'
  const [check, customization] = await Promise.all([
    prisma.bankCheck.findUnique({
      where: { id },
      include: {
        bankAccount: { include: { glAccount: true } },
        currency: true,
        subsidiary: true,
        vendor: true,
        billPayment: {
          include: {
            bankAccount: true,
            bill: true,
          },
        },
      },
    }),
    loadBankTransactionDetailCustomization('check'),
  ])

  if (!check) notFound()

  const amount = Number(check.amount)
  const glLines: TransactionGlImpactRow[] = check.billPayment
    ? [
        {
          id: `${check.id}-bill-payment`,
          date: displayDate(check.checkDate),
          journalNumber: check.billPayment.number,
          sourceType: 'Bill Payment',
          sourceNumber: check.billPayment.number,
          account: 'Bill Payment GL Impact',
          department: '-',
          location: '-',
          class: '-',
          description: 'The check is the payment instrument; the GL posting lives on the related bill payment.',
          debit: 0,
          credit: 0,
          txnAmount: 0,
          localAmount: 0,
          functionalAmount: 0,
          groupAmount: 0,
        },
      ]
    : [
        {
          id: `${check.id}-cash`,
          date: displayDate(check.checkDate),
          journalNumber: 'Preview',
          sourceType: 'Bank Check',
          sourceNumber: check.checkTransactionNumber,
          account: `${check.bankAccount.glAccount.accountNumber} - ${check.bankAccount.glAccount.name}`,
          department: '-',
          location: '-',
          class: '-',
          description: 'Operational check record only. Post through a bill payment or journal before clearing.',
          debit: 0,
          credit: amount,
          txnAmount: -amount,
          localAmount: -amount,
          functionalAmount: -amount,
          groupAmount: -amount,
        },
      ]

  const headerSections: RecordHeaderSection[] = [
    {
      title: 'Check Identity',
      description: 'Core check fields and bank-clearing lifecycle.',
      fields: [
        { key: 'checkTransactionNumber', label: 'Check Txn #', value: check.checkTransactionNumber, column: 1, order: 0 },
        { key: 'checkNumber', label: 'Check #', value: check.checkNumber, column: 2, order: 0 },
        { key: 'status', label: 'Status', value: check.status, column: 3, order: 0 },
        { key: 'checkDate', label: 'Check Date', value: formatDate(check.checkDate), column: 4, order: 0, type: 'date' },
      ],
    },
    {
      title: 'Payment Instrument',
      description: 'Payee, bank account, payment, and bank-feed linkage.',
      fields: [
        { key: 'payeeName', label: 'Payee', value: check.payeeName, column: 1, order: 0 },
        { key: 'vendorId', label: 'Vendor', value: check.vendor ? `${check.vendor.vendorNumber} - ${check.vendor.name}` : '-', href: check.vendorId ? `/vendors/${check.vendorId}` : null, column: 2, order: 0 },
        { key: 'amount', label: 'Amount', value: money(check.amount, check.currency.code), column: 3, order: 0, fieldType: 'currency' },
        { key: 'currencyId', label: 'Currency', value: `${check.currency.code} - ${check.currency.name}`, column: 4, order: 0 },
        { key: 'bankAccountId', label: 'Bank Account', value: check.bankAccount.name, href: `/bank-accounts/${check.bankAccountId}`, column: 1, order: 1 },
        { key: 'cashGl', label: 'Cash GL', value: `${check.bankAccount.glAccount.accountNumber} - ${check.bankAccount.glAccount.name}`, href: `/chart-of-accounts/${check.bankAccount.glAccountId}`, column: 2, order: 1 },
        { key: 'billPaymentId', label: 'Bill Payment', value: check.billPayment?.number ?? '-', href: check.billPaymentId ? `/bill-payments/${check.billPaymentId}` : null, column: 3, order: 1 },
        { key: 'bankFeedTransactionId', label: 'Bank Feed Transaction', value: check.bankFeedTransactionId ?? '-', column: 4, order: 1 },
        { key: 'subsidiaryId', label: 'Subsidiary', value: `${check.subsidiary.subsidiaryId} - ${check.subsidiary.name}`, column: 1, order: 2 },
        { key: 'memo', label: 'Memo', value: check.memo ?? '-', column: 2, order: 2 },
      ],
    },
  ]

  const currencyContextSections: RecordHeaderSection[] = [
    {
      title: 'Currency Context',
      description: 'Transaction currency and amount context for check clearing.',
      fields: [
        { key: 'transactionAmount', label: 'TXN Amount', value: money(check.amount, check.currency.code), column: 1, order: 0, fieldType: 'currency' },
        { key: 'fxRateAudit', label: 'FX Rate Audit', value: 'Configured exchange rates', column: 2, order: 0 },
        { key: 'fxRateType', label: 'FX Rate Type', value: 'spot', column: 3, order: 0 },
        { key: 'translationStatus', label: 'Translation Status', value: 'Local ready | Functional ready | Group ready', column: 4, order: 0 },
        { key: 'localAmount', label: 'Local Amount', value: money(check.amount, check.currency.code), column: 1, order: 1, fieldType: 'currency' },
        { key: 'localFxRate', label: 'Local FX Rate', value: `1 ${check.currency.code} = 1.000000 ${check.currency.code}`, column: 2, order: 1 },
        { key: 'realizedFxFunctional', label: 'Realized FX Functional', value: '-', column: 3, order: 1 },
        { key: 'postingStatus', label: 'Posting Status', value: check.status, column: 4, order: 1 },
        { key: 'functionalAmount', label: 'Functional Amount', value: money(check.amount, check.currency.code), column: 1, order: 2, fieldType: 'currency' },
        { key: 'functionalFxRate', label: 'Functional FX Rate', value: `1 ${check.currency.code} = 1.000000 ${check.currency.code}`, column: 2, order: 2 },
        { key: 'realizedFxLocal', label: 'Realized FX Local', value: '-', column: 3, order: 2 },
        { key: 'bankFeedOpenItem', label: 'Bank Feed Transaction', value: check.bankFeedTransactionId ?? '-', column: 4, order: 2 },
        { key: 'groupAmount', label: 'Group Amount', value: money(check.amount, check.currency.code), column: 1, order: 3, fieldType: 'currency' },
        { key: 'groupFxRate', label: 'Group FX Rate', value: `1 ${check.currency.code} = 1.000000 ${check.currency.code}`, column: 2, order: 3 },
        { key: 'realizedFxGroup', label: 'Realized FX Group', value: '-', column: 3, order: 3 },
      ],
    },
  ]

  const referenceSections: RecordHeaderSection[] = [
    {
      title: 'Contact And Counterparty',
      description: 'Payee, vendor, and bank-side references for the check.',
      fields: [
        { key: 'payeeReference', label: 'Payee', value: check.payeeName, column: 1, order: 0 },
        { key: 'vendorReference', label: 'Vendor', value: check.vendor ? `${check.vendor.vendorNumber} - ${check.vendor.name}` : '-', href: check.vendorId ? `/vendors/${check.vendorId}` : null, column: 2, order: 0 },
        { key: 'bankAccountReference', label: 'Bank Account', value: check.bankAccount.name, href: `/bank-accounts/${check.bankAccountId}`, column: 3, order: 0 },
        { key: 'cashAccountReference', label: 'Cash Account', value: `${check.bankAccount.glAccount.accountNumber} - ${check.bankAccount.glAccount.name}`, href: `/chart-of-accounts/${check.bankAccount.glAccountId}`, column: 4, order: 0 },
      ],
    },
    {
      title: 'Reference Details',
      description: 'System references, source feed links, and audit timestamps.',
      fields: [
        { key: 'billPaymentReference', label: 'Bill Payment', value: check.billPayment?.number ?? '-', href: check.billPaymentId ? `/bill-payments/${check.billPaymentId}` : null, column: 1, order: 0 },
        { key: 'bankFeedReference', label: 'Bank Feed Transaction', value: check.bankFeedTransactionId ?? '-', column: 2, order: 0 },
        { key: 'createdAt', label: 'Created', value: displayDateTime(check.createdAt), column: 3, order: 0 },
        { key: 'updatedAt', label: 'Last Modified', value: displayDateTime(check.updatedAt), column: 4, order: 0 },
      ],
    },
  ]

  const stats: TransactionStatDefinition<typeof check>[] = [
    { id: 'amount', label: 'Amount', getValue: () => money(check.amount, check.currency.code), accent: true },
    { id: 'status', label: 'Status', getValue: () => check.status, getValueTone: () => check.status === 'cleared' ? 'green' : 'default' },
    { id: 'bank', label: 'Bank Account', getValue: () => check.bankAccount.name, getHref: () => `/bank-accounts/${check.bankAccountId}` },
    { id: 'date', label: 'Check Date', getValue: () => displayDate(check.checkDate) },
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
  const detailHref = `/bank-checks/${check.id}`
  const customizePreviewValues: Record<string, string> = {
    transactionAmount: money(check.amount, check.currency.code),
    localAmount: money(check.amount, check.currency.code),
    functionalAmount: money(check.amount, check.currency.code),
    groupAmount: money(check.amount, check.currency.code),
    fxRateAudit: 'Configured exchange rates',
    fxRateType: 'spot',
    translationStatus: 'Local ready | Functional ready | Group ready',
    checkTransactionNumber: check.checkTransactionNumber,
    checkNumber: check.checkNumber,
    status: check.status,
    checkDate: displayDate(check.checkDate),
    payeeName: check.payeeName,
    vendorId: check.vendor ? `${check.vendor.vendorNumber} - ${check.vendor.name}` : '-',
    amount: money(check.amount, check.currency.code),
    currencyId: `${check.currency.code} - ${check.currency.name}`,
    bankAccountId: check.bankAccount.name,
    cashGl: `${check.bankAccount.glAccount.accountNumber} - ${check.bankAccount.glAccount.name}`,
    billPaymentId: check.billPayment?.number ?? '-',
    subsidiaryId: `${check.subsidiary.subsidiaryId} - ${check.subsidiary.name}`,
    memo: check.memo ?? '-',
    bankFeedTransactionId: check.bankFeedTransactionId ?? '-',
    journalEntryId: '-',
    createdAt: displayDateTime(check.createdAt),
    updatedAt: displayDateTime(check.updatedAt),
  }
  const customizeFields = BANK_CHECK_DETAIL_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue: customizePreviewValues[field.id] ?? '-',
  }))
  const statPreviewCards = [
    { id: 'amount', label: 'Amount', value: money(check.amount, check.currency.code), accent: true as const },
    { id: 'status', label: 'Status', value: check.status },
    { id: 'bank', label: 'Bank Account', value: check.bankAccount.name, href: `/bank-accounts/${check.bankAccountId}` },
    { id: 'date', label: 'Check Date', value: displayDate(check.checkDate) },
  ]

  return (
    <RecordDetailPageShell
      backHref="/bank-checks"
      backLabel="<- Back to Checks"
      meta={check.checkTransactionNumber}
      title={`Check ${check.checkNumber}`}
      badge={<span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: check.status === 'cleared' ? '#4ade80' : '#60a5fa', color: check.status === 'cleared' ? '#86efac' : '#bfdbfe' }}>{check.status}</span>}
      actions={
        <RecordDetailActionBar
          mode={isCustomizing ? 'customize' : 'detail'}
          newHref="/bank-matching?action=Match%20check"
          exportTitle={check.checkTransactionNumber}
          exportFileName={`check-${check.checkTransactionNumber}`}
          exportSections={exportSections}
          customizeHref={`${detailHref}?customize=1`}
          editHref={`${detailHref}?edit=1`}
          deleteResource="bank-checks"
          deleteId={check.id}
          deleteLabel="Delete"
          detailExtraActions={
            <Link href="/bank-matching?action=Match%20check" className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}>
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
            record={check}
            stats={stats}
            visibleStatCards={customization.statCards}
          />
        )}
        header={
          isCustomizing ? (
            <BankTransactionDetailCustomizeMode
              type="check"
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
              containerDescription="Read the transaction, local, functional, and group amounts from the check context."
              showSubsections={false}
            />
            <RecordHeaderDetails
              editing={false}
              sections={referenceSections}
              columns={4}
              containerTitle="Reference Details"
              containerDescription="Expanded context from linked records on this check."
            />
            <RecordHeaderDetails editing={false} sections={headerSections} columns={4} containerTitle="Check Details" />
          </div>
          )
        }
        lineItems={!isCustomizing ? (
          <TransactionGlImpactSection
            title="GL Impact"
            rows={glLines}
            emptyMessage="No GL impact for this check."
            currencyCodes={{ transaction: check.currency.code, local: check.currency.code, functional: check.currency.code, group: check.currency.code }}
          />
        ) : null}
        relatedMasterData={
          <RecordDetailSection title="Related Records" count={[check.vendorId, check.billPaymentId, check.bankAccountId].filter(Boolean).length}>
            <div className="grid gap-3 px-6 py-4 text-sm md:grid-cols-3">
              <Link href={`/bank-accounts/${check.bankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Bank Account: {check.bankAccount.name}</Link>
              {check.vendorId ? <Link href={`/vendors/${check.vendorId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Vendor: {check.vendor?.name}</Link> : <span style={{ color: 'var(--text-muted)' }}>No vendor linked.</span>}
              {check.billPaymentId ? <Link href={`/bill-payments/${check.billPaymentId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Bill Payment: {check.billPayment?.number}</Link> : <span style={{ color: 'var(--text-muted)' }}>No bill payment linked.</span>}
            </div>
          </RecordDetailSection>
        }
        relatedMasterDataCount={[check.vendorId, check.billPaymentId, check.bankAccountId].filter(Boolean).length}
      />
    </RecordDetailPageShell>
  )
}
