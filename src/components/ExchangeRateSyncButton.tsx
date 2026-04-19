'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ExchangeRateSyncButton() {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  async function handleSync() {
    setSyncing(true)
    setMessage('')

    try {
      const response = await fetch('/api/exchange-rates/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const body = await response.json() as { error?: string; total?: number; baseCurrency?: string; effectiveDate?: string }
      if (!response.ok) {
        setMessageType('error')
        setMessage(body.error ?? 'Unable to sync exchange rates')
        return
      }

      setMessageType('success')
      setMessage(`Synced ${body.total ?? 0} rates for ${body.baseCurrency ?? 'base currency'} on ${body.effectiveDate ?? 'latest date'}.`)
      router.refresh()
    } catch {
      setMessageType('error')
      setMessage('Unable to sync exchange rates')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {syncing ? 'Syncing…' : 'Sync Latest Rates'}
      </button>
      {message ? (
        <p
          className="max-w-sm text-right text-xs"
          style={messageType === 'success' ? { color: '#86efac' } : { color: '#fca5a5' }}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
