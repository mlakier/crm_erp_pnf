'use client'

import TransactionExecutionLinesSection, {
  type TransactionExecutionLineOption,
  type TransactionExecutionLineRow,
  type TransactionExecutionLineVisibleColumn,
} from '@/components/TransactionExecutionLinesSection'

export type FulfillmentLineOption = TransactionExecutionLineOption

export type FulfillmentLineRow = {
  id: string
  salesOrderLineItemId: string | null
  lineNumber: number
  itemId: string | null
  itemName: string | null
  description: string
  orderedQuantity: number
  alreadyFulfilledQuantity: number
  openQuantity: number
  fulfillmentQuantity: number
  notes: string
}

export default function FulfillmentLineItemsSection({
  rows,
  editing,
  lineOptions,
  onChange,
  title = 'Fulfillment Lines',
  remoteConfig,
  visibleColumnIds,
  allowAddLines = editing,
}: {
  rows: FulfillmentLineRow[]
  editing?: boolean
  lineOptions: FulfillmentLineOption[]
  onChange?: (rows: FulfillmentLineRow[]) => void
  title?: string
  remoteConfig?: {
    fulfillmentId: string
    userId?: string | null
    apiBasePath?: string
  }
  visibleColumnIds?: Array<'line' | 'item-id' | 'description' | 'ordered-qty' | 'fulfilled-qty' | 'open-qty' | 'notes'>
  allowAddLines?: boolean
}) {
  return (
    <TransactionExecutionLinesSection
      rows={rows.map<TransactionExecutionLineRow>((row) => ({
        id: row.id,
        sourceLineItemId: row.salesOrderLineItemId,
        lineNumber: row.lineNumber,
        itemId: row.itemId,
        itemName: row.itemName,
        description: row.description,
        orderedQuantity: row.orderedQuantity,
        alreadyProcessedQuantity: row.alreadyFulfilledQuantity,
        openQuantity: row.openQuantity,
        documentQuantity: row.fulfillmentQuantity,
        notes: row.notes,
      }))}
      editing={editing}
      lineOptions={lineOptions}
      onChange={
        onChange
          ? (nextRows) =>
              onChange(
                nextRows.map((row) => ({
                  id: row.id,
                  salesOrderLineItemId: row.sourceLineItemId,
                  lineNumber: row.lineNumber,
                  itemId: row.itemId,
                  itemName: row.itemName,
                  description: row.description,
                  orderedQuantity: row.orderedQuantity,
                  alreadyFulfilledQuantity: row.alreadyProcessedQuantity,
                  openQuantity: row.openQuantity,
                  fulfillmentQuantity: row.documentQuantity,
                  notes: row.notes,
                })),
              )
          : undefined
      }
      title={title}
      sourceLineLabel="Line"
      alreadyProcessedQuantityLabel="Already Fulfilled Qty"
      documentQuantityLabel="Fulfilled Qty"
      remoteConfig={
        remoteConfig
          ? {
              recordId: remoteConfig.fulfillmentId,
              userId: remoteConfig.userId ?? null,
              apiBasePath: remoteConfig.apiBasePath ?? '/api/fulfillment-lines',
              recordIdFieldName: 'fulfillmentId',
              sourceLineItemFieldName: 'salesOrderLineItemId',
            }
          : undefined
      }
      visibleColumnIds={
        (visibleColumnIds?.map((column) =>
          column === 'fulfilled-qty' ? 'document-qty' : column,
        ) ?? ['line', 'item-id', 'description', 'ordered-qty', 'open-qty', 'document-qty', 'notes']) as TransactionExecutionLineVisibleColumn[]
      }
      allowAddLines={allowAddLines}
      emptyEditMessage="Add one or more sales order lines to fulfill."
      emptyViewMessage="No fulfillment lines yet."
    />
  )
}
