'use client'

import { usePathname } from 'next/navigation'
import AppSidebar from './AppSidebar'
import TableFilterSortEnhancer from './TableFilterSortEnhancer'
import GlobalSearch from './GlobalSearch'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Auth pages and the root redirect don't get the sidebar
  const isAuthPage = pathname === '/' || pathname?.startsWith('/auth') || pathname?.startsWith('/login')

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <TableFilterSortEnhancer />
      <AppSidebar />
      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="relative z-10 flex items-center justify-between border-b px-6 py-2" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--card-background)' }}>
          <div className="flex-1" />
          <GlobalSearch />
          <div className="flex-1" />
        </header>
        <main className="relative z-0 flex min-w-0 flex-1 flex-col overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
