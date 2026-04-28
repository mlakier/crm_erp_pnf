'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RecordDetailEmptyState, RecordDetailSection } from '@/components/RecordDetailPanels'

type RelatedTabKey = 'customers' | 'contacts' | 'opportunities'

type RelatedRow = {
  id: string
  href: string
  reference: string
  primary: string
  secondary?: string | null
}

const TAB_STYLES: Record<RelatedTabKey, { activeBorder: string; activeText: string; activeBadge: string; inactiveText: string; inactiveBadge: string }> = {
  customers: {
    activeBorder: '#34d399',
    activeText: '#86efac',
    activeBadge: 'rgba(52,211,153,0.18)',
    inactiveText: '#7dd3b0',
    inactiveBadge: 'rgba(52,211,153,0.10)',
  },
  contacts: {
    activeBorder: 'var(--accent-primary-strong)',
    activeText: '#93c5fd',
    activeBadge: 'rgba(59,130,246,0.18)',
    inactiveText: '#8ab4f8',
    inactiveBadge: 'rgba(59,130,246,0.10)',
  },
  opportunities: {
    activeBorder: '#f59e0b',
    activeText: '#fcd34d',
    activeBadge: 'rgba(245,158,11,0.18)',
    inactiveText: '#d8b86a',
    inactiveBadge: 'rgba(245,158,11,0.10)',
  },
}

export default function LeadRelatedRecordsSection({
  customer,
  contact,
  opportunity,
}: {
  customer: RelatedRow | null
  contact: RelatedRow | null
  opportunity: RelatedRow | null
}) {
  const tabs = useMemo(
    () => [
      {
        key: 'customers' as const,
        label: 'Customers',
        rows: customer ? [customer] : [],
        emptyMessage: 'No customer has been linked to this lead yet.',
      },
      {
        key: 'contacts' as const,
        label: 'Contacts',
        rows: contact ? [contact] : [],
        emptyMessage: 'No contact has been linked to this lead yet.',
      },
      {
        key: 'opportunities' as const,
        label: 'Opportunities',
        rows: opportunity ? [opportunity] : [],
        emptyMessage: 'No opportunity has been linked to this lead yet.',
      },
    ],
    [contact, customer, opportunity],
  )

  const defaultKey = tabs.find((tab) => tab.rows.length > 0)?.key ?? 'customers'
  const [activeKey, setActiveKey] = useState<RelatedTabKey>(defaultKey)
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0]
  const totalCount = tabs.reduce((sum, tab) => sum + tab.rows.length, 0)

  return (
    <RecordDetailSection
      title="Related Records"
      count={totalCount}
      summary="Conversion targets"
      collapsible
    >
      <div className="border-b px-6 pt-5 pb-0" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="flex overflow-x-auto overflow-y-hidden">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey
            const palette = TAB_STYLES[tab.key]
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveKey(tab.key)}
                className="flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px"
                style={{
                  borderColor: isActive ? palette.activeBorder : 'transparent',
                  color: isActive ? palette.activeText : palette.inactiveText,
                }}
              >
                {tab.label}
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: isActive ? palette.activeBadge : palette.inactiveBadge,
                    color: isActive ? palette.activeText : palette.inactiveText,
                  }}
                >
                  {tab.rows.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab.rows.length === 0 ? (
        <RecordDetailEmptyState message={activeTab.emptyMessage} />
      ) : (
        <table className="min-w-full">
          <thead>
            <tr>
              <th
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}
              >
                Reference
              </th>
              <th
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}
              >
                Name
              </th>
              <th
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {activeTab.rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Link href={row.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                    {row.reference}
                  </Link>
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.primary}
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.secondary ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RecordDetailSection>
  )
}
