'use client'

import PurchaseOrderGlImpactSection, {
  type PurchaseOrderGlImpactRow,
} from '@/components/PurchaseOrderGlImpactSection'
import type {
  TransactionGlImpactColumnCustomization,
  TransactionGlImpactSettings,
} from '@/lib/transaction-gl-impact'

export type BillPaymentGlImpactRow = PurchaseOrderGlImpactRow

export default function BillPaymentGlImpactSection({
  rows,
  settings,
  columnCustomization,
}: {
  rows: BillPaymentGlImpactRow[]
  settings?: TransactionGlImpactSettings
  columnCustomization?: Record<string, TransactionGlImpactColumnCustomization>
}) {
  return (
    <PurchaseOrderGlImpactSection
      rows={rows}
      settings={settings}
      columnCustomization={columnCustomization}
      emptyMessage="No posted accounting impact is linked to this bill payment yet."
    />
  )
}
