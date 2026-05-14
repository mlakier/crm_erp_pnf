'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MasterDataInlineEditControls from '@/components/MasterDataInlineEditControls'
import { getMasterDataInlineEditToolbarSlotId } from '@/lib/master-data-inline-edit'

type MasterDataInlineEditPortalProps = {
  tableId: string
  allowInlineEdit: boolean
  inlineEdit: boolean
  changedCount: number
  isPending?: boolean
  message?: string
  error?: string
  onStart: () => void
  onCancel: () => void
  onSave: () => void
}

export default function MasterDataInlineEditPortal({
  tableId,
  allowInlineEdit,
  inlineEdit,
  changedCount,
  isPending,
  message,
  error,
  onStart,
  onCancel,
  onSave,
}: MasterDataInlineEditPortalProps) {
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setToolbarTarget(document.getElementById(getMasterDataInlineEditToolbarSlotId(tableId)))
  }, [tableId])

  if (!toolbarTarget) return null

  return createPortal(
    <MasterDataInlineEditControls
      allowInlineEdit={allowInlineEdit}
      inlineEdit={inlineEdit}
      changedCount={changedCount}
      isPending={isPending}
      message={message}
      error={error}
      onStart={onStart}
      onCancel={onCancel}
      onSave={onSave}
    />,
    toolbarTarget,
  )
}
