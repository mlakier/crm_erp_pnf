'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import DraftContactsSection, { type DraftContactInput } from '@/components/DraftContactsSection'
import { isValidEmail } from '@/lib/validation'

export default function RecordCreateWithContactsPageClient({
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
  contactMode,
  initialContacts,
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
  contactMode: 'customer' | 'vendor'
  initialContacts: DraftContactInput[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<DraftContactInput[]>(initialContacts)
  const [contactError, setContactError] = useState('')

  function validateContacts() {
    if (contacts.length < 1) {
      setContactError('At least one contact is required.')
      return false
    }

    for (const contact of contacts) {
      if (!contact.firstName.trim() || !contact.lastName.trim()) {
        setContactError('Each contact needs a first name and last name.')
        return false
      }
      if (contact.email.trim() && !isValidEmail(contact.email)) {
        setContactError('Each contact email must be valid.')
        return false
      }
    }

    setContactError('')
    return true
  }

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
      <div className="space-y-8">
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
            if (!validateContacts()) return

            const normalizedContacts =
              contactMode === 'customer' && contacts.length > 0 && !contacts.some((contact) => contact.isPrimaryForCustomer)
                ? contacts.map((contact, index) => ({
                    ...contact,
                    isPrimaryForCustomer: index === 0,
                  }))
                : contacts

            const response = await fetch(createEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...values, ...extraPayload, contacts: normalizedContacts }),
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

        <DraftContactsSection
          mode={contactMode}
          contacts={contacts}
          onChange={(nextContacts) => {
            setContacts(nextContacts)
            if (contactError) {
              setContactError('')
            }
          }}
          error={contactError}
        />
      </div>
    </RecordDetailPageShell>
  )
}
