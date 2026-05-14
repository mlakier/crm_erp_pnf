'use client'

import { useState } from 'react'
import { MASTER_DATA_ENTITY_OPTIONS, MASTER_DATA_IMPORT_SCHEMA, type SupportedEntity } from '@/lib/master-data-import-schema'
import SearchableSelect from '@/components/SearchableSelect'

type ImportMode = 'add' | 'update' | 'addOrUpdate'

type ImportResult = {
  entity: string
  mode: ImportMode
  dryRun: boolean
  totalRows: number
  succeeded: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export default function MasterDataImportForm() {
  const [entity, setEntity] = useState<SupportedEntity>('currencies')
  const [mode, setMode] = useState<ImportMode>('addOrUpdate')
  const [dryRun, setDryRun] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const selectedSchema = MASTER_DATA_IMPORT_SCHEMA[entity]
  const requiredFields = selectedSchema.fields.filter((field) => field.required)
  const optionalFields = selectedSchema.fields.filter((field) => !field.required)
  const selectedEntityLabel = MASTER_DATA_ENTITY_OPTIONS.find((option) => option.value === entity)?.label ?? selectedSchema.label
  const statusLabel = uploading
    ? (dryRun ? 'Checking' : 'Committing')
    : error
      ? 'Error'
      : result
        ? result.failed > 0
          ? (result.dryRun ? 'Needs cleanup' : 'Commit needs cleanup')
          : (result.dryRun ? 'Clean' : 'Committed')
        : 'Not checked'
  const statusTone = uploading ? 'checking' : error ? 'error' : result ? (result.failed > 0 ? 'error' : 'clean') : 'idle'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Please select a CSV or XLSX file.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('entity', entity)
      formData.append('mode', mode)
      formData.append('dryRun', String(dryRun))
      formData.append('file', file)

      const response = await fetch('/api/master-data/import', {
        method: 'POST',
        body: formData,
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body?.error ?? 'Import failed')
        return
      }
      setResult(body as ImportResult)
    } catch {
      setError('Import failed')
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
              <h2 className="text-base font-semibold text-white">1. Choose Upload Type</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Select the master-data family first. The required fields, template, and custom-field columns update from that choice.
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'rgba(96, 165, 250, 0.55)', color: '#bfdbfe', backgroundColor: 'rgba(37, 99, 235, 0.16)' }}>
              {selectedEntityLabel}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Master Data Type</span>
              <SearchableSelect
                selectedValue={entity}
                options={MASTER_DATA_ENTITY_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                placeholder="Select master data type"
                onSelect={(value) => {
                  setEntity((value || 'currencies') as SupportedEntity)
                  setResult(null)
                  setError('')
                }}
              />
            </label>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
              <p className="text-sm font-semibold text-white">Required fields for {selectedEntityLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {requiredFields.map((field) => (
                  <span key={field.key} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: '#fecaca', backgroundColor: 'rgba(127, 29, 29, 0.18)' }}>
                    {field.templateLabel ?? field.key}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                These columns must be present and populated. Upload also accepts current field labels, friendly aliases, and technical keys.
              </p>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-sm font-semibold text-white">Template automation</p>
              <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                The downloaded template includes the latest supported fields and active custom fields for this record type.
              </p>
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = `/api/master-data/templates?entity=${entity}`
                  link.download = `${entity}_template.xlsx`
                  link.click()
                }}
                className="mt-4 rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--text-tertiary)' }}
              >
                Download Current Template
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h2 className="text-base font-semibold text-white">2. Validate And Import</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            Keep dry run on until the result comes back clean. Then turn it off to commit the same file.
          </p>

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

            <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Import Mode</span>
              <SearchableSelect
                selectedValue={mode}
                options={[
                  { value: 'addOrUpdate', label: 'Add or Update (Upsert)' },
                  { value: 'add', label: 'Add Only' },
                  { value: 'update', label: 'Update Only' },
                ]}
                placeholder="Select import mode"
                onSelect={(value) => setMode((value || 'addOrUpdate') as ImportMode)}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(event) => setDryRun(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-white">Dry run only</span>
                <span className="mt-1 block text-xs leading-5">
                  Validate headers, required fields, references, custom fields, and row errors without writing changes.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="rounded-md px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: dryRun ? 'var(--accent)' : 'var(--accent-primary-strong)' }}
            >
              {uploading ? 'Processing...' : dryRun ? 'Validate File' : 'Commit Import'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            <p className="text-xs">
              {file ? (
                <>
                  Selected file: <span className="text-white">{file.name}</span>
                </>
              ) : (
                'No file selected yet.'
              )}
            </p>
            <ValidationStatusBadge label={statusLabel} tone={statusTone} />
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-400/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        </section>
      </div>

      <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Selected Upload Contract</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              This is the field contract for {selectedEntityLabel}. Required fields are highlighted above; optional fields are accepted when present.
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            {selectedSchema.fields.length} supported fields
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {optionalFields.map((field) => (
            <div key={field.key} className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
              <p className="text-sm font-semibold text-white">{field.templateLabel ?? field.key}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Optional</p>
            </div>
          ))}
        </div>
      </section>

      {result ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: result.failed > 0 ? 'rgba(248, 113, 113, 0.45)' : 'rgba(74, 222, 128, 0.35)', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Import Result</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {result.mode === 'addOrUpdate' ? 'Add or Update' : result.mode === 'add' ? 'Add Only' : 'Update Only'} | {result.dryRun ? 'Dry Run' : 'Committed'}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: result.failed > 0 ? 'rgba(248, 113, 113, 0.5)' : 'rgba(74, 222, 128, 0.45)', color: result.failed > 0 ? '#fecaca' : '#bbf7d0' }}>
              {result.failed > 0 ? 'Needs cleanup' : 'Clean'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ResultStat label="Rows" value={String(result.totalRows)} />
            <ResultStat label="Succeeded" value={String(result.succeeded)} />
            <ResultStat label="Failed" value={String(result.failed)} />
          </div>

          {result.errors.length > 0 ? (
            <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'rgba(248, 113, 113, 0.35)' }}>
              <p className="text-sm font-semibold text-white">Row Errors</p>
              <ul className="mt-3 space-y-2 text-xs" style={{ color: 'var(--danger)' }}>
                {result.errors.slice(0, 50).map((entry, index) => (
                  <li key={`${entry.row}-${index}`} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                    Row {entry.row}: {entry.message}
                  </li>
                ))}
              </ul>
              {result.errors.length > 50 ? (
                <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Showing first 50 errors.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(74, 222, 128, 0.35)', color: '#bbf7d0' }}>
              No validation errors.
            </p>
          )}
        </section>
      ) : null}
    </form>
  )
}

function ValidationStatusBadge({ label, tone }: { label: string; tone: 'idle' | 'checking' | 'clean' | 'error' }) {
  const styles = {
    idle: {
      borderColor: 'var(--border-muted)',
      color: 'var(--text-secondary)',
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
    },
    checking: {
      borderColor: 'rgba(96, 165, 250, 0.5)',
      color: '#bfdbfe',
      backgroundColor: 'rgba(37, 99, 235, 0.16)',
    },
    clean: {
      borderColor: 'rgba(74, 222, 128, 0.5)',
      color: '#bbf7d0',
      backgroundColor: 'rgba(22, 101, 52, 0.16)',
    },
    error: {
      borderColor: 'rgba(248, 113, 113, 0.5)',
      color: '#fecaca',
      backgroundColor: 'rgba(127, 29, 29, 0.18)',
    },
  }[tone]

  const icon = tone === 'clean' ? '✓' : tone === 'error' ? '!' : tone === 'checking' ? '…' : '-'

  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={styles}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}
