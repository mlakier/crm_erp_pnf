'use client'

import PurchaseOrderGlImpactSection, {
  type PurchaseOrderGlImpactRow,
} from '@/components/PurchaseOrderGlImpactSection'
import type {
  TransactionGlImpactColumnCustomization,
  TransactionGlImpactSettings,
} from '@/lib/transaction-gl-impact'

export type ReceiptGlImpactRow = PurchaseOrderGlImpactRow

export default function ReceiptGlImpactSection({
  rows,
  settings,
  columnCustomization,
}: {
  rows: ReceiptGlImpactRow[]
  settings?: TransactionGlImpactSettings
  columnCustomization?: Record<string, TransactionGlImpactColumnCustomization>
}) {
  return (
    <PurchaseOrderGlImpactSection
      rows={rows}
      settings={settings}
      columnCustomization={columnCustomization}
      emptyMessage="No posted accounting impact is linked to this receipt yet."
    />
  )
}
