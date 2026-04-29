'use client'

import InvoiceReceiptGlImpactSection, {
  type InvoiceReceiptGlImpactRow,
} from '@/components/InvoiceReceiptGlImpactSection'
import type { TransactionGlImpactColumnCustomization, TransactionGlImpactSettings } from '@/lib/transaction-gl-impact'

export type FulfillmentGlImpactRow = InvoiceReceiptGlImpactRow

export default function FulfillmentGlImpactSection({
  rows,
  settings,
  columnCustomization,
}: {
  rows: FulfillmentGlImpactRow[]
  settings?: TransactionGlImpactSettings
  columnCustomization?: Record<string, TransactionGlImpactColumnCustomization>
}) {
  return <InvoiceReceiptGlImpactSection rows={rows} settings={settings} columnCustomization={columnCustomization} />
}
