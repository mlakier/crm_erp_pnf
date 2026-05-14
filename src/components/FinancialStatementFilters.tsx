'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import SearchableSelect from '@/components/SearchableSelect'
import type { FinancialStatementAmountLayer } from '@/lib/financial-statement-report'

type Option = {
  id: string
  label: string
}

function dateInputValue(value: Date | null | undefined) {
  if (!value) return ''
  return value.toISOString().slice(0, 10)
}

export default function FinancialStatementFilters({
  basePath,
  periods,
  subsidiaries,
  selectedPeriodId,
  selectedSubsidiaryId,
  startDate,
  endDate,
  amountLayer,
  includeChildren,
  showAccountDetail,
  showStartDate,
  dateMode = showStartDate ? 'range' : 'asOf',
  showAccountDetailToggle = true,
}: {
  basePath: string
  periods: Option[]
  subsidiaries: Option[]
  selectedPeriodId: string | null
  selectedSubsidiaryId: string | null
  startDate: Date | null
  endDate: Date
  amountLayer: FinancialStatementAmountLayer
  includeChildren: boolean
  showAccountDetail: boolean
  showStartDate: boolean
  dateMode?: 'asOf' | 'range' | 'month'
  showAccountDetailToggle?: boolean
}) {
  const router = useRouter()
  const [periodId, setPeriodId] = useState(selectedPeriodId ?? '')
  const [subsidiaryId, setSubsidiaryId] = useState(selectedSubsidiaryId ?? '')
  const [nextStartDate, setNextStartDate] = useState(dateInputValue(startDate))
  const [nextEndDate, setNextEndDate] = useState(dateInputValue(endDate))
  const [nextAmountLayer, setNextAmountLayer] = useState(amountLayer)
  const [nextIncludeChildren, setNextIncludeChildren] = useState(includeChildren)
  const [nextShowAccountDetail, setNextShowAccountDetail] = useState(showAccountDetail)

  const periodOptions = periods.map((period) => ({
    value: period.id,
    label: period.label,
    searchText: period.label,
  }))
  const subsidiaryOptions = [
    { value: '', label: 'All subsidiaries', searchText: 'All subsidiaries' },
    ...subsidiaries.map((subsidiary) => ({
      value: subsidiary.id,
      label: subsidiary.label,
      searchText: subsidiary.label,
    })),
  ]
  const amountLayerOptions = [
    { value: 'functional', label: 'Functional', searchText: 'Functional' },
    { value: 'local', label: 'Local', searchText: 'Local' },
    { value: 'group', label: 'Group', searchText: 'Group' },
    { value: 'transaction', label: 'Transaction', searchText: 'Transaction' },
  ]

  function submit() {
    const params = new URLSearchParams()
    if (periodId) params.set('periodId', periodId)
    if (subsidiaryId) params.set('subsidiaryId', subsidiaryId)
    if (nextIncludeChildren) params.set('includeChildren', 'true')
    if (showAccountDetailToggle && nextShowAccountDetail) params.set('showAccountDetail', 'true')
    if (nextAmountLayer) params.set('amountLayer', nextAmountLayer)
    if (dateMode === 'range' && nextStartDate) params.set('startDate', nextStartDate)
    if (dateMode !== 'month' && nextEndDate) params.set('endDate', nextEndDate)
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <div
      className="mb-4 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      <div className="grid gap-2 md:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs md:col-span-2" style={{ color: 'var(--text-muted)' }}>
          <span>{dateMode === 'month' ? 'Month' : 'Period'}</span>
          <SearchableSelect
            selectedValue={periodId}
            onSelect={setPeriodId}
            options={periodOptions}
            placeholder="Select period"
            searchPlaceholder="Search periods"
            dropdownWidthMode="trigger"
          />
        </label>

        {dateMode === 'range' ? (
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Start Date</span>
            <input
              type="date"
              value={nextStartDate}
              onChange={(event) => setNextStartDate(event.target.value)}
              className="rounded-md border bg-transparent px-2.5 py-1.5 text-xs text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </label>
        ) : null}

        {dateMode !== 'month' ? (
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{dateMode === 'range' ? 'End Date' : 'As Of Date'}</span>
            <input
              type="date"
              value={nextEndDate}
              onChange={(event) => setNextEndDate(event.target.value)}
              className="rounded-md border bg-transparent px-2.5 py-1.5 text-xs text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-xs md:col-span-2" style={{ color: 'var(--text-muted)' }}>
          <span>Subsidiary</span>
          <SearchableSelect
            selectedValue={subsidiaryId}
            onSelect={setSubsidiaryId}
            options={subsidiaryOptions}
            placeholder="Select subsidiary"
            searchPlaceholder="Search subsidiaries"
            dropdownWidthMode="content"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Amount Layer</span>
          <SearchableSelect
            selectedValue={nextAmountLayer}
            onSelect={(value) => setNextAmountLayer((value || 'functional') as FinancialStatementAmountLayer)}
            options={amountLayerOptions}
            placeholder="Select layer"
            searchPlaceholder="Search layers"
            dropdownWidthMode="trigger"
            clearSelectionOnQueryChange={false}
          />
        </label>

        <label
          className="mt-5 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
        >
          <input
            type="checkbox"
            checked={nextIncludeChildren}
            onChange={(event) => setNextIncludeChildren(event.target.checked)}
          />
          <span>Include children</span>
        </label>

        {showAccountDetailToggle ? (
          <label
            className="mt-5 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
          >
            <input
              type="checkbox"
              checked={nextShowAccountDetail}
              onChange={(event) => setNextShowAccountDetail(event.target.checked)}
            />
            <span>Show account detail</span>
          </label>
        ) : null}

        <div className="flex items-end">
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Refresh Report
          </button>
        </div>
      </div>
    </div>
  )
}
