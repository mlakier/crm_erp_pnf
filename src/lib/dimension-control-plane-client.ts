'use client'

import { useEffect, useState } from 'react'

import type { DimensionConfigurationRow } from '@/lib/dimension-control-plane'

export function useDimensionConfigurationRows() {
  const [rows, setRows] = useState<DimensionConfigurationRow[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/config/dimensions', { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as
          | { rows?: DimensionConfigurationRow[] | null }
          | null

        if (!response.ok || cancelled) return
        setRows(body?.rows ?? [])
      } catch {
        if (cancelled) return
        setRows([])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return rows
}
