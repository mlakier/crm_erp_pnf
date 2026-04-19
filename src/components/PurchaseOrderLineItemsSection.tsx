'use client'

import ColumnSelector from '@/components/ColumnSelector'
import DeleteButton from '@/components/DeleteButton'
import { fmtCurrency } from '@/lib/format'

type PurchaseOrderLineItemRow = {
  id: string
  itemId: string | null
  description: string
  quantity: number
  receivedQuantity: number
  openQuantity: number
  unitPrice: number
  lineTotal: number
}

const TABLE_ID = 'purchase-order-line-items'

const COLUMN_DEFINITIONS = [
  { id: 'line', label: 'Line', locked: true },
  { id: 'item-id', label: 'Item Id', locked: true },
  { id: 'description', label: 'Description', defaultVisible: true },
  { id: 'quantity', label: 'Qty', defaultVisible: true },
  { id: 'received-qty', label: "Rec'd Qty", defaultVisible: true },
  { id: 'open-qty', label: 'Open Qty', defaultVisible: true },
  { id: 'unit-price', label: 'Unit Price', defaultVisible: true },
  { id: 'line-total', label: 'Line Total', defaultVisible: true },
] as const

const EDIT_COLUMN_DEFINITION = { id: 'actions', label: 'Actions', locked: true } as const

const HEADER_TOOLTIPS: Record<string, string> = {
  line: 'Sequential line number for this purchase order.',
  'item-id': 'Item master identifier for the linked item on the line when one is present.',
  description: 'Description of the goods or services being purchased on this line.',
  quantity: 'Ordered quantity for this line item.',
  'received-qty': 'Derived received quantity for this line based on total receipts recorded against the purchase order.',
  'open-qty': 'Derived remaining open quantity for this line based on ordered quantity less received quantity.',
  'unit-price': 'Price per unit for this purchase order line.',
  'line-total': 'Extended line amount calculated from quantity and unit price.',
}

export default function PurchaseOrderLineItemsSection({
  rows,
  editing,
}: {
  rows: PurchaseOrderLineItemRow[]
  editing: boolean
}) {
  const total = rows.reduce((sum, row) => sum + row.lineTotal, 0)
  const columns = editing ? [...COLUMN_DEFINITIONS, EDIT_COLUMN_DEFINITION] : COLUMN_DEFINITIONS

  return (
    <div
      className="mb-6 overflow-hidden rounded-xl border"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-6 py-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <h2 className="text-base font-semibold text-white">Line Items</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-white">Total {fmtCurrency(total)}</span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'rgba(59,130,246,0.18)',
              color: 'var(--accent-primary-strong)',
            }}
          >
            {rows.length}
          </span>
          <ColumnSelector tableId={TABLE_ID} columns={columns.map((column) => ({ ...column }))} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          No line items yet.
        </p>
      ) : (
        <>
          <div id={TABLE_ID} className="overflow-x-auto overflow-y-hidden" data-column-selector-table={TABLE_ID}>
            <table className="min-w-[1200px] w-full" data-disable-filter-sort="true">
              <thead>
                <tr>
                  <HeaderCell columnId="line" pinned left={0} width={72}>
                    <HeaderLabel label="Line" tooltip={HEADER_TOOLTIPS.line} />
                  </HeaderCell>
                  <HeaderCell columnId="item-id" pinned left={72} width={120}>
                    <HeaderLabel label="Item Id" tooltip={HEADER_TOOLTIPS['item-id']} />
                  </HeaderCell>
                  <HeaderCell columnId="description">
                    <HeaderLabel label="Description" tooltip={HEADER_TOOLTIPS.description} />
                  </HeaderCell>
                  <HeaderCell columnId="quantity" align="right">
                    <HeaderLabel label="Qty" tooltip={HEADER_TOOLTIPS.quantity} />
                  </HeaderCell>
                  <HeaderCell columnId="received-qty" align="right">
                    <HeaderLabel label="Rec'd Qty" tooltip={HEADER_TOOLTIPS['received-qty']} />
                  </HeaderCell>
                  <HeaderCell columnId="open-qty" align="right">
                    <HeaderLabel label="Open Qty" tooltip={HEADER_TOOLTIPS['open-qty']} />
                  </HeaderCell>
                  <HeaderCell columnId="unit-price" align="right">
                    <HeaderLabel label="Unit Price" tooltip={HEADER_TOOLTIPS['unit-price']} />
                  </HeaderCell>
                  <HeaderCell columnId="line-total" align="right">
                    <HeaderLabel label="Line Total" tooltip={HEADER_TOOLTIPS['line-total']} />
                  </HeaderCell>
                  {editing ? <HeaderCell columnId="actions" align="right">Actions</HeaderCell> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} style={index < rows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}>
                    <BodyCell columnId="line" pinned left={0} width={72} align="center">
                      {index + 1}
                    </BodyCell>
                    <BodyCell columnId="item-id" pinned left={72} width={120}>
                      {row.itemId ?? '-'}
                    </BodyCell>
                    <BodyCell columnId="description">
                      <span className="font-medium text-white">{row.description}</span>
                    </BodyCell>
                    <BodyCell columnId="quantity" align="right">
                      {row.quantity}
                    </BodyCell>
                    <BodyCell columnId="received-qty" align="right">
                      {row.receivedQuantity}
                    </BodyCell>
                    <BodyCell columnId="open-qty" align="right">
                      {row.openQuantity}
                    </BodyCell>
                    <BodyCell columnId="unit-price" align="right">
                      {fmtCurrency(row.unitPrice)}
                    </BodyCell>
                    <BodyCell columnId="line-total" align="right">
                      <span className="font-semibold text-white">{fmtCurrency(row.lineTotal)}</span>
                    </BodyCell>
                    {editing ? (
                      <BodyCell columnId="actions" align="right">
                        <DeleteButton resource="purchase-order-line-items" id={row.id} />
                      </BodyCell>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border-muted)' }}>
                  <FooterCell columnId="line" pinned left={0} width={72}>
                    <span className="font-semibold text-white">Total</span>
                  </FooterCell>
                  <FooterCell columnId="item-id" pinned left={72} width={120} />
                  <FooterCell columnId="description" />
                  <FooterCell columnId="quantity" align="right" />
                  <FooterCell columnId="received-qty" align="right" />
                  <FooterCell columnId="open-qty" align="right" />
                  <FooterCell columnId="unit-price" align="right" />
                  <FooterCell columnId="line-total" align="right">
                    <span className="font-semibold text-white">{fmtCurrency(total)}</span>
                  </FooterCell>
                  {editing ? <FooterCell columnId="actions" align="right" /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function HeaderLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <FieldTooltip content={tooltip} />
    </span>
  )
}

function HeaderCell({
  children,
  columnId,
  align = 'left',
  pinned,
  left,
  width,
}: {
  children: React.ReactNode
  columnId: string
  align?: 'left' | 'center' | 'right'
  pinned?: boolean
  left?: number
  width?: number
}) {
  return (
    <th
      data-column={columnId}
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${getAlignClassName(align)}`}
      style={{
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-muted)',
        backgroundColor: 'var(--card)',
        ...(pinned ? getPinnedStyle(left ?? 0, width ?? 120, 20) : width ? { minWidth: width, width } : {}),
      }}
    >
      {children}
    </th>
  )
}

function BodyCell({
  children,
  columnId,
  align = 'left',
  pinned,
  left,
  width,
}: {
  children?: React.ReactNode
  columnId: string
  align?: 'left' | 'center' | 'right'
  pinned?: boolean
  left?: number
  width?: number
}) {
  return (
    <td
      data-column={columnId}
      className={`px-4 py-3 text-sm ${getAlignClassName(align)}`}
      style={{
        color: 'var(--text-secondary)',
        ...(pinned ? getPinnedStyle(left ?? 0, width ?? 120, 10) : width ? { minWidth: width, width } : {}),
      }}
    >
      {children}
    </td>
  )
}

function FooterCell({
  children,
  columnId,
  align = 'left',
  pinned,
  left,
  width,
}: {
  children?: React.ReactNode
  columnId: string
  align?: 'left' | 'center' | 'right'
  pinned?: boolean
  left?: number
  width?: number
}) {
  return (
    <td
      data-column={columnId}
      className={`px-4 py-3 text-sm ${getAlignClassName(align)}`}
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--card-elevated)',
        ...(pinned
          ? {
              ...getPinnedStyle(left ?? 0, width ?? 120, 15),
              backgroundColor: 'var(--card-elevated)',
            }
          : width
            ? { minWidth: width, width }
            : {}),
      }}
    >
      {children}
    </td>
  )
}

function getAlignClassName(align: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

function getPinnedStyle(left: number, width: number, zIndex: number) {
  return {
    position: 'sticky' as const,
    left,
    zIndex,
    minWidth: width,
    width,
    boxShadow: '1px 0 0 0 var(--border-muted)',
  }
}

function FieldTooltip({ content }: { content: string }) {
  return (
    <span className="inline-flex">
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[10px] font-semibold"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
        aria-label={content}
        title={content}
      >
        ?
      </span>
    </span>
  )
}
