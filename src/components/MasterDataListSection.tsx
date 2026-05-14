import { Children, isValidElement, type ReactNode } from 'react'
import MasterDataListToolbar, { type MasterDataListToolbarProps } from '@/components/MasterDataListToolbar'
import PaginationFooter from '@/components/PaginationFooter'

type MasterDataListSectionProps = MasterDataListToolbarProps & {
  children: ReactNode
  topContent?: ReactNode
  tableContainerId?: string
}

export default function MasterDataListSection({
  children,
  topContent,
  tableContainerId,
  ...toolbarProps
}: MasterDataListSectionProps) {
  const childNodes = Children.toArray(children)
  const lastChild = childNodes.at(-1)
  const hasPaginationFooter = isValidElement(lastChild) && lastChild.type === PaginationFooter
  const tableContent = hasPaginationFooter ? childNodes.slice(0, -1) : childNodes
  const columns = toolbarProps.columns.map((column, index) => ({
    ...column,
    locked: column.locked === true || index < 2 || column.id === 'actions',
  }))
  const shouldPinIdentityColumns = columns.length >= 2

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      {topContent ? (
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          {topContent}
        </div>
      ) : null}
      <MasterDataListToolbar {...toolbarProps} columns={columns} />
      <div
        id={tableContainerId}
        className={`record-list-scroll-region overflow-x-auto${shouldPinIdentityColumns ? ' master-data-pin-first-two' : ''}`}
        data-column-selector-table={toolbarProps.tableId}
        data-pin-first-two={shouldPinIdentityColumns ? 'true' : undefined}
      >
        {tableContent}
      </div>
      {hasPaginationFooter ? lastChild : null}
    </section>
  )
}
