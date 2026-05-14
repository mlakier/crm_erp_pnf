'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type BankAccountOption = {
  id: string
  label: string
  subsidiaryId: string
  currencyId: string
}

type ProposedBill = {
  id: string
  number: string
  vendor: string
  subsidiary: string
  subsidiaryId: string
  currencyCode: string
  currencyId: string
  dueDate: string | null
  openAmount: number
}

function money(value: number, code?: string | null) {
  return `${code ?? ''} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim()
}

export default function PaymentRunCreateClient({
  proposals,
  bankAccounts,
}: {
  proposals: ProposedBill[]
  bankAccounts: BankAccountOption[]
}) {
  const router = useRouter()
  const [selectedBillIds, setSelectedBillIds] = useState(() => proposals.map((bill) => bill.id))
  const [paymentMethod, setPaymentMethod] = useState('ach')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? '')
  const [memo, setMemo] = useState('')
  const [releaseNow, setReleaseNow] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedBills = useMemo(
    () => proposals.filter((bill) => selectedBillIds.includes(bill.id)),
    [proposals, selectedBillIds],
  )
  const total = selectedBills.reduce((sum, bill) => sum + bill.openAmount, 0)
  const selectedContext = selectedBills[0] ?? null
  const availableBankAccounts = useMemo(() => {
    if (!selectedContext) return bankAccounts
    return bankAccounts.filter(
      (account) => account.subsidiaryId === selectedContext.subsidiaryId && account.currencyId === selectedContext.currencyId,
    )
  }, [bankAccounts, selectedContext])
  const mixedContext = selectedBills.some(
    (bill) => selectedContext && (bill.subsidiaryId !== selectedContext.subsidiaryId || bill.currencyId !== selectedContext.currencyId),
  )

  function toggleBill(billId: string) {
    setSelectedBillIds((current) =>
      current.includes(billId) ? current.filter((id) => id !== billId) : [...current, billId],
    )
    setError('')
  }

  async function createRun() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/payment-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billIds: selectedBillIds,
          paymentDate,
          paymentMethod,
          bankAccountId,
          memo,
          release: releaseNow,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error ?? 'Unable to create payment run.')
      router.push(`/payment-runs/${body.id}`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create payment run.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <h2 className="text-lg font-semibold text-white">Release Controls</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This is the control step before payments become posted ERP transactions and later match to bank activity.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Payment Method</span>
              <div className="mt-2">
                <SearchableSelect
                  selectedValue={paymentMethod}
                  onSelect={(value) => setPaymentMethod(value || 'ach')}
                  options={[
                    { value: 'ach', label: 'ACH' },
                    { value: 'check', label: 'Check' },
                    { value: 'wire', label: 'Wire' },
                  ]}
                  placeholder="Select payment method"
                  searchPlaceholder="Search payment methods"
                  dropdownWidthMode="trigger"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Payment Date</span>
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Bank Account</span>
              <div className="mt-2">
                <SearchableSelect
                  selectedValue={bankAccountId}
                  onSelect={(value) => setBankAccountId(value)}
                  options={availableBankAccounts.map((account) => ({ value: account.id, label: account.label }))}
                  placeholder={availableBankAccounts.length === 0 ? 'No matching bank account' : 'Select bank account'}
                  searchPlaceholder="Search bank accounts"
                  dropdownWidthMode="trigger"
                />
              </div>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Memo</span>
              <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }} />
            </label>
            <label className="flex items-center gap-3 text-sm text-white md:col-span-2">
              <input type="checkbox" checked={releaseNow} onChange={(event) => setReleaseNow(event.target.checked)} />
              Create bill payments now
            </label>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: mixedContext ? '#f87171' : 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Run Summary</p>
          <p className="mt-3 text-3xl font-semibold text-white">{selectedBills.length}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>selected bills</p>
          <p className="mt-4 text-2xl font-semibold text-white">{money(total, selectedContext?.currencyCode)}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>payment total</p>
          {mixedContext ? <p className="mt-4 text-sm" style={{ color: '#fecaca' }}>Selected bills must share one subsidiary and currency.</p> : null}
          {error ? <p className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#f87171', color: '#fecaca' }}>{error}</p> : null}
          <button
            type="button"
            disabled={saving || selectedBills.length === 0 || mixedContext || !bankAccountId}
            onClick={createRun}
            className="mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            {saving ? 'Creating...' : releaseNow ? 'Create and Release Payment Run' : 'Create Draft Payment Run'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-lg font-semibold text-white">Proposed Payment Lines</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Select the bills to include. Released runs create bill payments; check runs also create check register records.
          </p>
        </div>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Include</th>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Subsidiary</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Open Amount</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No open bills found.</td>
              </tr>
            ) : proposals.map((bill) => (
              <tr key={bill.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedBillIds.includes(bill.id)} onChange={() => toggleBill(bill.id)} />
                </td>
                <td className="px-4 py-3 font-semibold text-white">{bill.number}</td>
                <td className="px-4 py-3 text-white">{bill.vendor}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{bill.subsidiary}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{bill.dueDate ?? '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">{money(bill.openAmount, bill.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
