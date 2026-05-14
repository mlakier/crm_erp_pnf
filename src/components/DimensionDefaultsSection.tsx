'use client'

import { useMemo, useState } from 'react'

import type { DimensionConfigurationRow } from '@/lib/dimension-control-plane'

type AssignmentRow = {
  dimensionDefinitionId: string
  valueId: string | null
  sourceModel: string | null
}

type Props = {
  targetType: 'customer' | 'vendor'
  targetId: string
  rows: DimensionConfigurationRow[]
  initialAssignments: AssignmentRow[]
}

export default function DimensionDefaultsSection({
  targetType,
  targetId,
  rows,
  initialAssignments,
}: Props) {
  const activeRows = useMemo(
    () => rows.filter((row) => row.isActive && (row.values.length > 0 || row.valueSourceType === 'generic')),
    [rows],
  )
  const [assignments, setAssignments] = useState<Record<string, { valueId: string; sourceModel: string }>>(() =>
    Object.fromEntries(
      initialAssignments
        .filter((assignment) => assignment.valueId)
        .map((assignment) => [
          assignment.dimensionDefinitionId,
          {
            valueId: assignment.valueId ?? '',
            sourceModel: assignment.sourceModel ?? 'dimension_value',
          },
        ]),
    ),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function updateAssignment(dimensionDefinitionId: string, value: string) {
    const [sourceModel, valueId] = value.includes(':') ? value.split(':', 2) : ['', '']
    setAssignments((current) => {
      const next = { ...current }
      if (!sourceModel || !valueId) {
        delete next[dimensionDefinitionId]
      } else {
        next[dimensionDefinitionId] = { sourceModel, valueId }
      }
      return next
    })
    setSaveState('idle')
    setErrorMessage(null)
  }

  async function save() {
    setSaveState('saving')
    setErrorMessage(null)
    try {
      const response = await fetch('/api/config/dimensions/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          assignments: activeRows.map((row) => ({
            dimensionDefinitionId: row.id,
            valueId: assignments[row.id]?.valueId ?? null,
            sourceModel: assignments[row.id]?.sourceModel ?? null,
          })),
        }),
      })
      const body = (await response.json().catch(() => null)) as { error?: string | null } | null
      if (!response.ok) throw new Error(body?.error || 'Failed to save dimension defaults.')
      setSaveState('saved')
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save dimension defaults.')
    }
  }

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Dimension Defaults</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            These values make this {targetType} a source for dimension sourcing policy. They are used only when the
            target transaction family includes {targetType === 'customer' ? 'Customer default' : 'Vendor default'} in
            its source priority and no higher-priority value wins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saved' ? <StatusPill label="Saved" tone="green" /> : null}
          {saveState === 'error' ? <StatusPill label="Needs Cleanup" tone="red" /> : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveState === 'saving'}
            className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saveState === 'saving' ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeRows.map((row) => {
          const selected = assignments[row.id]
          const selectedValue = selected ? `${selected.sourceModel}:${selected.valueId}` : ''
          return (
            <label key={row.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <span className="text-sm font-semibold text-white">{row.label}</span>
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                {row.dimensionKey} | {row.valueSourceCount} values
              </span>
              <select
                value={selectedValue}
                onChange={(event) => updateAssignment(row.id, event.target.value)}
                className="mt-3 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                <option value="" className="bg-slate-900">No default</option>
                {row.values.map((value) => (
                  <option key={`${value.sourceModel}:${value.id}`} value={`${value.sourceModel}:${value.id}`} className="bg-slate-900">
                    {value.code} - {value.name}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>
    </section>
  )
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'red' }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{
        borderColor: tone === 'green' ? 'rgba(34,197,94,0.55)' : 'rgba(248,113,113,0.55)',
        color: tone === 'green' ? '#86efac' : '#fca5a5',
        backgroundColor: tone === 'green' ? 'rgba(34,197,94,0.14)' : 'rgba(248,113,113,0.14)',
      }}
    >
      {label}
    </span>
  )
}
