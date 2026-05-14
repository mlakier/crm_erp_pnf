'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import SearchableSelect from '@/components/SearchableSelect'
import type {
  FinancialStatementCustomizationConfig,
  FinancialStatementGroupCustomization,
  FinancialStatementCategoryCustomization,
  FinancialStatementCalculatedRowCustomization,
  FinancialStatementCustomizationType,
} from '@/lib/financial-statement-customization'

type Props = {
  statementType: FinancialStatementCustomizationType
  title: string
  reportHref: string
  initialConfig: FinancialStatementCustomizationConfig
}

type OrderedItem = { id: string; order: number }
type ToggleField = 'visible' | 'showHeader' | 'showTotal'

function reorderItems<T extends OrderedItem>(
  sections: T[],
  fromId: string,
  toId: string,
) {
  if (fromId === toId) return sections
  const next = [...sections]
  const fromIndex = next.findIndex((section) => section.id === fromId)
  const toIndex = next.findIndex((section) => section.id === toId)
  if (fromIndex < 0 || toIndex < 0) return sections
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next.map((section, index) => ({ ...section, order: index }))
}

function moveByOffset<T extends OrderedItem>(
  sections: T[],
  sectionId: string,
  offset: number,
) {
  const index = sections.findIndex((section) => section.id === sectionId)
  const targetIndex = index + offset
  if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return sections
  const next = [...sections]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  return next.map((section, nextIndex) => ({ ...section, order: nextIndex }))
}

export default function FinancialStatementCustomizeClient({
  statementType,
  title,
  reportHref,
  initialConfig,
}: Props) {
  const router = useRouter()
  const [sections, setSections] = useState(initialConfig.sections)
  const [calculatedRows, setCalculatedRows] = useState(initialConfig.calculatedRows ?? [])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const sectionOptions = sections.map((section) => ({ id: section.id, label: section.label }))
  const calculatedRowPlacementOptions = [
    { value: '__end__', label: 'End of report' },
    ...sectionOptions.map((section) => ({ value: section.id, label: section.label })),
  ]

  function toggleSection(sectionId: string, field: ToggleField) {
    setSections((current) =>
      current.map((section) => (
        section.id === sectionId ? { ...section, [field]: !section[field] } : section
      )),
    )
  }

  function toggleGroup(sectionId: string, groupId: string, field: ToggleField) {
    setSections((current) =>
      current.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              groups: section.groups.map((group) => (
                group.id === groupId ? { ...group, [field]: !group[field] } : group
              )),
            }
          : section
      )),
    )
  }

  function toggleCategory(sectionId: string, groupId: string, categoryId: string, field: ToggleField) {
    setSections((current) =>
      current.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              groups: section.groups.map((group) => (
                group.id === groupId
                  ? {
                      ...group,
                      categories: group.categories.map((category) => (
                        category.id === categoryId ? { ...category, [field]: !category[field] } : category
                      )),
                    }
                  : group
              )),
            }
          : section
      )),
    )
  }

  function updateGroups(sectionId: string, updater: (groups: FinancialStatementGroupCustomization[]) => FinancialStatementGroupCustomization[]) {
    setSections((current) =>
      current.map((section) => (
        section.id === sectionId ? { ...section, groups: updater(section.groups) } : section
      )),
    )
  }

  function updateCategories(
    sectionId: string,
    groupId: string,
    updater: (categories: FinancialStatementCategoryCustomization[]) => FinancialStatementCategoryCustomization[],
  ) {
    setSections((current) =>
      current.map((section) => (
        section.id === sectionId
          ? {
              ...section,
              groups: section.groups.map((group) => (
                group.id === groupId ? { ...group, categories: updater(group.categories) } : group
              )),
            }
          : section
      )),
    )
  }

  function updateCalculatedRows(updater: (rows: FinancialStatementCalculatedRowCustomization[]) => FinancialStatementCalculatedRowCustomization[]) {
    setCalculatedRows((current) => updater(current))
  }

  function toggleCalculatedRow(rowId: string) {
    updateCalculatedRows((current) =>
      current.map((row) => (
        row.id === rowId ? { ...row, visible: !row.visible } : row
      )),
    )
  }

  function setCalculatedRowPlacement(rowId: string, afterSectionId: string | null) {
    updateCalculatedRows((current) =>
      current.map((row) => (
        row.id === rowId ? { ...row, afterSectionId } : row
      )),
    )
  }

  async function save() {
    setStatus('saving')
    const response = await fetch('/api/config/financial-statement-customization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: statementType,
        config: { sections, calculatedRows },
      }),
    })

    if (!response.ok) {
      setStatus('error')
      return
    }

    setStatus('saved')
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-full max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={reportHref} className="text-xs font-semibold text-blue-400 hover:underline">
            Back to {title}
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-white">Customize {title}</h1>
          <p className="mt-1 max-w-3xl text-xs" style={{ color: 'var(--text-secondary)' }}>
            Control which sections display on the report, whether their headers and totals appear, and the order in which sections print.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={reportHref}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving'}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-sm font-semibold text-white">Report Layout</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Drag section, group, and category rows to reorder. Visibility hides the whole branch; header and total control presentation rows.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => setDraggingId(section.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) setSections((current) => reorderItems(current, draggingId, section.id))
                setDraggingId(null)
              }}
              className="rounded-xl border p-3"
              style={{
                borderColor: 'var(--border-muted)',
                backgroundColor: draggingId === section.id ? 'rgba(59, 130, 246, 0.12)' : 'rgba(15, 23, 42, 0.35)',
              }}
            >
              <div className="grid gap-3 md:grid-cols-[2rem_1fr_repeat(3,8rem)_8rem]">
                <div className="flex items-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {index + 1}
                </div>
                <div className="flex cursor-grab items-center text-sm font-semibold text-white">
                  FS Section: {section.label}
                </div>
                {[
                  ['visible', 'Visible'],
                  ['showHeader', 'Show Header'],
                  ['showTotal', 'Show Total'],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={section[field as ToggleField]}
                      onChange={() => toggleSection(section.id, field as ToggleField)}
                    />
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSections((current) => moveByOffset(current, section.id, -1))}
                    className="rounded-md border px-2 py-1 text-xs text-white"
                    style={{ borderColor: 'var(--border-muted)' }}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setSections((current) => moveByOffset(current, section.id, 1))}
                    className="rounded-md border px-2 py-1 text-xs text-white"
                    style={{ borderColor: 'var(--border-muted)' }}
                  >
                    Down
                  </button>
                </div>
              </div>

              {section.groups.length > 0 ? (
                <div className="mt-3 space-y-3 pl-4">
                  {section.groups.map((group, groupIndex) => (
                    <div
                      key={group.id}
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation()
                        setDraggingId(group.id)
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation()
                        if (draggingId) updateGroups(section.id, (groups) => reorderItems(groups, draggingId, group.id))
                        setDraggingId(null)
                      }}
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: 'var(--border-muted)',
                        backgroundColor: draggingId === group.id ? 'rgba(59, 130, 246, 0.12)' : 'rgba(30, 41, 59, 0.45)',
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-[2rem_1fr_repeat(3,8rem)_8rem]">
                        <div className="flex items-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {index + 1}.{groupIndex + 1}
                        </div>
                        <div className="flex cursor-grab items-center text-xs font-semibold text-white">
                          FS Group: {group.label}
                        </div>
                        {[
                          ['visible', 'Visible'],
                          ['showHeader', 'Show Header'],
                          ['showTotal', 'Show Total'],
                        ].map(([field, label]) => (
                          <label
                            key={field}
                            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
                          >
                            <span>{label}</span>
                            <input
                              type="checkbox"
                              checked={group[field as ToggleField]}
                              onChange={() => toggleGroup(section.id, group.id, field as ToggleField)}
                            />
                          </label>
                        ))}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateGroups(section.id, (groups) => moveByOffset(groups, group.id, -1))}
                            className="rounded-md border px-2 py-1 text-xs text-white"
                            style={{ borderColor: 'var(--border-muted)' }}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroups(section.id, (groups) => moveByOffset(groups, group.id, 1))}
                            className="rounded-md border px-2 py-1 text-xs text-white"
                            style={{ borderColor: 'var(--border-muted)' }}
                          >
                            Down
                          </button>
                        </div>
                      </div>

                      {group.categories.length > 0 ? (
                        <div className="mt-3 space-y-2 pl-4">
                          {group.categories.map((category, categoryIndex) => (
                            <div
                              key={category.id}
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation()
                                setDraggingId(category.id)
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.stopPropagation()
                                if (draggingId) updateCategories(section.id, group.id, (categories) => reorderItems(categories, draggingId, category.id))
                                setDraggingId(null)
                              }}
                              className="grid gap-3 rounded-lg border px-3 py-2 md:grid-cols-[3rem_1fr_repeat(3,8rem)_8rem]"
                              style={{
                                borderColor: 'var(--border-muted)',
                                backgroundColor: draggingId === category.id ? 'rgba(59, 130, 246, 0.12)' : 'rgba(15, 23, 42, 0.38)',
                              }}
                            >
                              <div className="flex items-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                                {index + 1}.{groupIndex + 1}.{categoryIndex + 1}
                              </div>
                              <div className="flex cursor-grab items-center text-xs text-white">
                                FS Category: {category.label}
                              </div>
                              {[
                                ['visible', 'Visible'],
                                ['showHeader', 'Show Header'],
                                ['showTotal', 'Show Total'],
                              ].map(([field, label]) => (
                                <label
                                  key={field}
                                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
                                >
                                  <span>{label}</span>
                                  <input
                                    type="checkbox"
                                    checked={category[field as ToggleField]}
                                    onChange={() => toggleCategory(section.id, group.id, category.id, field as ToggleField)}
                                  />
                                </label>
                              ))}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateCategories(section.id, group.id, (categories) => moveByOffset(categories, category.id, -1))}
                                  className="rounded-md border px-2 py-1 text-xs text-white"
                                  style={{ borderColor: 'var(--border-muted)' }}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateCategories(section.id, group.id, (categories) => moveByOffset(categories, category.id, 1))}
                                  className="rounded-md border px-2 py-1 text-xs text-white"
                                  style={{ borderColor: 'var(--border-muted)' }}
                                >
                                  Down
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {calculatedRows.length > 0 ? (
        <section
          className="mt-5 overflow-hidden rounded-2xl border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <h2 className="text-sm font-semibold text-white">Calculated Rows</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Control P&L calculated rows like Gross Margin, EBITDA, EBIT, and Net Income. Placement determines which FS section they print after.
            </p>
          </div>
          <div className="space-y-3 p-5">
            {calculatedRows.map((row, index) => (
              <div
                key={row.id}
                draggable
                onDragStart={() => setDraggingId(row.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingId) updateCalculatedRows((current) => reorderItems(current, draggingId, row.id))
                  setDraggingId(null)
                }}
                className="grid gap-3 rounded-xl border p-3 md:grid-cols-[2rem_1fr_8rem_14rem_8rem]"
                style={{
                  borderColor: 'var(--border-muted)',
                  backgroundColor: draggingId === row.id ? 'rgba(59, 130, 246, 0.12)' : 'rgba(15, 23, 42, 0.35)',
                }}
              >
                <div className="flex items-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {index + 1}
                </div>
                <div className="flex cursor-grab items-center text-sm font-semibold text-white">
                  {row.label}
                </div>
                <label
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
                >
                  <span>Visible</span>
                  <input
                    type="checkbox"
                    checked={row.visible}
                    onChange={() => toggleCalculatedRow(row.id)}
                  />
                </label>
                <div className="grid gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Print after</span>
                  <SearchableSelect
                    selectedValue={row.afterSectionId ?? '__end__'}
                    options={calculatedRowPlacementOptions}
                    placeholder="Select placement"
                    searchPlaceholder="Search sections"
                    dropdownWidthMode="trigger"
                    textClassName="text-xs"
                    onSelect={(value) => setCalculatedRowPlacement(row.id, value === '__end__' ? null : value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCalculatedRows((current) => moveByOffset(current, row.id, -1))}
                    className="rounded-md border px-2 py-1 text-xs text-white"
                    style={{ borderColor: 'var(--border-muted)' }}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCalculatedRows((current) => moveByOffset(current, row.id, 1))}
                    className="rounded-md border px-2 py-1 text-xs text-white"
                    style={{ borderColor: 'var(--border-muted)' }}
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {status === 'saved' ? (
        <p className="mt-4 rounded-xl border px-4 py-3 text-xs" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
          Customization saved. Return to the report to review the new layout.
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="mt-4 rounded-xl border px-4 py-3 text-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          Save failed. Please retry.
        </p>
      ) : null}
    </main>
  )
}
