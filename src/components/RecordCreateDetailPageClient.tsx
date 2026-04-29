'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'

export default function RecordCreateDetailPageClient({
  resource,
  backHref,
  backLabel,
  title,
  detailsTitle,
  formId,
  sections,
  formColumns,
  createEndpoint,
  successRedirectBasePath,
  extraPayload,
}: {
  resource: string
  backHref: string
  backLabel: string
  title: string
  detailsTitle: string
  formId: string
  sections: InlineRecordSection[]
  formColumns: number
  createEndpoint: string
  successRedirectBasePath: string
  extraPayload?: Record<string, unknown>
}) {
  const router = useRouter()

  return (
    <RecordDetailPageShell
      backHref={backHref}
      backLabel={backLabel}
      meta="New"
      title={title}
      actions={
        <>
          <Link
            href={backHref}
            className="rounded-md border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            form={formId}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            Save
          </button>
        </>
      }
    >
      <MasterDataHeaderDetails
        resource={resource}
        id="new"
        title={detailsTitle}
        sections={sections}
        editing
        columns={formColumns}
        formId={formId}
        submitMode="controlled"
        onSubmit={async (values) => {
          const response = await fetch(createEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, ...extraPayload }),
          })

          const body = (await response.json().catch(() => null)) as { error?: string; id?: string } | null
          if (!response.ok) {
            throw new Error(body?.error ?? `Failed to create ${resource}`)
          }

          if (!body?.id) {
            throw new Error('Created record id was not returned')
          }

          router.push(`${successRedirectBasePath}/${body.id}`)
          router.refresh()
        }}
      />
    </RecordDetailPageShell>
  )
}
