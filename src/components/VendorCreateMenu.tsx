'use client'

import { useEffect, useRef, useState } from 'react'
import VendorDetailPurchaseOrderForm from '@/components/VendorDetailPurchaseOrderForm'

type CreateKind = 'requisition' | 'purchase-order' | 'bill' | null

export default function VendorCreateMenu({ vendorId, userId }: { vendorId: string; userId: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<CreateKind>(null)
  const [dismissPrompt, setDismissPrompt] = useState('')
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onWindowClick(event: MouseEvent) {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      setMenuOpen(false)
    }

    if (!menuOpen) return
    window.addEventListener('mousedown', onWindowClick)
    return () => window.removeEventListener('mousedown', onWindowClick)
  }, [menuOpen])

  const closeModal = () => {
    setActive(null)
    setDismissPrompt('')
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          <span className="mr-1.5 text-lg leading-none">+</span>Create
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 z-40 mt-2 min-w-[210px] overflow-hidden rounded-lg border shadow-xl"
            style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
          >
            <button
              type="button"
              onClick={() => {
                setActive('requisition')
                setMenuOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
            >
              Purchase Requisition
            </button>
            <button
              type="button"
              onClick={() => {
                setActive('purchase-order')
                setMenuOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
            >
              Purchase Order
            </button>
            <button
              type="button"
              onClick={() => {
                setActive('bill')
                setMenuOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
            >
              Bill
            </button>
          </div>
        ) : null}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDismissPrompt('Use Save or Cancel in the form to close this window.')
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl border p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-3xl font-semibold text-white">
                {active === 'requisition'
                  ? 'Create Purchase Requisition'
                  : active === 'purchase-order'
                    ? 'Create Purchase Order'
                    : 'Create Bill'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md px-2 py-1 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
            {dismissPrompt ? <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{dismissPrompt}</p> : null}

            {active === 'purchase-order' ? (
              <VendorDetailPurchaseOrderForm vendorId={vendorId} userId={userId} onSuccess={closeModal} onCancel={closeModal} embedded />
            ) : (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {active === 'requisition'
                    ? 'Purchase Requisition create flow is not wired yet in this environment.'
                    : 'Bill create flow is not wired yet in this environment.'}
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
