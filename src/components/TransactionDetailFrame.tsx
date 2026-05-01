import type { ReactNode } from 'react'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'

export default function TransactionDetailFrame({
  stats,
  header,
  lineItems,
  relatedRecords,
  relatedRecordsLabel = 'Related Records',
  relatedRecordsCount = 0,
  relatedRecordsToolbarTargetId,
  relatedRecordsToolbarPlacement = 'panel',
  relatedDocuments,
  relatedDocumentsLabel = 'Related Documents',
  relatedDocumentsCount = 0,
  relatedDocumentsToolbarTargetId,
  relatedDocumentsToolbarPlacement = 'panel',
  supplementarySections,
  communications,
  communicationsCount = 0,
  communicationsToolbarTargetId,
  communicationsToolbarPlacement = 'panel',
  systemNotes,
  systemNotesCount = 0,
  systemNotesToolbarTargetId,
  systemNotesToolbarPlacement = 'panel',
  showFooterSections = true,
}: {
  stats?: ReactNode
  header: ReactNode
  lineItems: ReactNode
  relatedRecords?: ReactNode
  relatedRecordsLabel?: string
  relatedRecordsCount?: number
  relatedRecordsToolbarTargetId?: string
  relatedRecordsToolbarPlacement?: 'panel' | 'tab-bar'
  relatedDocuments?: ReactNode
  relatedDocumentsLabel?: string
  relatedDocumentsCount?: number
  relatedDocumentsToolbarTargetId?: string
  relatedDocumentsToolbarPlacement?: 'panel' | 'tab-bar'
  supplementarySections?: ReactNode | ReactNode[]
  communications?: ReactNode
  communicationsCount?: number
  communicationsToolbarTargetId?: string
  communicationsToolbarPlacement?: 'panel' | 'tab-bar'
  systemNotes?: ReactNode
  systemNotesCount?: number
  systemNotesToolbarTargetId?: string
  systemNotesToolbarPlacement?: 'panel' | 'tab-bar'
  showFooterSections?: boolean
}) {
  const extras = Array.isArray(supplementarySections)
    ? supplementarySections.filter(Boolean)
    : supplementarySections
      ? [supplementarySections]
      : []
  const shouldUseSharedBottomContainer = Boolean(showFooterSections && (communications || systemNotes))
  const footerTabs = shouldUseSharedBottomContainer
    ? [
        relatedRecords
          ? {
              key: 'related-records',
              label: relatedRecordsLabel,
              count: relatedRecordsCount,
              content: relatedRecords,
              toolbarTargetId: relatedRecordsToolbarTargetId,
              toolbarPlacement: relatedRecordsToolbarPlacement,
            }
          : null,
        relatedDocuments
          ? {
              key: 'related-documents',
              label: relatedDocumentsLabel,
              count: relatedDocumentsCount,
              content: relatedDocuments,
              toolbarTargetId: relatedDocumentsToolbarTargetId,
              toolbarPlacement: relatedDocumentsToolbarPlacement,
            }
          : null,
        communications
          ? {
              key: 'communications',
              label: 'Communications',
              count: communicationsCount,
              content: communications,
              toolbarTargetId: communicationsToolbarTargetId,
              toolbarPlacement: communicationsToolbarPlacement,
            }
          : null,
        systemNotes
          ? {
              key: 'system-notes',
              label: 'System Notes',
              count: systemNotesCount,
              content: systemNotes,
              toolbarTargetId: systemNotesToolbarTargetId,
              toolbarPlacement: systemNotesToolbarPlacement,
            }
          : null,
      ].filter((tab): tab is NonNullable<typeof tab> => tab !== null)
    : []

  return (
    <>
      {stats ? <div className="mb-8">{stats}</div> : null}
      {header}
      {lineItems}
      {showFooterSections
        ? extras.map((section, index) => (
            <div key={index}>{section}</div>
          ))
        : null}
      {shouldUseSharedBottomContainer ? (
        <RecordBottomTabsSection
          defaultActiveKey={
            relatedRecords
              ? 'related-records'
              : relatedDocuments
                ? 'related-documents'
                : communications
                  ? 'communications'
                  : 'system-notes'
          }
          tabs={footerTabs}
        />
      ) : (
        <>
          {showFooterSections ? relatedRecords : null}
          {showFooterSections ? relatedDocuments : null}
          {showFooterSections ? communications : null}
          {showFooterSections ? systemNotes : null}
        </>
      )}
    </>
  )
}
