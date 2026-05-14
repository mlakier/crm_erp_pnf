import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import { CANONICAL_EXCHANGE_RATE_TYPES, normalizeExchangeRateType } from '@/lib/exchange-rate-types'
import { fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'

function fmtEffectiveDateUtc(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = String(date.getUTCFullYear())
  return `${month}/${day}/${year}`
}

export default async function ExchangeRateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  const isEditing = edit === '1'
  const [{ moneySettings }, exchangeRate] = await Promise.all([
    loadCompanyDisplaySettings(),
    prisma.exchangeRate.findUnique({
      where: { id },
      include: { baseCurrency: true, quoteCurrency: true },
    }),
  ])

  if (!exchangeRate) notFound()

  const detailHref = `/exchange-rates/${exchangeRate.id}`
  const rateTypeOptions = CANONICAL_EXCHANGE_RATE_TYPES.map((option) => ({ value: option.value, label: option.label }))
  const activeOptions = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]
  const detailSections: InlineRecordSection[] = [
    {
      title: 'Exchange Rate Details',
      description: 'Currency pair, rate type, effective date, and source details for this FX rate.',
      fields: [
        { name: 'pair', label: 'Currency Pair', value: `${exchangeRate.baseCurrency.code}/${exchangeRate.quoteCurrency.code}`, readOnly: true },
        { name: 'effectiveDate', label: 'Effective Date', value: fmtEffectiveDateUtc(exchangeRate.effectiveDate), readOnly: true },
        { name: 'rate', label: 'Rate', value: exchangeRate.rate.toFixed(6), type: 'number' },
        { name: 'rateType', label: 'Rate Type', value: normalizeExchangeRateType(exchangeRate.rateType), type: 'select', options: rateTypeOptions },
        { name: 'source', label: 'Source', value: exchangeRate.source ?? '' },
        { name: 'active', label: 'Active', value: String(exchangeRate.active), type: 'select', options: activeOptions },
        { name: 'notes', label: 'Notes', value: exchangeRate.notes ?? '' },
      ],
    },
    {
      title: 'System Information',
      description: 'System-managed identifiers and timestamps.',
      fields: [
        { name: 'id', label: 'DB Id', value: exchangeRate.id, readOnly: true },
        { name: 'createdAt', label: 'Created', value: fmtDocumentDate(exchangeRate.createdAt, moneySettings), readOnly: true },
        { name: 'updatedAt', label: 'Last Modified', value: fmtDocumentDate(exchangeRate.updatedAt, moneySettings), readOnly: true },
      ],
    },
  ]

  return (
    <RecordDetailPageShell
      backHref="/exchange-rates"
      backLabel="<- Back to Exchange Rates"
      meta={fmtEffectiveDateUtc(exchangeRate.effectiveDate)}
      title={`${exchangeRate.baseCurrency.code}/${exchangeRate.quoteCurrency.code}`}
      badge={
        <span
          className="inline-block rounded-full px-3 py-0.5 text-sm"
          style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
        >
          {exchangeRate.rateType}
        </span>
      }
      actions={
        <RecordDetailActionBar
          mode={isEditing ? 'edit' : 'detail'}
          detailHref={detailHref}
          formId={`inline-record-form-${exchangeRate.id}`}
          exportTitle={`${exchangeRate.baseCurrency.code}/${exchangeRate.quoteCurrency.code}`}
          exportFileName={`exchange-rate-${exchangeRate.baseCurrency.code}-${exchangeRate.quoteCurrency.code}-${fmtEffectiveDateUtc(exchangeRate.effectiveDate)}`}
          exportSections={detailSections}
          editHref={`${detailHref}?edit=1`}
          deleteResource="exchange-rates"
          deleteId={exchangeRate.id}
        />
      }
    >
      <MasterDataHeaderDetails
        resource="exchange-rates"
        id={exchangeRate.id}
        title="Exchange Rate Details"
        sections={detailSections}
        editing={isEditing}
        columns={3}
      />
    </RecordDetailPageShell>
  )
}
