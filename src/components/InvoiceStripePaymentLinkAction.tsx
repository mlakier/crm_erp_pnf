'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  invoiceId: string
  existingUrl?: string | null
  existingExpiresAt?: string | null
  disabled?: boolean
}

export default function InvoiceStripePaymentLinkAction({
  invoiceId,
  existingUrl,
  existingExpiresAt,
  disabled = false,
}: Props) {
  const router = useRouter()
  const [paymentUrl, setPaymentUrl] = useState(existingUrl ?? '')
  const [expiresAt, setExpiresAt] = useState(existingExpiresAt ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createPaymentLink() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/stripe-payment-link`, { method: 'POST' })
      const body = await res.json() as { paymentUrl?: string; expiresAt?: string | null; error?: string }
      if (!res.ok || !body.paymentUrl) {
        setError(body.error ?? 'Unable to create payment link')
        return
      }
      setPaymentUrl(body.paymentUrl)
      setExpiresAt(body.expiresAt ?? '')
      window.open(body.paymentUrl, '_blank', 'noopener,noreferrer')
      router.refresh()
    } catch {
      setError('Unable to create payment link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      {paymentUrl ? (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-primary)' }}
          title={expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : 'Open Stripe hosted checkout'}
        >
          Open Payment Link
        </a>
      ) : null}
      <button
        type="button"
        onClick={createPaymentLink}
        disabled={disabled || loading}
        className="rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        title={disabled ? 'Payment links are only available for open invoices with an outstanding amount.' : 'Create a Stripe hosted checkout link for this invoice.'}
      >
        {loading ? 'Creating...' : paymentUrl ? 'Refresh Payment Link' : 'Create Payment Link'}
      </button>
      {error ? (
        <span
          className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border px-3 py-2 text-xs shadow-xl"
          style={{
            backgroundColor: 'var(--card-elevated)',
            borderColor: 'rgba(239,68,68,0.45)',
            color: '#fca5a5',
          }}
        >
          {error}
        </span>
      ) : null}
    </div>
  )
}
