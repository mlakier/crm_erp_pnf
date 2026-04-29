'use client'

import PurchaseOrderGlImpactSection, { type PurchaseOrderGlImpactRow } from '@/components/PurchaseOrderGlImpactSection'
import type { TransactionGlImpactColumnCustomization, TransactionGlImpactSettings } from '@/lib/transaction-gl-impact'

export type InvoiceReceiptGlImpactRow = PurchaseOrderGlImpactRow

export default function InvoiceReceiptGlImpactSection({
  rows,
  settings,
  columnCustomization,
}: {
  rows: InvoiceReceiptGlImpactRow[]
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
