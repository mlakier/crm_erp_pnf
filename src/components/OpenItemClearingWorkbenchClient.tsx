'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import SearchableSelect from '@/components/SearchableSelect'

type Option = {
  value: string
  label: string
  searchText?: string
}

type AccountingPeriodOption = Option & {
  startDate: string
  endDate: string
}

export type ClearingWorkbenchOpenItem = {
  id: string
  openItemNumber: string
  openItemType: string
  accountType: string
  accountId: string | null
  sourceNumber: string | null
  subsidiaryId: string
  subsidiaryLabel: string
  transactionCurrencyId: string
  transactionCurrencyLabel: string
  localCurrencyLabel: string
  functionalCurrencyLabel: string
  groupCurrencyLabel: string
  counterpartyType: string | null
  counterpartyId: string | null
  counterpartyLabel: string
  accountLabel: string
  postingDate: string | null
  dueDate: string | null
  originalTransactionAmount: number
  originalLocalAmount: number | null
  originalFunctionalAmount: number | null
  originalGroupAmount: number | null
  remainingTransactionAmount: number
  remainingLocalAmount: number | null
  remainingFunctionalAmount: number | null
  remainingGroupAmount: number | null
}

function humanize(value: string | null | undefined) {
  if (!value) return '-'
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-'
  return Number(value || 0).toFixed(2)
}

function rate(layerAmount: number | null | undefined, transactionAmount: number) {
  if (layerAmount == null || Math.abs(transactionAmount) < 0.000001) return '-'
  return (layerAmount / transactionAmount).toFixed(6)
}

function sameNullable(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return true
  return left === right
}

function isEligibleTarget(source: ClearingWorkbenchOpenItem | null, target: ClearingWorkbenchOpenItem) {
  if (!source) return false
  if (source.id === target.id) return false
  if (source.subsidiaryId !== target.subsidiaryId) return false
  if (source.transactionCurrencyId !== target.transactionCurrencyId) return false
  if (!sameNullable(source.counterpartyType, target.counterpartyType)) return false
  if (!sameNullable(source.counterpartyId, target.counterpartyId)) return false
  if (source.remainingTransactionAmount <= 0) return false
  if (target.remainingTransactionAmount <= 0) return false
  return true
}

function openItemFamily(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('receivable') || normalized.includes('receipt') || normalized.includes('customer') || normalized.includes('credit')) {
    return 'ltc'
  }
  if (normalized.includes('payable') || normalized.includes('payment') || normalized.includes('vendor') || normalized.includes('bill')) {
    return 'ptp'
  }
  return 'rtr'
}

function dateDistanceDays(left: string | null, right: string | null) {
  if (!left || !right) return null
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return null
  return Math.abs(Math.round((leftTime - rightTime) / 86_400_000))
}

function scoreMatch(source: ClearingWorkbenchOpenItem, target: ClearingWorkbenchOpenItem) {
  let score = 0
  const reasons: string[] = []
  const amountDelta = Math.abs(source.remainingTransactionAmount - target.remainingTransactionAmount)
  const maxAmount = Math.max(source.remainingTransactionAmount, target.remainingTransactionAmount, 1)
  const amountDeltaPct = amountDelta / maxAmount
  const dueDateDays = dateDistanceDays(source.dueDate, target.dueDate)
  const postingDateDays = dateDistanceDays(source.postingDate, target.postingDate)

  if (amountDelta <= 0.005) {
    score += 45
    reasons.push('exact amount match')
  } else if (amountDeltaPct <= 0.05) {
    score += 30
    reasons.push('amounts are within 5%')
  } else if (amountDeltaPct <= 0.2) {
    score += 15
    reasons.push('amounts are directionally close')
  }

  if (source.counterpartyType && source.counterpartyId && source.counterpartyType === target.counterpartyType && source.counterpartyId === target.counterpartyId) {
    score += 25
    reasons.push('same counterparty')
  }

  if (openItemFamily(source.openItemType) === openItemFamily(target.openItemType)) {
    score += 10
    reasons.push('same business flow')
  }

  if (source.sourceNumber && target.sourceNumber && source.sourceNumber === target.sourceNumber) {
    score += 10
    reasons.push('same source reference')
  }

  if (dueDateDays != null && dueDateDays <= 7) {
    score += 6
    reasons.push('due dates are close')
  } else if (postingDateDays != null && postingDateDays <= 7) {
    score += 4
    reasons.push('posting dates are close')
  }

  const confidence = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low'
  return {
    score,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['eligible by subsidiary, currency, and counterparty'],
    amountDelta,
  }
}

function compactCurrencyLabel(value: string) {
  return value.split(' - ')[0] || value
}

function maxDate(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? ''
}

function proportionalAmount(
  baseTransactionAmount: number | null | undefined,
  baseLayerAmount: number | null | undefined,
  appliedTransactionAmount: number,
) {
  if (baseLayerAmount == null || !baseTransactionAmount || Math.abs(baseTransactionAmount) < 0.000001) return null
  return Math.round((baseLayerAmount / baseTransactionAmount) * appliedTransactionAmount * 100) / 100
}

function LayerStack({ item }: { item: ClearingWorkbenchOpenItem }) {
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold text-white">
        Txn {compactCurrencyLabel(item.transactionCurrencyLabel)} {money(item.remainingTransactionAmount)}
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Local {compactCurrencyLabel(item.localCurrencyLabel)} {money(item.remainingLocalAmount)} @ {rate(item.remainingLocalAmount, item.remainingTransactionAmount)}
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Functional {compactCurrencyLabel(item.functionalCurrencyLabel)} {money(item.remainingFunctionalAmount)} @ {rate(item.remainingFunctionalAmount, item.remainingTransactionAmount)}
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Group {compactCurrencyLabel(item.groupCurrencyLabel)} {money(item.remainingGroupAmount)} @ {rate(item.remainingGroupAmount, item.remainingTransactionAmount)}
      </p>
    </div>
  )
}

export default function OpenItemClearingWorkbenchClient({
  openItems,
  subsidiaryOptions,
  currencyOptions,
  accountTypeOptions,
  accountOptions,
  customerOptions,
  vendorOptions,
  accountingPeriodOptions,
}: {
  openItems: ClearingWorkbenchOpenItem[]
  subsidiaryOptions: Option[]
  currencyOptions: Option[]
  accountTypeOptions: Option[]
  accountOptions: Option[]
  customerOptions: Option[]
  vendorOptions: Option[]
  accountingPeriodOptions: AccountingPeriodOption[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [subsidiaryId, setSubsidiaryId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [accountType, setAccountType] = useState('')
  const [accountId, setAccountId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [postingDate, setPostingDate] = useState('')
  const [accountingPeriodId, setAccountingPeriodId] = useState('')
  const [basket, setBasket] = useState<Record<string, string>>({})

  const itemById = useMemo(() => new Map(openItems.map((item) => [item.id, item])), [openItems])
  const targetItem = itemById.get(targetId) ?? null
  const basketRows = Object.entries(basket)
    .map(([id, amount]) => ({ item: itemById.get(id), amount: Number(amount) || 0 }))
    .filter((row): row is { item: ClearingWorkbenchOpenItem; amount: number } => Boolean(row.item))
  const basketTotal = basketRows.reduce((sum, row) => sum + row.amount, 0)
  const selectedMatch = basketRows.length === 1 && targetItem ? scoreMatch(basketRows[0].item, targetItem) : null
  const earliestAllowedPostingDate = maxDate([
    targetItem?.postingDate,
    ...basketRows.map((row) => row.item.postingDate),
  ])
  const fxPreview = targetItem
    ? [
        {
          label: 'Local',
          currency: compactCurrencyLabel(targetItem.localCurrencyLabel),
          sourceAmount: basketRows.reduce((sum, row) => {
            const amount = proportionalAmount(row.item.remainingTransactionAmount, row.item.remainingLocalAmount, row.amount)
            return amount == null ? sum : sum + amount
          }, 0),
          targetAmount:
            proportionalAmount(targetItem.originalTransactionAmount, targetItem.originalLocalAmount, basketTotal)
            ?? proportionalAmount(targetItem.remainingTransactionAmount, targetItem.remainingLocalAmount, basketTotal),
        },
        {
          label: 'Functional',
          currency: compactCurrencyLabel(targetItem.functionalCurrencyLabel),
          sourceAmount: basketRows.reduce((sum, row) => {
            const amount = proportionalAmount(row.item.remainingTransactionAmount, row.item.remainingFunctionalAmount, row.amount)
            return amount == null ? sum : sum + amount
          }, 0),
          targetAmount:
            proportionalAmount(targetItem.originalTransactionAmount, targetItem.originalFunctionalAmount, basketTotal)
            ?? proportionalAmount(targetItem.remainingTransactionAmount, targetItem.remainingFunctionalAmount, basketTotal),
        },
        {
          label: 'Group',
          currency: compactCurrencyLabel(targetItem.groupCurrencyLabel),
          sourceAmount: basketRows.reduce((sum, row) => {
            const amount = proportionalAmount(row.item.remainingTransactionAmount, row.item.remainingGroupAmount, row.amount)
            return amount == null ? sum : sum + amount
          }, 0),
          targetAmount:
            proportionalAmount(targetItem.originalTransactionAmount, targetItem.originalGroupAmount, basketTotal)
            ?? proportionalAmount(targetItem.remainingTransactionAmount, targetItem.remainingGroupAmount, basketTotal),
        },
      ].map((layer) => ({
        ...layer,
        impact: layer.targetAmount == null ? null : Math.round((layer.sourceAmount - layer.targetAmount) * 100) / 100,
      }))
    : []
  const sourceAccountLabels = Array.from(new Set(basketRows.map((row) => row.item.accountLabel).filter(Boolean)))
  const targetAccountLabel = targetItem?.accountLabel ?? null
  const needsRecognitionPolicy = basketRows.some((row) => {
    const sourceType = `${row.item.openItemType} ${row.item.accountLabel}`.toLowerCase()
    const targetType = `${targetItem?.openItemType ?? ''} ${targetItem?.accountLabel ?? ''}`.toLowerCase()
    return (
      sourceType.includes('prepaid') ||
      targetType.includes('prepaid') ||
      sourceType.includes('deferred') ||
      targetType.includes('deferred')
    )
  })
  const hasFxPreviewImpact = fxPreview.some((layer) => layer.impact != null && Math.abs(layer.impact) >= 0.005)

  const blocker =
    !targetItem
      ? 'Choose a target open item.'
      : basketRows.length === 0
        ? 'Add one or more source open items.'
        : !accountingPeriodId || !postingDate
          ? 'Choose the clearing posting period and posting date.'
          : earliestAllowedPostingDate && postingDate < earliestAllowedPostingDate
            ? `Posting date cannot be earlier than selected open item dates. Use ${earliestAllowedPostingDate} or later.`
            : basketRows.some((row) => !isEligibleTarget(row.item, targetItem))
              ? 'One or more selected sources are not eligible for this target.'
              : basketRows.some((row) => row.amount <= 0)
                ? 'Every selected source needs a positive amount.'
                : basketRows.some((row) => row.amount > row.item.remainingTransactionAmount)
                  ? 'A selected amount exceeds the source remaining balance.'
                  : basketTotal > targetItem.remainingTransactionAmount + 0.005
                    ? 'Selected source total exceeds the target remaining balance.'
                    : null

  const filteredItems = openItems.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) {
      const haystack = [
        item.openItemNumber,
        item.sourceNumber,
        item.openItemType,
        item.accountType,
        item.accountLabel,
        item.subsidiaryLabel,
        item.transactionCurrencyLabel,
        item.localCurrencyLabel,
        item.functionalCurrencyLabel,
        item.groupCurrencyLabel,
        item.counterpartyLabel,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(normalizedQuery)) return false
    }
    if (subsidiaryId && item.subsidiaryId !== subsidiaryId) return false
    if (currencyId && item.transactionCurrencyId !== currencyId) return false
    if (accountType && item.accountType !== accountType) return false
    if (accountId && item.accountId !== accountId) return false
    if (customerId && !(item.counterpartyType === 'customer' && item.counterpartyId === customerId)) return false
    if (vendorId && !(item.counterpartyType === 'vendor' && item.counterpartyId === vendorId)) return false
    return true
  })

  const suggestedSources = targetItem
    ? openItems
        .filter((item) => isEligibleTarget(item, targetItem))
        .map((item) => ({ item, match: scoreMatch(item, targetItem) }))
        .sort((left, right) => right.match.score - left.match.score || left.match.amountDelta - right.match.amountDelta)
        .slice(0, 5)
    : []

  const canCreate = !blocker && Boolean(targetItem)

  function periodForDate(value: string | null) {
    if (!value) return null
    const time = new Date(`${value}T00:00:00`).getTime()
    if (!Number.isFinite(time)) return null
    return accountingPeriodOptions.find((period) => {
      const start = new Date(`${period.startDate}T00:00:00`).getTime()
      const end = new Date(`${period.endDate}T23:59:59`).getTime()
      return time >= start && time <= end
    }) ?? null
  }

  function applyPostingDefaultFromItem(item: ClearingWorkbenchOpenItem) {
    const candidateDate = item.postingDate ?? item.dueDate ?? ''
    if (candidateDate) {
      setPostingDate((current) => {
        if (!current) return candidateDate
        return current < candidateDate ? candidateDate : current
      })
      const period = periodForDate(candidateDate)
      if (period) setAccountingPeriodId((current) => current || period.value)
    }
  }

  function clearTarget() {
    setTargetId('')
  }

  function chooseTarget(item: ClearingWorkbenchOpenItem) {
    if (targetId === item.id) {
      clearTarget()
      return
    }

    setTargetId(item.id)
    setSubsidiaryId(item.subsidiaryId)
    setCurrencyId(item.transactionCurrencyId)
    if (item.counterpartyType === 'customer' && item.counterpartyId) {
      setCustomerId(item.counterpartyId)
      setVendorId('')
    }
    if (item.counterpartyType === 'vendor' && item.counterpartyId) {
      setVendorId(item.counterpartyId)
      setCustomerId('')
    }
    applyPostingDefaultFromItem(item)
    setBasket((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([sourceItemId]) => {
          const source = itemById.get(sourceItemId)
          return source ? isEligibleTarget(source, item) : false
        }),
      ),
    )
  }

  function addSourceToBasket(item: ClearingWorkbenchOpenItem) {
    if (targetItem && !isEligibleTarget(item, targetItem)) return
    applyPostingDefaultFromItem(item)
    setBasket((current) => {
      const currentTotal = Object.entries(current).reduce((sum, [id, amount]) => {
        if (id === item.id) return sum
        return sum + (Number(amount) || 0)
      }, 0)
      const targetRemaining = targetItem?.remainingTransactionAmount ?? item.remainingTransactionAmount
      const availableRoom = Math.max(targetRemaining - currentTotal, 0)
      const suggestedAmount = Math.min(item.remainingTransactionAmount, availableRoom || item.remainingTransactionAmount)
      return {
        ...current,
        [item.id]: current[item.id] ?? money(suggestedAmount),
      }
    })
  }

  function updateBasketAmount(itemId: string, amount: string) {
    setBasket((current) => ({ ...current, [itemId]: amount }))
  }

  function removeBasketSource(itemId: string) {
    setBasket((current) => {
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  function createClearingDocument() {
    if (!canCreate || !targetItem) return
    const lines = basketRows.map((row) => ({
      fromOpenItemId: row.item.id,
      toOpenItemId: targetItem.id,
      amount: money(row.amount),
    }))
    const search = new URLSearchParams({
      toOpenItemId: targetItem.id,
      amount: money(basketTotal),
      lines: JSON.stringify(lines),
      postingDate,
      accountingPeriodId,
      sourceTransactionType: 'open-item-clearing-workbench',
      sourceTransactionId: targetItem.id,
    })
    router.push(`/clearing-documents/new?${search.toString()}`)
  }

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
            Record To Report
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Open Item Clearing Workbench</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Filter open items, select one clearing target, add one or many sources, then choose the close period that will receive the clearing document.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/clearing-documents"
            className="rounded-lg border px-3.5 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Clearing Documents
          </Link>
          <Link
            href="/clearing-documents/new"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            Manual Document
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Filters</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Narrow by customer, vendor, account, currency, or subsidiary before selecting source and target items.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSubsidiaryId('')
              setCurrencyId('')
              setAccountType('')
              setAccountId('')
              setCustomerId('')
              setVendorId('')
            }}
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Clear Filters
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <label className="flex flex-col gap-1 text-xs xl:col-span-2" style={{ color: 'var(--text-muted)' }}>
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Open item, source, account, counterparty"
              className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Customer
            <SearchableSelect selectedValue={customerId} onSelect={setCustomerId} options={customerOptions} placeholder="All customers" searchPlaceholder="Search customer" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Vendor
            <SearchableSelect selectedValue={vendorId} onSelect={setVendorId} options={vendorOptions} placeholder="All vendors" searchPlaceholder="Search vendor" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Account
            <SearchableSelect selectedValue={accountId} onSelect={setAccountId} options={accountOptions} placeholder="All accounts" searchPlaceholder="Search account" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Subsidiary
            <SearchableSelect selectedValue={subsidiaryId} onSelect={setSubsidiaryId} options={subsidiaryOptions} placeholder="All subsidiaries" searchPlaceholder="Search subsidiary" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Currency
            <SearchableSelect selectedValue={currencyId} onSelect={setCurrencyId} options={currencyOptions} placeholder="All currencies" searchPlaceholder="Search currency" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Account Type
            <SearchableSelect selectedValue={accountType} onSelect={setAccountType} options={accountTypeOptions} placeholder="All types" searchPlaceholder="Search account type" />
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Clearing Posting Period
            <SearchableSelect selectedValue={accountingPeriodId} onSelect={setAccountingPeriodId} options={accountingPeriodOptions} placeholder="Choose close period" searchPlaceholder="Search period" />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Clearing Posting Date
            <input
              type="date"
              value={postingDate}
              min={earliestAllowedPostingDate || undefined}
              onChange={(event) => setPostingDate(event.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)', colorScheme: 'dark' }}
            />
            {earliestAllowedPostingDate ? (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Earliest allowed: {earliestAllowedPostingDate}
              </span>
            ) : null}
          </label>
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: blocker ? 'var(--warning)' : 'var(--success)', backgroundColor: 'var(--card-elevated)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: blocker ? 'var(--warning)' : 'var(--success)' }}>
              {blocker ? 'Not Ready' : 'Ready'}
            </p>
            <p className="mt-1 max-w-md" style={{ color: 'var(--text-secondary)' }}>
              {blocker ?? `Create clearing for ${money(basketTotal)} in the selected close period.`}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <h2 className="text-base font-semibold text-white">Open Items</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredItems.length} shown from {openItems.length} open items</p>
          </div>
        </div>
        <div className="record-list-scroll-region overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {['Open Item', 'Type', 'Subsidiary', 'Counterparty', 'Account', 'Posting', 'Due', 'Currency Layers', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No open items match the current filters.</td>
                </tr>
              ) : filteredItems.map((item, index) => {
                const eligibleTarget = basketRows.length > 0 ? basketRows.every((row) => isEligibleTarget(row.item, item)) : true
                const eligibleSource = targetItem ? isEligibleTarget(item, targetItem) : true
                const match = targetItem && eligibleSource ? scoreMatch(item, targetItem) : null
                return (
                  <tr key={item.id} style={index < filteredItems.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/open-items/${item.id}`} className="font-semibold hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {item.openItemNumber}
                      </Link>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.sourceNumber ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{humanize(item.openItemType)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.subsidiaryLabel}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.counterpartyLabel}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.accountLabel}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.postingDate ?? '-'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.dueDate ?? '-'}</td>
                    <td className="px-4 py-3 text-sm"><LayerStack item={item} /></td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addSourceToBasket(item)}
                          disabled={!eligibleSource}
                          className="rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                          style={{
                            borderColor: basket[item.id] ? 'var(--accent-primary-strong)' : 'var(--border-muted)',
                            color: basket[item.id] ? '#fff' : 'var(--text-secondary)',
                            backgroundColor: basket[item.id] ? 'var(--accent-primary-strong)' : 'transparent',
                          }}
                        >
                          {basket[item.id] ? 'Selected' : 'Source'}
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseTarget(item)}
                          disabled={!eligibleTarget}
                          title={targetId === item.id ? 'Click to unselect target' : basketRows.length > 0 ? (eligibleTarget ? 'Eligible target' : 'Target must match all selected sources') : 'Choose target'}
                          className="rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                          style={{
                            borderColor: targetId === item.id ? 'var(--success)' : 'var(--border-muted)',
                            color: targetId === item.id ? '#fff' : 'var(--text-secondary)',
                            backgroundColor: targetId === item.id ? 'var(--success)' : 'transparent',
                          }}
                        >
                          {targetId === item.id ? 'Unselect' : 'Target'}
                        </button>
                      </div>
                      {match ? (
                        <p className="mt-1 max-w-56 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {match.reasons.join(', ')}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Selected Target Basket</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>The open item being cleared down by the selected sources.</p>
            </div>
            {targetItem ? (
              <button
                type="button"
                onClick={clearTarget}
                className="rounded-md border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--danger)' }}
              >
                Clear Target
              </button>
            ) : null}
          </div>
          {targetItem ? (
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--success)', backgroundColor: 'var(--card-elevated)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{targetItem.openItemNumber}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{targetItem.sourceNumber ?? humanize(targetItem.openItemType)} - {targetItem.counterpartyLabel}</p>
                </div>
                <p className="text-sm font-semibold text-white">{money(targetItem.remainingTransactionAmount)}</p>
              </div>
              <div className="mt-4">
                <LayerStack item={targetItem} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)', backgroundColor: 'var(--card-elevated)' }}>
              Choose any row as the target. Clicking the selected target again will unselect it.
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Selected Source Basket</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Use this for one-to-one, many-to-one, and partial month-end clearing.</p>
            </div>
            <p className="text-sm font-semibold text-white">
              {money(basketTotal)} / {targetItem ? money(targetItem.remainingTransactionAmount) : '-'}
            </p>
          </div>
          {basketRows.length > 0 ? (
            <div className="space-y-2">
              {basketRows.map((row) => (
                <div key={row.item.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_10rem_auto]" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
                  <div>
                    <p className="text-sm font-semibold text-white">{row.item.openItemNumber}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.item.sourceNumber ?? humanize(row.item.openItemType)} - remaining {money(row.item.remainingTransactionAmount)}</p>
                    <div className="mt-2">
                      <LayerStack item={row.item} />
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={row.item.remainingTransactionAmount}
                    step="0.01"
                    value={basket[row.item.id] ?? ''}
                    onChange={(event) => updateBasketAmount(row.item.id, event.target.value)}
                    className="rounded-md border bg-transparent px-3 py-2 text-right text-sm text-white"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeBasketSource(row.item.id)}
                    className="rounded-md border px-3 py-2 text-xs font-semibold"
                    style={{ borderColor: 'var(--border-muted)', color: 'var(--danger)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)', backgroundColor: 'var(--card-elevated)' }}>
              Add one or more sources from the listing. For monthly clearing, select only the source lines for the month you are closing.
            </div>
          )}
        </section>
      </div>

      {suggestedSources.length > 0 ? (
        <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Suggested Sources</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Best source candidates for the selected target item.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {suggestedSources.map(({ item, match }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addSourceToBasket(item)}
                className="rounded-xl border p-3 text-left transition"
                style={{
                  borderColor: basket[item.id] ? 'var(--accent-primary-strong)' : 'var(--border-muted)',
                  backgroundColor: basket[item.id] ? 'rgba(59, 130, 246, 0.16)' : 'var(--card-elevated)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.openItemNumber}</p>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: match.confidence === 'High' ? 'var(--success)' : match.confidence === 'Medium' ? 'var(--warning)' : 'var(--border-muted)',
                      color: match.confidence === 'High' ? 'var(--success)' : match.confidence === 'Medium' ? 'var(--warning)' : 'var(--text-muted)',
                    }}
                  >
                    {match.confidence}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{item.sourceNumber ?? humanize(item.openItemType)}</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{money(item.remainingTransactionAmount)}</p>
                <p className="mt-2 line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{match.reasons.join(', ')}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {targetItem && basketRows.length > 0 ? (
        <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              FX Preview
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Projected Realized FX Impact</h2>
            <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
              This compares the selected source layer amounts to the target carrying basis for the transaction amount being cleared.
              Final posted FX is calculated again when the clearing document posts using the posting date/rate context.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {fxPreview.map((layer) => (
              <div
                key={layer.label}
                className="rounded-xl border p-4"
                style={{
                  borderColor: layer.impact == null || Math.abs(layer.impact) < 0.005 ? 'var(--border-muted)' : 'var(--warning)',
                  backgroundColor: 'var(--card-elevated)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{layer.label}</p>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}>
                    {layer.currency}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt style={{ color: 'var(--text-muted)' }}>Selected source basis</dt>
                    <dd className="font-semibold text-white">{money(layer.sourceAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt style={{ color: 'var(--text-muted)' }}>Target carrying basis</dt>
                    <dd className="font-semibold text-white">{money(layer.targetAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--border-muted)' }}>
                    <dt style={{ color: 'var(--text-muted)' }}>Projected FX impact</dt>
                    <dd className="font-semibold" style={{ color: layer.impact == null || Math.abs(layer.impact) < 0.005 ? 'var(--success)' : 'var(--warning)' }}>
                      {money(layer.impact)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: blocker ? 'var(--warning)' : 'var(--success)', backgroundColor: 'var(--card)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: blocker ? 'var(--warning)' : 'var(--success)' }}>
              Clearing Preview
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">{blocker ? 'Not ready yet' : 'Ready to create clearing document'}</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {blocker ?? `Clear ${money(basketTotal)} against ${targetItem?.openItemNumber} using posting date ${postingDate}.`}
            </p>
            {selectedMatch ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Match reasons: {selectedMatch.reasons.join(', ')}
              </p>
            ) : null}
            {targetItem || basketRows.length > 0 ? (
              <div className="mt-4 grid gap-3 text-xs md:grid-cols-2">
                <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15,23,42,0.32)' }}>
                  <p className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Source balance account
                  </p>
                  <div className="mt-2 space-y-1">
                    {basketRows.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No source selected.</p>
                    ) : (
                      basketRows.map((row) => (
                        <p key={row.item.id} className="text-white">
                          {row.item.openItemNumber}: {row.item.accountLabel}
                        </p>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15,23,42,0.32)' }}>
                  <p className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Target balance account
                  </p>
                  <p className="mt-2 text-white">
                    {targetItem ? `${targetItem.openItemNumber}: ${targetItem.accountLabel}` : 'No target selected.'}
                  </p>
                </div>
                <div className="rounded-xl border px-3 py-2" style={{ borderColor: needsRecognitionPolicy ? 'var(--warning)' : 'var(--border-muted)', backgroundColor: 'rgba(15,23,42,0.32)' }}>
                  <p className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Recognition / expense account
                  </p>
                  <p className="mt-2" style={{ color: needsRecognitionPolicy ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {needsRecognitionPolicy
                      ? 'Not resolved here - requires schedule/source document or RTR policy.'
                      : 'Not required for this clearing preview.'}
                  </p>
                </div>
                <div className="rounded-xl border px-3 py-2" style={{ borderColor: hasFxPreviewImpact ? 'var(--warning)' : 'var(--border-muted)', backgroundColor: 'rgba(15,23,42,0.32)' }}>
                  <p className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    FX adjustment account
                  </p>
                  <p className="mt-2" style={{ color: hasFxPreviewImpact ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {hasFxPreviewImpact
                      ? 'Not resolved here - requires RTR FX account policy.'
                      : 'No projected FX account needed.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={createClearingDocument}
            disabled={!canCreate}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: canCreate ? 'var(--accent-primary-strong)' : 'var(--border-muted)' }}
          >
            Create Clearing Document
          </button>
        </div>
      </section>
    </div>
  )
}
