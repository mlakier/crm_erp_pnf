'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
  normalizeCountryCode,
} from '@/lib/address-country-config'

export type AddressFields = {
  street1: string
  street2: string
  street3: string
  city: string
  stateProvince: string
  postalCode: string
  country: string
}

type ValidationResponse = {
  valid: boolean
  error?: string
  formattedAddress?: string
  components?: AddressFields
}

/** Parse a stored address string back into individual fields. */
export function parseAddress(raw: string): AddressFields {
  if (!raw.trim()) {
    return { street1: '', street2: '', street3: '', city: '', stateProvince: '', postalCode: '', country: DEFAULT_COUNTRY_CODE }
  }
  const parts = raw.split(', ')
  if (parts.length < 3) {
    return { street1: raw, street2: '', street3: '', city: '', stateProvince: '', postalCode: '', country: DEFAULT_COUNTRY_CODE }
  }
  const country = normalizeCountryCode(parts[parts.length - 1])
  const config = getCountryConfig(country)
  const statePostal = parts[parts.length - 2].trim()
  const city = parts[parts.length - 3]
  const streetParts = parts.slice(0, parts.length - 3)

  let stateProvince = ''
  let postalCode = ''

  if (statePostal) {
    const lastSpace = statePostal.lastIndexOf(' ')
    if (lastSpace !== -1) {
      const possibleState = statePostal.slice(0, lastSpace).trim()
      const possiblePostal = statePostal.slice(lastSpace + 1).trim()
      if (possiblePostal && (!config.postalValidation || config.postalValidation(possiblePostal))) {
        stateProvince = possibleState
        postalCode = possiblePostal
      } else if (!config.stateRequired) {
        postalCode = statePostal
      } else {
        stateProvince = statePostal
      }
    } else if (!config.stateRequired) {
      postalCode = statePostal
    } else {
      stateProvince = statePostal
    }
  }

  return {
    street1: streetParts[0] ?? '',
    street2: streetParts[1] ?? '',
    street3: streetParts[2] ?? '',
    city: city.trim(),
    stateProvince: stateProvince.trim(),
    postalCode: postalCode.trim(),
    country,
  }
}

export default function AddressModal({
  open,
  onClose,
  onSave,
  initialFields,
  zIndex = 130,
}: {
  open: boolean
  onClose: () => void
  onSave: (formattedAddress: string) => void
  initialFields: AddressFields
  zIndex?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [country, setCountry] = useState(initialFields.country || DEFAULT_COUNTRY_CODE)
  const [street1, setStreet1] = useState(initialFields.street1)
  const [street2, setStreet2] = useState(initialFields.street2)
  const [street3, setStreet3] = useState(initialFields.street3)
  const [city, setCity] = useState(initialFields.city)
  const [stateProvince, setStateProvince] = useState(initialFields.stateProvince)
  const [postalCode, setPostalCode] = useState(initialFields.postalCode)
  const [validationError, setValidationError] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [validatingWithGoogle, setValidatingWithGoogle] = useState(false)
  const [prompt, setPrompt] = useState('')

  useEffect(() => { setMounted(true) }, [])

  // Re-sync fields whenever the modal opens
  useEffect(() => {
    if (open) {
      setCountry(initialFields.country || DEFAULT_COUNTRY_CODE)
      setStreet1(initialFields.street1)
      setStreet2(initialFields.street2)
      setStreet3(initialFields.street3)
      setCity(initialFields.city)
      setStateProvince(initialFields.stateProvince)
      setPostalCode(initialFields.postalCode)
      setValidationError('')
      setValidationMessage('')
      setValidatingWithGoogle(false)
      setPrompt('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const config = getCountryConfig(country)

  function handleCountryChange(newCountry: string) {
    setCountry(newCountry)
    setStateProvince('')
    setPostalCode('')
    setValidationError('')
    setValidationMessage('')
  }

  function formatAddress(): string {
    const lines = [street1.trim(), street2.trim(), street3.trim()].filter(Boolean)
    const statePostal = [stateProvince.trim(), postalCode.trim()].filter(Boolean).join(' ')
    return [...lines, city.trim(), statePostal, country].filter(Boolean).join(', ')
  }

  function validate(): string | null {
    if (!street1.trim()) return 'Street Address 1 is required'
    if (!city.trim()) return 'City is required'
    if (config.stateRequired && !stateProvince.trim()) return `${config.stateLabel} is required`
    if (config.postalRequired && !postalCode.trim()) return `${config.postalLabel} is required`
    if (postalCode.trim() && config.postalValidation && !config.postalValidation(postalCode.trim())) {
      return config.postalError ?? 'Invalid postal code format'
    }
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError('')
    onSave(formatAddress())
  }

  async function handleValidateWithGoogle() {
    const err = validate()
    if (err) {
      setValidationError(err)
      setValidationMessage('')
      return
    }

    setValidatingWithGoogle(true)
    setValidationError('')
    setValidationMessage('')

    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street1,
          street2,
          street3,
          city,
          stateProvince,
          postalCode,
          country,
        }),
      })

      const body = (await response.json()) as ValidationResponse
      if (!response.ok || !body.valid || !body.components) {
        setValidationError(body.error ?? 'Google could not validate this address')
        return
      }

      setStreet1(body.components.street1)
      setStreet2(body.components.street2)
      setStreet3(body.components.street3)
      setCity(body.components.city)
      setStateProvince(body.components.stateProvince)
      setPostalCode(body.components.postalCode)
      setCountry(body.components.country)
      setValidationMessage('Google validated and normalized this address. Review it, then save.')
    } catch {
      setValidationError('Address validation failed')
    } finally {
      setValidatingWithGoogle(false)
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setPrompt('Use Save Address or Cancel to close this window.')
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-xl border p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Address</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>

        {prompt ? <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{prompt}</p> : null}

        <div className="space-y-3">
          {/* Country first — drives all field labels below */}
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Country *</label>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option
                  key={c.code}
                  value={c.code}
                  style={{ backgroundColor: 'var(--card-elevated)', color: '#fff' }}
                >
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 1 *</label>
            <input
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 2</label>
            <input
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 3</label>
            <input
              value={street3}
              onChange={(e) => setStreet3(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>City *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {config.stateLabel}{config.stateRequired ? ' *' : ''}
              </label>
              <input
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>

          <div className="sm:w-1/2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {config.postalLabel}{config.postalRequired ? ' *' : ''}
            </label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={config.postalPlaceholder}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>

          {validationError ? (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{validationError}</p>
          ) : null}

          {validationMessage ? (
            <p className="text-sm" style={{ color: 'var(--success)' }}>{validationMessage}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleValidateWithGoogle}
              disabled={validatingWithGoogle}
              className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              {validatingWithGoogle ? 'Validating...' : 'Validate with Google'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              Save Address
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
