'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  id: string
  bankAccountId: string
  currencyCode: string
  bankStatementBalance: string
  difference: string
  status: string
  unmatchedCount: number
}

function isZero(amount: string) {
  return Math.abs(Number(amount)) < 0.01
}

export default function BankReconciliationResolutionActions({
  id,
  bankAccountId,
  currencyCode,
  bankStatementBalance,
  difference,
  status,
  unmatchedCount,
}: Props) {
  const router = useRouter()
  const [statementBalance, setStatementBalance] = useState(bankStatementBalance)
  const [saving, setSaving] = useState<'balance' | 'recalc' | 'close' | 'reopen' | 'delete' | null>(null)
  const [message, setMessage] = useState('')
  const canClose = isZero(difference)

  async function updateReconciliation(action: 'balance' | 'recalc' | 'close') {
    setSaving(action)
    setMessage('')
    try {
      const response = await fetch('/api/bank-reconciliations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          bankStatementBalance: statementBalance,
          autoCalculate: action === 'recalc' || action === 'close',
          status: action === 'close' ? 'reconciled' : undefined,
          aiReviewStatus: action === 'close' ? 'clean' : undefined,
          reviewerNotes: action === 'close' ? 'Reconciliation closed with zero difference.' : undefined,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to update reconciliation.')
      }
      setMessage(action === 'close' ? 'Closed.' : 'Updated.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update reconciliation.')
    } finally {
      setSaving(null)
    }
  }

  async function reopenReconciliation() {
    setSaving('reopen')
    setMessage('')
    try {
      const response = await fetch('/api/bank-reconciliations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'open',
          autoCalculate: true,
          reviewerNotes: 'Reopened for reconciliation review.',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to reopen reconciliation.')
      }
      setMessage('Reopened.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reopen reconciliation.')
    } finally {
      setSaving(null)
    }
  }

  async function deleteReconciliation() {
    if (!window.confirm('Delete this bank reconciliation? This removes the workpaper, not the underlying bank or GL activity.')) return
    setSaving('delete')
    setMessage('')
    try {
      const response = await fetch('/api/bank-reconciliations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to delete reconciliation.')
      }
      window.location.assign('/bank-reconciliations')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete reconciliation.')
      setSaving(null)
    }
  }

  return (
    <div className="min-w-[260px] space-y-2">
      <div className="flex items-end gap-2">
        <label className="block flex-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Statement balance
          <input
            type="number"
            step="0.01"
            value={statementBalance}
            onChange={(event) => setStatementBalance(event.target.value)}
            className="mt-1 w-full rounded-md border px-2 py-1 text-xs text-white"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
          />
        </label>
        <button
          type="button"
          onClick={() => updateReconciliation('balance')}
          disabled={saving !== null || status === 'reconciled'}
          className="rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}
        >
          {saving === 'balance' ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`/bank-matching?bankAccountId=${bankAccountId}`}
          className="rounded-md border px-2 py-1 text-xs font-semibold"
          style={{ borderColor: unmatchedCount ? '#f59e0b' : '#93c5fd', color: unmatchedCount ? '#fde68a' : '#bfdbfe' }}
        >
          {unmatchedCount ? `Resolve ${unmatchedCount} unmatched` : 'Open Matching'}
        </a>
        <button
          type="button"
          onClick={() => updateReconciliation('recalc')}
          disabled={saving !== null || status === 'reconciled'}
          className="rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: '#93c5fd', color: '#bfdbfe' }}
        >
          {saving === 'recalc' ? 'Recalculating...' : 'Recalculate GL'}
        </button>
        <button
          type="button"
          onClick={() => updateReconciliation('close')}
          disabled={saving !== null || !canClose || status === 'reconciled'}
          title={canClose ? 'Close this reconciliation.' : `Clear the ${currencyCode} difference before closing.`}
          className="rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: canClose ? '#22c55e' : '#f59e0b', color: canClose ? '#bbf7d0' : '#fde68a' }}
        >
          {saving === 'close' ? 'Closing...' : 'Close'}
        </button>
        {status === 'reconciled' ? (
          <button
            type="button"
            onClick={reopenReconciliation}
            disabled={saving !== null}
            className="rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: '#f59e0b', color: '#fde68a' }}
          >
            {saving === 'reopen' ? 'Reopening...' : 'Reopen'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={deleteReconciliation}
          disabled={saving !== null}
          className="rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: '#f87171', color: '#fecaca' }}
        >
          {saving === 'delete' ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      {message ? (
        <p className="text-xs" style={{ color: message.includes('Unable') || message.includes('Difference') ? '#fecaca' : '#86efac' }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
