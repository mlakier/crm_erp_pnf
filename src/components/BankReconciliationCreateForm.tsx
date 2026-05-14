'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type BankAccountOption = {
  id: string
  label: string
  searchText: string
  bankName: string
  glAccount: string
  currencyCode: string
  unmatchedCount: number
  unmatchedAmount: string
  nextPeriodEndDate: string
  nextPeriodReason: string
  bankOpeningBalance: string
  bankActivityAmount: string
  bankActivityAmountValue: number
  bankEndingBalance: string
  bankEndingBalanceValue: number
  glOpeningBalance: string
  glActivityAmount: string
  glActivityAmountValue: number
  glEndingBalance: string
  glEndingBalanceValue: number
  previewDifference: string
  previewDifferenceValue: number
  bankLineCount: number
  glLineCount: number
  hasOpenReconciliation: boolean
  openReconciliationId: string
  openReconciliationNumber: string
  openReconciliationPeriodEnd: string
}

function money(amount: number, code: string) {
  return `${code} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function BankReconciliationCreateForm({ bankAccounts }: { bankAccounts: BankAccountOption[] }) {
  const router = useRouter()
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? '')
  const [periodEndDate, setPeriodEndDate] = useState(bankAccounts[0]?.nextPeriodEndDate ?? new Date().toISOString().slice(0, 10))
  const [statementBalance, setStatementBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const selectedAccount = bankAccounts.find((account) => account.id === bankAccountId)
  const enteredStatementBalance = Number(statementBalance)
  const hasEnteredStatementBalance = statementBalance.trim() !== '' && Number.isFinite(enteredStatementBalance)
  const reviewedBankEndingValue = selectedAccount
    ? hasEnteredStatementBalance ? enteredStatementBalance : selectedAccount.bankEndingBalanceValue
    : 0
  const reviewedDifferenceValue = selectedAccount
    ? reviewedBankEndingValue - selectedAccount.glEndingBalanceValue
    : 0
  const hasOpenWorkpaper = Boolean(selectedAccount?.hasOpenReconciliation)

  useEffect(() => {
    if (selectedAccount?.nextPeriodEndDate) {
      setPeriodEndDate(selectedAccount.nextPeriodEndDate)
    }
  }, [selectedAccount?.nextPeriodEndDate])

  async function createReconciliation() {
    if (!bankAccountId || !periodEndDate) {
      setMessage('Choose a bank account and period end date.')
      return
    }
    if (hasOpenWorkpaper) {
      setMessage(`Open ${selectedAccount?.openReconciliationNumber} before creating another workpaper for this bank account.`)
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/bank-reconciliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId,
          periodEndDate,
          autoCalculate: true,
          bankStatementBalance: statementBalance.trim() || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to create reconciliation.')
      }
      setMessage(`Created ${payload.reconciliationId ?? 'bank reconciliation'}.`)
      if (payload?.id) {
        router.push(`/bank-reconciliations/${payload.id}`)
        return
      }
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create reconciliation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <div className="mb-4">
        <h2 className="font-semibold text-white">Create Reconciliation Workpaper</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Review the account, period, open activity, and statement balance before creating the workpaper.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            Bank account
          </label>
          <SearchableSelect
            selectedValue={bankAccountId}
            onSelect={(value) => {
              setBankAccountId(value)
              const account = bankAccounts.find((option) => option.id === value)
              if (account?.nextPeriodEndDate) {
                setPeriodEndDate(account.nextPeriodEndDate)
              }
            }}
            options={bankAccounts.map((account) => ({ value: account.id, label: account.label, searchText: account.searchText }))}
            placeholder="Select bank account"
            searchPlaceholder="Search bank accounts"
            dropdownWidthMode="trigger"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            Period end
          </label>
          <input
            type="date"
            value={periodEndDate}
            onChange={(event) => setPeriodEndDate(event.target.value)}
            className="rounded-lg border px-3 py-2 text-sm text-white"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            Statement balance
          </label>
          <input
            type="number"
            step="0.01"
            value={statementBalance}
            onChange={(event) => setStatementBalance(event.target.value)}
            placeholder="Required to close"
            className="w-44 rounded-lg border px-3 py-2 text-sm text-white"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
          />
        </div>
        <button
          type="button"
          onClick={createReconciliation}
          disabled={saving || bankAccounts.length === 0 || hasOpenWorkpaper}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          {saving ? 'Creating...' : 'Create Reconciliation Workpaper'}
        </button>
      </div>

      {selectedAccount ? (
        <div className="mt-4 rounded-xl border p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)', borderColor: 'var(--border-muted)' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                Review Before Create
              </p>
              <p className="mt-1 font-semibold text-white">{selectedAccount.label}</p>
            </div>
            <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: selectedAccount.unmatchedCount ? '#f59e0b' : '#22c55e', color: selectedAccount.unmatchedCount ? '#fde68a' : '#bbf7d0' }}>
              {selectedAccount.unmatchedCount} unmatched
            </span>
          </div>
          <div className="grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
            <PreviewItem label="Bank" value={selectedAccount.bankName} />
            <PreviewItem label="GL Account" value={selectedAccount.glAccount} />
            <PreviewItem label="Period End" value={periodEndDate} />
            <PreviewItem label="Currency" value={selectedAccount.currencyCode} />
            {hasOpenWorkpaper ? (
              <div className="rounded-lg border px-3 py-2 xl:col-span-2" style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
                <p className="font-semibold uppercase tracking-[0.14em]" style={{ color: '#fde68a' }}>Open Workpaper</p>
                <p className="mt-1 text-white">
                  {selectedAccount.openReconciliationNumber} for {selectedAccount.openReconciliationPeriodEnd}
                </p>
                <a
                  href={`/bank-reconciliations/${selectedAccount.openReconciliationId}`}
                  className="mt-2 inline-flex text-xs font-semibold hover:underline"
                  style={{ color: '#bfdbfe' }}
                >
                  Open existing workpaper
                </a>
              </div>
            ) : null}
            <PreviewItem label="Statement Balance" value={hasEnteredStatementBalance ? money(enteredStatementBalance, selectedAccount.currencyCode) : 'Blank - use imported/estimated balance'} />
            <PreviewItem label="Open Activity" value={selectedAccount.unmatchedAmount} />
            <PreviewItem label="Period Basis" value={selectedAccount.nextPeriodReason} wide />
            <PreviewItem label="Creation Result" value="Creates a bank reconciliation workpaper with bank-vs-GL walkforward and activity detail." wide />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
            <table className="min-w-full text-xs">
              <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                  <th className="px-3 py-2">Activity Summary</th>
                  <th className="px-3 py-2 text-right">Opening</th>
                  <th className="px-3 py-2 text-right">Period Activity</th>
                  <th className="px-3 py-2 text-right">Ending</th>
                  <th className="px-3 py-2 text-right">Lines</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-3 py-2 font-semibold text-white">Bank</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.bankOpeningBalance}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.bankActivityAmount}</td>
                  <td className="px-3 py-2 text-right" style={{ color: hasEnteredStatementBalance ? '#bfdbfe' : 'var(--text-secondary)' }}>{money(reviewedBankEndingValue, selectedAccount.currencyCode)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.bankLineCount}</td>
                </tr>
                <tr className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-3 py-2 font-semibold text-white">GL</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.glOpeningBalance}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.glActivityAmount}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.glEndingBalance}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{selectedAccount.glLineCount}</td>
                </tr>
                <tr className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-3 py-2 font-semibold text-white">Preview Difference</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>-</td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ color: Math.abs(reviewedDifferenceValue) < 0.01 ? '#86efac' : '#fecaca' }}>{money(reviewedDifferenceValue, selectedAccount.currencyCode)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Enter the bank statement ending balance when you have it. If left blank, auto reconciliation uses an imported statement balance when available, otherwise estimates from bank activity.
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Sequence control: if this account has earlier bank or GL activity, the prior month must be reconciled before creating this period.
      </p>
      {message ? (
        <p className="mt-2 text-xs font-semibold" style={{ color: message.startsWith('Created') ? '#86efac' : '#fecaca' }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

function PreviewItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${wide ? 'xl:col-span-2' : ''}`} style={{ borderColor: 'var(--border-muted)' }}>
      <p className="font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  )
}
