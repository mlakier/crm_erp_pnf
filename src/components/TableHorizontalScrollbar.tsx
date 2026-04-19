'use client'

import { useEffect, useState } from 'react'

export default function TableHorizontalScrollbar({
  targetId,
  alwaysShow = false,
}: {
  targetId: string
  alwaysShow?: boolean
}) {
  const [maxScroll, setMaxScroll] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    const tableContainer = document.getElementById(targetId)
    const table = tableContainer?.querySelector('table')

    if (!tableContainer) {
      return
    }

    const updateWidth = () => {
      setMaxScroll(Math.max(0, tableContainer.scrollWidth - tableContainer.clientWidth))
      setScrollLeft(tableContainer.scrollLeft)
    }

    const syncFromTable = () => {
      setScrollLeft(tableContainer.scrollLeft)
    }

    updateWidth()
    const rafOne = window.requestAnimationFrame(updateWidth)
    const rafTwo = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(updateWidth)
    })
    const timeoutId = window.setTimeout(updateWidth, 120)

    tableContainer.addEventListener('scroll', syncFromTable)
    window.addEventListener('resize', updateWidth)

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateWidth)
      : null

    resizeObserver?.observe(tableContainer)
    if (table) {
      resizeObserver?.observe(table)
    }

    const mutationObserver = new MutationObserver(updateWidth)
    mutationObserver.observe(tableContainer, { childList: true, subtree: true, attributes: true, characterData: true })

    return () => {
      tableContainer.removeEventListener('scroll', syncFromTable)
      window.removeEventListener('resize', updateWidth)
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
      window.cancelAnimationFrame(rafOne)
      window.cancelAnimationFrame(rafTwo)
      window.clearTimeout(timeoutId)
    }
  }, [targetId])

  if (!alwaysShow && maxScroll <= 0) {
    return null
  }

  return (
    <div className="border-t px-6 py-3" style={{ borderColor: 'var(--border-muted)' }}>
      <input
        type="range"
        min={0}
        max={Math.max(1, maxScroll)}
        step={1}
        value={Math.min(scrollLeft, Math.max(1, maxScroll))}
        onChange={(event) => {
          const tableContainer = document.getElementById(targetId)
          const nextScrollLeft = Number(event.target.value)

          setScrollLeft(nextScrollLeft)

          if (tableContainer) {
            tableContainer.scrollLeft = nextScrollLeft
          }
        }}
        className="block w-full cursor-ew-resize accent-slate-500"
        aria-label="Horizontal table scroll"
      />
    </div>
  )
}
