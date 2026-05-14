'use client'

import { createContext, useContext } from 'react'
import type { SeededDimensionDisplayLabels } from '@/lib/transaction-gl-impact'

const SeededDimensionLabelsContext = createContext<SeededDimensionDisplayLabels>({})

export function SeededDimensionLabelsProvider({
  labels,
  children,
}: {
  labels: SeededDimensionDisplayLabels
  children: React.ReactNode
}) {
  return (
    <SeededDimensionLabelsContext.Provider value={labels}>
      {children}
    </SeededDimensionLabelsContext.Provider>
  )
}

export function useSeededDimensionLabels() {
  return useContext(SeededDimensionLabelsContext)
}
