import type { ReactNode } from 'react'
import MasterDataListToolbar, { type MasterDataListToolbarProps } from '@/components/MasterDataListToolbar'

type MasterDataListSectionProps = MasterDataListToolbarProps & {
  children: ReactNode
  tableContainerId?: string
  tableContainerClassName?: string
}

export default function MasterDataListSection({
  children,
  tableContainerId,
  tableContainerClassName = 'overflow-x-auto',
  ...toolbarProps
}: MasterDataListSectionProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      <MasterDataListToolbar {...toolbarProps} />
      <div
        id={tableContainerId}
        className={tableContainerClassName}
        data-column-selector-table={toolbarProps.tableId}
      >
        {children}
      </div>
    </section>
  )
}
