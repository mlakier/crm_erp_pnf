'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import SearchableSelect from '@/components/SearchableSelect'

type AccountingPeriodOption = {
  id: string
  name: string
  subsidiaryId: string | null
  startDate: string
  endDate: string
}

type SubsidiaryOption = {
  id: string
  subsidiaryId: string
  name: string
}

type Props = {
  accountingPeriods: AccountingPeriodOption[]
  subsidiaries: SubsidiaryOption[]
  defaultAsOfDate: string
  ctaConfigured: boolean
}

export default function CurrencyTranslationRunPanel({
  accountingPeriods,
  subsidiaries,
  defaultAsOfDate,
  ctaConfigured,
}: Props) {
  const router = useRouter()
  const [accountingPeriodId, setAccountingPeriodId] = useState(accountingPeriods[0]?.id ?? '')
  const [subsidiaryId, setSubsidiaryId] = useState(accountingPeriods[0]?.subsidiaryId ?? '')
  const [asOfDate, setAsOfDate] = useState(accountingPeriods[0]?.endDate ?? defaultAsOfDate)
  const [includeChildren, setIncludeChildren] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const selectedPeriod = accountingPeriods.find((period) => period.id === accountingPeriodId) ?? null
  const canRun = Boolean(accountingPeriodId && asOfDate && subsidiaryId && ctaConfigured)

  const accountingPeriodOptions = accountingPeriods.map((period) => ({
    value: period.id,
    label: period.name,
    searchText: period.name,
  }))

  const subsidiaryOptions = subsidiaries.map((subsidiary) => ({
    value: subsidiary.id,
    label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
    searchText: `${subsidiary.subsidiaryId} ${subsidiary.name}`,
  }))

  function handleAccountingPeriodSelect(nextPeriodId: string) {
    const nextPeriod = accountingPeriods.find((period) => period.id === nextPeriodId)
    setAccountingPeriodId(nextPeriodId)
    setMessage(null)
    if (nextPeriod?.subsidiaryId) setSubsidiaryId(nextPeriod.subsidiaryId)
    if (nextPeriod?.endDate) setAsOfDate(nextPeriod.endDate)
  }

  async function handleRun() {
    setRunning(true)
    setMessage(null)

    try {
      const response = await fetch('/api/currency-translation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountingPeriodId,
          asOfDate,
          subsidiaryId: subsidiaryId || null,
          includeChildren,
        }),
      })

      const body = await response.json() as {
        error?: string
        runNumber?: string
        message?: string | null
        summary?: {
          translatedAccounts?: number
          failedItems?: number
          duplicateOfRunNumber?: string
          includeChildren?: boolean
          scopeCount?: number
          completed?: number
          skipped?: number
          failed?: number
        }
      }

      if (!response.ok) {
        setMessageType('error')
        setMessage(body.error ?? 'Unable to run currency translation.')
        return
      }

      setMessageType('success')
      setMessage(
        body.summary?.includeChildren
          ? body.message ?? `Parent-scope translation completed across ${body.summary.scopeCount ?? 0} subsidiaries.`
          : body.summary?.duplicateOfRunNumber
          ? `Skipped duplicate run. ${body.summary.duplicateOfRunNumber} already covers this subsidiary, period, and as-of date.`
          : body.message
          ?? `Translation ${body.runNumber ?? ''} completed. Translated accounts: ${body.summary?.translatedAccounts ?? 0}. Failed items: ${body.summary?.failedItems ?? 0}.`,
      )
      router.refresh()
    } catch {
      setMessageType('error')
      setMessage('Unable to run currency translation.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section
      className="mb-6 rounded-2xl border px-6 py-5"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Currency Translation / CTA Run
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Translate balance-sheet accounts to group currency using the closing rate and post the offset to the CTA account configured in Company Setup. This is separate from unrealized FX remeasurement.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Accounting Period</span>
          <SearchableSelect
            selectedValue={accountingPeriodId}
            onSelect={handleAccountingPeriodSelect}
            options={accountingPeriodOptions}
            placeholder="Select accounting period"
            searchPlaceholder="Search accounting period"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Subsidiary Scope</span>
          <SearchableSelect
            selectedValue={subsidiaryId}
            onSelect={setSubsidiaryId}
            options={subsidiaryOptions}
            placeholder="Select subsidiary"
            searchPlaceholder="Search subsidiary"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>As-Of Date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value)}
            className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
          {selectedPeriod ? (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Must fall between {selectedPeriod.startDate} and {selectedPeriod.endDate}.
            </span>
          ) : null}
        </label>

        <label
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
        >
          <input
            type="checkbox"
            checked={includeChildren}
            onChange={(event) => setIncludeChildren(event.target.checked)}
          />
          <span>Include child subsidiaries</span>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={running || !canRun}
            className="inline-flex w-full items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {running ? 'Running...' : 'Run Translation / CTA'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            label: 'Translation Basis',
            value: 'Balance-sheet accounts with Closing Rate treatment.',
            state: 'Live',
          },
          {
            label: 'Posting Layer',
            value: 'Posts group-currency true-up only; local and functional amounts stay untouched.',
            state: 'Live',
          },
          {
            label: 'CTA Offset',
            value: ctaConfigured
              ? 'Uses the company-wide CTA account from Company Setup.'
              : 'Configure a CTA account in Company Setup before running translation.',
            state: ctaConfigured ? 'Ready' : 'Required',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </p>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  borderColor: item.state === 'Required' ? 'var(--warning)' : 'var(--success)',
                  color: item.state === 'Required' ? 'var(--warning)' : 'var(--success)',
                }}
              >
                {item.state}
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {message ? (
        <p
          className="mt-3 text-sm"
          style={messageType === 'success' ? { color: '#86efac' } : { color: '#fca5a5' }}
        >
          {message}
        </p>
      ) : null}
    </section>
  )
}
