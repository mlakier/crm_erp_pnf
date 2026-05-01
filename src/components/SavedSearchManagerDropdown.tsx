'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type SavedSearchManagerOption = {
  value: string
  label: string
}

export default function SavedSearchManagerDropdown({
  selectedValue,
  defaultValue,
  options,
  placeholder,
  onSelect,
  onDefaultChange,
}: {
  selectedValue: string
  defaultValue: string
  options: SavedSearchManagerOption[]
  placeholder: string
  onSelect: (value: string) => void
  onDefaultChange: (value: string, checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === selectedValue)?.label ?? placeholder,
    [options, placeholder, selectedValue],
  )

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (!containerRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-left text-sm leading-5 text-white"
        style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--text-muted)' }}
        >
          <path d="m5 7 5 5 5-5" />
        </svg>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-[210] mt-1 w-full rounded-md border shadow-2xl"
          style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`grid items-center gap-3 px-3 py-2 hover:bg-white/5 ${
                option.value === '__add-new-view'
                  ? 'grid-cols-[minmax(0,1fr)]'
                  : 'grid-cols-[minmax(0,1fr)_auto]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  setOpen(false)
                  triggerRef.current?.blur()
                }}
                className="truncate text-left text-sm leading-5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {option.label}
              </button>
              {option.value !== '__add-new-view' ? (
                <label className="flex items-center gap-2 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={defaultValue === option.value}
                    className="h-4 w-4"
                    onChange={(event) => onDefaultChange(option.value, event.target.checked)}
                  />
                  Default
                </label>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
