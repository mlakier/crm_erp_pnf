'use client'

import { usePathname } from 'next/navigation'
import AppSidebar from './AppSidebar'
import TableFilterSortEnhancer from './TableFilterSortEnhancer'

export default function AppShell({
  children,
  companyLogoUrl,
}: {
  children: React.ReactNode
  companyLogoUrl?: string | null
}) {
  const pathname = usePathname()

  // Auth pages and the root redirect don't get the sidebar
  const isAuthPage = pathname === '/' || pathname?.startsWith('/auth') || pathname?.startsWith('/login')

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <TableFilterSortEnhancer />
      <AppSidebar companyLogoUrl={companyLogoUrl ?? null} />
      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="relative z-0 flex min-w-0 flex-1 flex-col overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
