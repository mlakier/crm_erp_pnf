import type { ReactNode } from 'react'
import { RecordDetailField, RecordDetailSection } from '@/components/RecordDetailPanels'
import CopyableSystemValue from '@/components/CopyableSystemValue'
import type { MasterDataSystemInfo } from '@/lib/master-data-system-info'

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

export type RecordSystemInformationItem = {
  key: string
  label: string
  value: ReactNode
  copyableText?: string
}

export function buildMasterDataSystemInformationItems(
  info: MasterDataSystemInfo,
  internalId?: string,
): RecordSystemInformationItem[] {
  return [
    ...(internalId
      ? [{ key: 'internalDbId', label: 'Internal DB ID', value: internalId, copyableText: internalId }]
      : []),
    { key: 'dateCreated', label: 'Date Created', value: formatDateTime(info.createdAt) },
    { key: 'createdBy', label: 'Created By', value: info.createdBy },
    { key: 'lastModified', label: 'Last Modified', value: formatDateTime(info.updatedAt) },
    { key: 'lastModifiedBy', label: 'Last Modified By', value: info.lastModifiedBy },
  ]
}

export default function RecordSystemInformationSection({
  items,
  title = 'System Information',
}: {
  items: RecordSystemInformationItem[]
  title?: string
}) {
  const count = items.length

  return (
    <RecordDetailSection title={title} count={count}>
      <dl className="grid gap-4 px-6 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <RecordDetailField key={item.key} label={item.label}>
            {item.copyableText ? <CopyableSystemValue value={item.copyableText} /> : item.value}
          </RecordDetailField>
        ))}
      </dl>
    </RecordDetailSection>
  )
}
