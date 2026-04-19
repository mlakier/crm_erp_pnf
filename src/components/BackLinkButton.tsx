'use client'

import { useRouter } from 'next/navigation'

export default function BackLinkButton({
  label,
  fallbackHref,
}: {
  label: string
  fallbackHref: string
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
          return
        }
        router.push(fallbackHref)
      }}
      className="text-sm hover:underline"
      style={{ color: 'var(--accent-primary-strong)' }}
    >
      {label}
    </button>
  )
}
