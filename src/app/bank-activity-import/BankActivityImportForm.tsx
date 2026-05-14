'use client'

import Link from 'next/link'
import { useState } from 'react'
import SearchableSelect from '@/components/SearchableSelect'

type BankAccountOption = {
  id: string
  label: string
  helper: string
  currencyCode: string
}

type ImportResult = {
  dryRun: boolean
  totalRows: number
  succeeded: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export default function BankActivityImportForm({ bankAccounts }: { bankAccounts: BankAccountOption[] }) {
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? '')
  const [dryRun, setDryRun] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const selectedAccount = bankAccounts.find((account) => account.id === bankAccountId)
  const statusLabel = uploading
    ? dryRun ? 'Checking' : 'Committing'
    : error
      ? 'Error'
      : result
        ? result.failed > 0
          ? 'Needs cleanup'
          : dryRun
            ? 'Clean'
            : 'Committed'
        : 'Not checked'
  const statusColor = uploading ? '#bfdbfe' : error || (result?.failed ?? 0) > 0 ? '#fecaca' : result ? '#86efac' : 'var(--text-muted)'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)
    if (!bankAccountId) {
      setError('Please select a bank account.')
      return
    }
    if (!file) {
      setError('Please select a CSV or XLSX file.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('bankAccountId', bankAccountId)
      formData.append('dryRun', String(dryRun))
      formData.append('file', file)
      const response = await fetch('/api/bank-feed-transactions/import', {
        method: 'POST',
        body: formData,
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body?.error ?? 'Import failed.')
        return
      }
      setResult(body as ImportResult)
    } catch {
      setError('Import failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">1. Choose Bank Account</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Imported activity inherits currency, connection, and GL account from the selected bank account.
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'rgba(96, 165, 250, 0.55)', color: '#bfdbfe', backgroundColor: 'rgba(37, 99, 235, 0.16)' }}>
              {selectedAccount?.currencyCode ?? 'No Account'}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Bank Account</span>
              <SearchableSelect
                selectedValue={bankAccountId}
                options={bankAccounts.map((account) => ({
                  value: account.id,
                  label: account.label,
                  searchText: `${account.label} ${account.helper}`,
                }))}
                placeholder="Select bank account"
                searchPlaceholder="Search bank accounts"
                onSelect={(value) => {
                  setBankAccountId(value)
                  setResult(null)
                  setError('')
                }}
              />
            </label>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
              <p className="text-sm font-semibold text-white">Required columns</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['transactionDate', 'description', 'amount'].map((field) => (
                  <span key={field} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: '#fecaca', backgroundColor: 'rgba(127, 29, 29, 0.18)' }}>
                    {field}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                Optional columns: currency, counterparty, reference, postedDate, direction. Currency must match the selected bank account.
              </p>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-sm font-semibold text-white">Template</p>
              <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                Download a simple activity template with the required headers marked.
              </p>
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = '/api/bank-feed-transactions/template'
                  link.download = 'bank_activity_template.xlsx'
                  link.click()
                }}
                className="mt-4 rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--text-tertiary)' }}
              >
                Download Template
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">2. Validate And Import</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Keep dry run on until the status comes back clean, then turn it off to load the same file into matching.
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: statusColor, color: statusColor }}>
              {statusLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>File</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setResult(null)
                  setError('')
                }}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
              <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                CSV and XLSX are supported.
              </span>
            </label>
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <p className="font-semibold text-white">Selected account</p>
              <p className="mt-2 text-xs leading-5">{selectedAccount?.helper ?? 'No bank account selected.'}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} className="mt-1" />
              <span>
                <span className="block font-semibold text-white">Dry run only</span>
                <span className="mt-1 block text-xs leading-5">
                  Validate headers, required fields, currency, and duplicate references without writing changes.
                </span>
              </span>
            </label>
            <button type="submit" disabled={uploading} className="rounded-md px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: dryRun ? 'var(--accent)' : 'var(--accent-primary-strong)' }}>
              {uploading ? 'Processing...' : dryRun ? 'Validate File' : 'Commit Import'}
            </button>
          </div>

          <div className="mt-4 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            {file ? <>Selected file: <span className="text-white">{file.name}</span></> : 'No file selected yet.'}
          </div>
          {error ? <div className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#f87171', color: '#fecaca' }}>{error}</div> : null}
        </section>
      </div>

      {result ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: result.failed ? '#f87171' : '#4ade80', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Import Result</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{result.dryRun ? 'Dry Run' : 'Committed'}</p>
            </div>
            {!result.dryRun && result.failed === 0 ? (
              <Link href="/bank-matching" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }}>
                Open Matching Workbench
              </Link>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}><p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Rows</p><p className="mt-2 text-2xl font-semibold text-white">{result.totalRows}</p></div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}><p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Succeeded</p><p className="mt-2 text-2xl font-semibold text-white">{result.succeeded}</p></div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}><p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Failed</p><p className="mt-2 text-2xl font-semibold text-white">{result.failed}</p></div>
          </div>
          {result.errors.length > 0 ? (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold text-white">Row Errors</p>
              {result.errors.slice(0, 50).map((rowError) => (
                <div key={`${rowError.row}-${rowError.message}`} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: '#fecaca' }}>
                  Row {rowError.row}: {rowError.message}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </form>
  )
}
