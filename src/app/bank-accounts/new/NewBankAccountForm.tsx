'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import SearchableSelect from '@/components/SearchableSelect'

type Option = { id: string; label: string }

export default function NewBankAccountForm({
  subsidiaries,
  currencies,
  glAccounts,
  connections,
}: {
  subsidiaries: Option[]
  currencies: Option[]
  glAccounts: Option[]
  connections: Option[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [accountType, setAccountType] = useState('checking')
  const [subsidiaryId, setSubsidiaryId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [glAccountId, setGlAccountId] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [statementSource, setStatementSource] = useState('manual_import')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    const response = await fetch('/api/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error ?? 'Unable to create bank account.')
      setSaving(false)
      return
    }
    router.push('/bank-accounts')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/bank-accounts" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            ← Back to Bank Accounts
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-white">New Bank Account</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            This links a real bank account setup to one GL cash account. Connection details can be added now or later.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bank-accounts" className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Name *</span>
            <input name="name" required className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Bank Name *</span>
            <input name="bankName" required className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Account Type *</span>
            <input type="hidden" name="accountType" value={accountType} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={accountType}
                onSelect={setAccountType}
                options={[
                  { value: 'checking', label: 'Checking' },
                  { value: 'savings', label: 'Savings' },
                  { value: 'money_market', label: 'Money Market' },
                  { value: 'credit_card', label: 'Credit Card' },
                  { value: 'merchant', label: 'Merchant' },
                ]}
                placeholder="Select account type"
                searchPlaceholder="Search account type"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Masked Account Number</span>
            <input name="maskedAccountNumber" placeholder="••••1234" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Subsidiary *</span>
            <input type="hidden" name="subsidiaryId" value={subsidiaryId} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={subsidiaryId}
                onSelect={setSubsidiaryId}
                options={subsidiaries.map((option) => ({ value: option.id, label: option.label }))}
                placeholder="Select subsidiary"
                searchPlaceholder="Search subsidiaries"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Currency *</span>
            <input type="hidden" name="currencyId" value={currencyId} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={currencyId}
                onSelect={setCurrencyId}
                options={currencies.map((option) => ({ value: option.id, label: option.label }))}
                placeholder="Select currency"
                searchPlaceholder="Search currencies"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Linked GL Cash Account *</span>
            <input type="hidden" name="glAccountId" value={glAccountId} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={glAccountId}
                onSelect={setGlAccountId}
                options={glAccounts.map((option) => ({ value: option.id, label: option.label }))}
                placeholder="Select linked GL cash account"
                searchPlaceholder="Search GL accounts"
                dropdownWidthMode="trigger"
              />
            </div>
            {glAccounts.length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>No unlinked GL accounts are currently marked as bank/cash accounts.</p>
            ) : null}
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Bank Connection</span>
            <input type="hidden" name="connectionId" value={connectionId} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={connectionId}
                onSelect={setConnectionId}
                options={connections.map((option) => ({ value: option.id, label: option.label }))}
                placeholder="Manual import / not connected"
                searchPlaceholder="Search connections"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Statement Source</span>
            <input type="hidden" name="statementSource" value={statementSource} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={statementSource}
                onSelect={setStatementSource}
                options={[
                  { value: 'manual_import', label: 'Manual Import' },
                  { value: 'bank_feed', label: 'Bank Feed' },
                  { value: 'file_upload', label: 'File Upload' },
                ]}
                placeholder="Select statement source"
                searchPlaceholder="Search source"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Reconciliation Start Date</span>
            <input name="reconciliationStartDate" type="date" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Next Check Number</span>
            <input name="nextCheckNumber" type="number" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
        </div>
        {error ? <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#f87171', color: '#fecaca' }}>{error}</div> : null}
      </div>
    </form>
  )
}
