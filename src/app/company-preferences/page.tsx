import Link from 'next/link'

const companyPreferencePages = [
  {
    href: '/company-preferences/money-display',
    title: 'Money Display',
    description: 'Locale, currency, date formatting, zero display, and negative number rules.',
  },
  {
    href: '/company-preferences/transaction-status-colors',
    title: 'Transaction Status Colors',
    description: 'Company-level status color mappings for transactions.',
  },
  {
    href: '/company-preferences/master-data-id-settings',
    title: 'Master Data Id Settings',
    description: 'Prefixes and numbering rules for users, items, customers, vendors, and other master records.',
  },
  {
    href: '/company-preferences/crm-id-settings',
    title: 'CRM Id Settings',
    description: 'Prefixes and numbering rules for leads and opportunities.',
  },
  {
    href: '/company-preferences/transaction-id-settings',
    title: 'Transaction Id Settings',
    description: 'Numbering rules for quotes, sales orders, invoices, purchasing, and journals.',
  },
]

export default function CompanyPreferencesPage() {
  return (
    <div className="min-h-full px-8 py-8">
      <div
        className="max-w-7xl rounded-2xl border p-8"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div>
          <h1 className="text-xl font-semibold text-white">Company Prefs</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Open the settings area you want to manage. Each section now has its own page to keep Company Prefs easier to work in.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companyPreferencePages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-2xl border p-5 transition hover:border-white/30 hover:bg-white/5"
              style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
            >
              <h2 className="text-base font-semibold text-white">{page.title}</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {page.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
