import type { CSSProperties, ReactNode } from 'react'
import {
  MASTER_DATA_BODY_CELL_CLASSNAME,
  MASTER_DATA_EMPTY_CELL_CLASSNAME,
  MASTER_DATA_EMPTY_CELL_STYLE,
  MASTER_DATA_HEADER_CELL_CLASSNAME,
  MASTER_DATA_HEADER_CELL_STYLE,
  MASTER_DATA_MUTED_CELL_STYLE,
} from '@/lib/master-data-table'

type CellProps = {
  children: ReactNode
  className?: string
  columnId?: string
  style?: CSSProperties
}

export function MasterDataHeaderCell({ children, className, columnId, style }: CellProps) {
  return (
    <th
      data-column={columnId}
      className={className ?? MASTER_DATA_HEADER_CELL_CLASSNAME}
      style={style ?? MASTER_DATA_HEADER_CELL_STYLE}
    >
      {children}
    </th>
  )
}

export function MasterDataBodyCell({ children, className, columnId, style }: CellProps) {
  return (
    <td
      data-column={columnId}
      className={className ?? MASTER_DATA_BODY_CELL_CLASSNAME}
      style={style}
    >
      {children}
    </td>
  )
}

export function MasterDataMutedCell({ children, className, columnId, style }: CellProps) {
  return (
    <MasterDataBodyCell
      columnId={columnId}
      className={className}
      style={{ ...MASTER_DATA_MUTED_CELL_STYLE, ...style }}
    >
      {children}
    </MasterDataBodyCell>
  )
}

export function MasterDataEmptyStateRow({
  children,
  colSpan,
}: {
  children: ReactNode
  colSpan: number
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={MASTER_DATA_EMPTY_CELL_CLASSNAME} style={MASTER_DATA_EMPTY_CELL_STYLE}>
        {children}
      </td>
    </tr>
  )
}
