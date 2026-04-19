import Image from 'next/image'
import type { ReactNode } from 'react'

type MasterDataPageHeaderProps = {
  title: string
  total: number
  logoUrl?: string | null
  actions?: ReactNode
}

export default function MasterDataPageHeader({
  title,
  total,
  logoUrl,
  actions,
}: MasterDataPageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="w-64">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Company logo"
            width={256}
            height={64}
            unoptimized
            className="h-16 w-auto rounded"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {total} total
        </p>
      </div>
      <div className="flex w-64 justify-end gap-2">
        {actions}
      </div>
    </div>
  )
}
