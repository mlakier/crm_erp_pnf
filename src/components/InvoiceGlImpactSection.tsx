'use client'

import PurchaseOrderGlImpactSection, { type PurchaseOrderGlImpactRow } from '@/components/PurchaseOrderGlImpactSection'
import type { TransactionGlImpactColumnCustomization, TransactionGlImpactSettings } from '@/lib/transaction-gl-impact'

export type InvoiceGlImpactRow = PurchaseOrderGlImpactRow

export default function InvoiceGlImpactSection({
  rows,
  settings,
  columnCustomization,
}: {
  rows: InvoiceGlImpactRow[]
  settings?: TransactionGlImpactSettings
  columnCustomization?: Record<string, TransactionGlImpactColumnCustomization>
}) {
  return (
    <PurchaseOrderGlImpactSection
      rows={rows}
      settings={settings}
      columnCustomization={columnCustomization}
    />
  )
}
