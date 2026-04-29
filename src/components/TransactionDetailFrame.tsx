import type { ReactNode } from 'react'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'

export default function TransactionDetailFrame({
  stats,
  header,
  lineItems,
  relatedDocuments,
  relatedDocumentsLabel = 'Related Documents',
  relatedDocumentsCount = 0,
  supplementarySections,
  communications,
  communicationsCount = 0,
  systemNotes,
  systemNotesCount = 0,
  showFooterSections = true,
}: {
  stats?: ReactNode
  header: ReactNode
  lineItems: ReactNode
  relatedDocuments?: ReactNode
  relatedDocumentsLabel?: string
  relatedDocumentsCount?: number
  supplementarySections?: ReactNode | ReactNode[]
  communications?: ReactNode
  communicationsCount?: number
  systemNotes?: ReactNode
  systemNotesCount?: number
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
        relatedDocuments
          ? {
              key: 'related-documents',
              label: relatedDocumentsLabel,
              count: relatedDocumentsCount,
              content: relatedDocuments,
            }
          : null,
        communications
          ? {
              key: 'communications',
              label: 'Communications',
              count: communicationsCount,
              content: communications,
            }
          : null,
        systemNotes
          ? {
              key: 'system-notes',
              label: 'System Notes',
              count: systemNotesCount,
              content: systemNotes,
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
          defaultActiveKey={relatedDocuments ? 'related-documents' : communications ? 'communications' : 'system-notes'}
          tabs={footerTabs}
        />
      ) : (
        <>
          {showFooterSections ? relatedDocuments : null}
          {showFooterSections ? communications : null}
          {showFooterSections ? systemNotes : null}
        </>
      )}
    </>
  )
}
