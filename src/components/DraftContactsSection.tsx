'use client'

import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'

export type DraftContactInput = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  isPrimaryForCustomer: boolean
  receivesQuotesSalesOrders: boolean
  receivesInvoices: boolean
  receivesInvoiceCc: boolean
}

export function createDraftContactInput(isPrimaryForCustomer = false): DraftContactInput {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    isPrimaryForCustomer,
    receivesQuotesSalesOrders: false,
    receivesInvoices: false,
    receivesInvoiceCc: false,
  }
}

export default function DraftContactsSection({
  mode,
  contacts,
  onChange,
  error,
}: {
  mode: 'customer' | 'vendor'
  contacts: DraftContactInput[]
  onChange: (nextContacts: DraftContactInput[]) => void
  error?: string
}) {
  function addDraft() {
    onChange([...contacts, createDraftContactInput(mode === 'customer' && contacts.length === 0)])
  }

  function updateDraft(id: string, updates: Partial<DraftContactInput>) {
    const nextContacts = contacts.map((contact) => {
      if (contact.id !== id) return contact
      return { ...contact, ...updates }
    })

    if (mode === 'customer' && updates.isPrimaryForCustomer === true) {
      onChange(
        nextContacts.map((contact) => ({
          ...contact,
          isPrimaryForCustomer: contact.id === id,
        }))
      )
      return
    }

    onChange(nextContacts)
  }

  function removeDraft(id: string) {
    const remaining = contacts.filter((contact) => contact.id !== id)
    if (mode === 'customer' && remaining.length > 0 && !remaining.some((contact) => contact.isPrimaryForCustomer)) {
      remaining[0] = { ...remaining[0], isPrimaryForCustomer: true }
    }
    onChange(remaining)
  }

  return (
    <RecordDetailSection
      title="Contacts"
      count={contacts.length}
      actions={
        <button
          type="button"
          onClick={addDraft}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
        >
          Add Contact
        </button>
      }
    >
      {contacts.length === 0 ? (
        <RecordDetailEmptyState message="At least one contact is required." />
      ) : (
        <table className="min-w-full">
          <thead>
            <tr>
              <RecordDetailHeaderCell>Name</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Email</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Phone</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Position</RecordDetailHeaderCell>
              {mode === 'customer' ? <RecordDetailHeaderCell>Primary</RecordDetailHeaderCell> : null}
              <RecordDetailHeaderCell>Quote/SO</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Invoice</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Invoice CC</RecordDetailHeaderCell>
              <RecordDetailHeaderCell>Actions</RecordDetailHeaderCell>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, index) => (
              <tr key={contact.id} style={{ borderTop: index > 0 ? '1px solid var(--border-muted)' : undefined }}>
                <RecordDetailCell>
                  <div className="grid min-w-56 grid-cols-2 gap-2">
                    <input
                      value={contact.firstName}
                      onChange={(event) => updateDraft(contact.id, { firstName: event.target.value })}
                      placeholder="First"
                      className={inputClass}
                      style={inputStyle}
                    />
                    <input
                      value={contact.lastName}
                      onChange={(event) => updateDraft(contact.id, { lastName: event.target.value })}
                      placeholder="Last"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </RecordDetailCell>
                <RecordDetailCell>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(event) => updateDraft(contact.id, { email: event.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </RecordDetailCell>
                <RecordDetailCell>
                  <input
                    value={contact.phone}
                    onChange={(event) => updateDraft(contact.id, { phone: event.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </RecordDetailCell>
                <RecordDetailCell>
                  <input
                    value={contact.position}
                    onChange={(event) => updateDraft(contact.id, { position: event.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </RecordDetailCell>
                {mode === 'customer' ? (
                  <RecordDetailCell className="text-center">
                    <input
                      type="checkbox"
                      checked={contact.isPrimaryForCustomer}
                      onChange={(event) => updateDraft(contact.id, { isPrimaryForCustomer: event.target.checked })}
                      className="h-4 w-4"
                    />
                  </RecordDetailCell>
                ) : null}
                <RecordDetailCell className="text-center">
                  <input
                    type="checkbox"
                    checked={contact.receivesQuotesSalesOrders}
                    onChange={(event) => updateDraft(contact.id, { receivesQuotesSalesOrders: event.target.checked })}
                    className="h-4 w-4"
                  />
                </RecordDetailCell>
                <RecordDetailCell className="text-center">
                  <input
                    type="checkbox"
                    checked={contact.receivesInvoices}
                    onChange={(event) => updateDraft(contact.id, { receivesInvoices: event.target.checked })}
                    className="h-4 w-4"
                  />
                </RecordDetailCell>
                <RecordDetailCell className="text-center">
                  <input
                    type="checkbox"
                    checked={contact.receivesInvoiceCc}
                    onChange={(event) => updateDraft(contact.id, { receivesInvoiceCc: event.target.checked })}
                    className="h-4 w-4"
                  />
                </RecordDetailCell>
                <RecordDetailCell>
                  <button
                    type="button"
                    onClick={() => removeDraft(contact.id)}
                    className="rounded-md border px-2.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                  >
                    Remove
                  </button>
                </RecordDetailCell>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error ? <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
    </RecordDetailSection>
  )
}

const inputClass = 'block w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white'
const inputStyle = { borderColor: 'var(--border-muted)' } as const
