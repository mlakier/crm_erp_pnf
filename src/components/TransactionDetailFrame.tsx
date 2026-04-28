import type { ReactNode } from 'react'

export default function TransactionDetailFrame({
  stats,
  header,
  lineItems,
  relatedDocuments,
  supplementarySections,
  communications,
  systemNotes,
  showFooterSections = true,
}: {
  stats?: ReactNode
  header: ReactNode
  lineItems: ReactNode
  relatedDocuments?: ReactNode
  supplementarySections?: ReactNode | ReactNode[]
  communications?: ReactNode
  systemNotes?: ReactNode
  showFooterSections?: boolean
}) {
  const extras = Array.isArray(supplementarySections)
    ? supplementarySections.filter(Boolean)
    : supplementarySections
      ? [supplementarySections]
      : []

  return (
    <>
      {stats ? <div className="mb-8">{stats}</div> : null}
      {header}
      {lineItems}
      {showFooterSections ? relatedDocuments : null}
      {showFooterSections
        ? extras.map((section, index) => (
            <div key={index}>{section}</div>
          ))
        : null}
      {showFooterSections ? communications : null}
      {showFooterSections ? systemNotes : null}
    </>
  )
}
