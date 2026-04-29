'use client'

import { useMemo } from 'react'
import TransactionExecutionLinesSection, {
  type TransactionExecutionLineOption,
  type TransactionExecutionLineRow,
} from '@/components/TransactionExecutionLinesSection'

export type ReceiptLineOption = TransactionExecutionLineOption

export type ReceiptLineRow = {
  id: string
  purchaseOrderLineItemId: string | null
  lineNumber: number
  itemId: string | null
  itemName: string | null
  description: string
  orderedQuantity: number
  alreadyReceivedQuantity: number
  openQuantity: number
  receiptQuantity: number
  notes: string
}

export default function ReceiptLineItemsSection({
  rows,
  editing,
  lineOptions,
  onChange,
  title = 'Receipt Line Items',
  remoteConfig,
  allowAddLines = editing,
}: {
  rows: ReceiptLineRow[]
  editing?: boolean
  lineOptions: ReceiptLineOption[]
  onChange?: (rows: ReceiptLineRow[]) => void
  title?: string
  remoteConfig?: {
    receiptId: string
    userId?: string | null
    apiBasePath?: string
  }
  allowAddLines?: boolean
}) {
  const executionRows = useMemo(
    () =>
      rows.map<TransactionExecutionLineRow>((row) => ({
        id: row.id,
        sourceLineItemId: row.purchaseOrderLineItemId,
        lineNumber: row.lineNumber,
        itemId: row.itemId,
        itemName: row.itemName,
        description: row.description,
        orderedQuantity: row.orderedQuantity,
        alreadyProcessedQuantity: row.alreadyReceivedQuantity,
        openQuantity: row.openQuantity,
        documentQuantity: row.receiptQuantity,
        notes: row.notes,
      })),
    [rows],
  )

  return (
    <TransactionExecutionLinesSection
      rows={executionRows}
      editing={editing}
      lineOptions={lineOptions}
      onChange={
        onChange
          ? (nextRows) =>
              onChange(
                nextRows.map((row) => ({
                  id: row.id,
                  purchaseOrderLineItemId: row.sourceLineItemId,
                  lineNumber: row.lineNumber,
                  itemId: row.itemId,
                  itemName: row.itemName,
                  description: row.description,
                  orderedQuantity: row.orderedQuantity,
                  alreadyReceivedQuantity: row.alreadyProcessedQuantity,
                  openQuantity: row.openQuantity,
                  receiptQuantity: row.documentQuantity,
                  notes: row.notes,
                })),
              )
          : undefined
      }
      title={title}
      sourceLineLabel="Line"
      alreadyProcessedQuantityLabel="Already Received Qty"
      documentQuantityLabel="Receipt Qty"
      remoteConfig={
        remoteConfig
          ? {
              recordId: remoteConfig.receiptId,
              userId: remoteConfig.userId ?? null,
              apiBasePath: remoteConfig.apiBasePath ?? '/api/receipt-lines',
              recordIdFieldName: 'receiptId',
              sourceLineItemFieldName: 'purchaseOrderLineItemId',
            }
          : undefined
      }
      allowAddLines={allowAddLines}
      emptyEditMessage="Add one or more purchase order lines to receive."
      emptyViewMessage="No receipt lines yet."
    />
  )
}
