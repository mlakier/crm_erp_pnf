import { getTransactionRequirementsViewRows } from '@/lib/transaction-requirements-view'
import type { TransactionRequirementsStatus } from '@/lib/transaction-requirements-view'

const SECTION_TITLES = {
  crm: 'CRM / Lead To Cash',
  ptp: 'Procure To Pay',
  rtr: 'Record To Report',
  accounting: 'Accounting Objects',
} as const

const STATUS_META: Record<
  TransactionRequirementsStatus,
  { label: string; text: string; border: string; background: string }
> = {
  complete: {
    label: 'Complete',
    text: 'var(--success)',
    border: 'rgba(34,197,94,0.35)',
    background: 'rgba(34,197,94,0.12)',
  },
  partial: {
    label: 'Partial',
    text: 'var(--warning)',
    border: 'rgba(245,158,11,0.35)',
    background: 'rgba(245,158,11,0.12)',
  },
  gap: {
    label: 'Gap',
    text: 'var(--danger)',
    border: 'rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.12)',
  },
  na: {
    label: 'N/A',
    text: 'var(--text-muted)',
    border: 'var(--border-muted)',
    background: 'var(--card-elevated)',
  },
}

function FieldChips({ fields }: { fields: string[] }) {
  if (!fields.length) {
    return <span style={{ color: 'var(--text-muted)' }}>None</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <span
          key={field}
          className="rounded-full border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card-elevated)' }}
        >
          {field}
        </span>
      ))}
    </div>
  )
}

function RuleList({ items }: { items: string[] }) {
  if (!items.length) {
    return <span style={{ color: 'var(--text-muted)' }}>None</span>
  }

  return (
    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  )
}

function PolicyValue({ value }: { value: string }) {
  return <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
}

function PolicyGrid({
  items,
  columns = 'sm:grid-cols-3',
}: {
  items: { label: string; value: string }[]
  columns?: string
}) {
  return (
    <div className={`mt-3 grid gap-3 ${columns}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {item.label}
          </p>
          <div className="mt-2 text-sm text-white">
            <PolicyValue value={item.value} />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: TransactionRequirementsStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        color: meta.text,
        borderColor: meta.border,
        backgroundColor: meta.background,
      }}
    >
      {meta.label}
    </span>
  )
}

export default async function TransactionRequiredFieldsPage() {
  const rows = await getTransactionRequirementsViewRows()
  const sections = Object.entries(SECTION_TITLES).map(([key, title]) => ({
    key,
    title,
    rows: rows.filter((row) => row.section === key),
  }))

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-7xl space-y-6">
        <div
          className="rounded-2xl border p-8"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <h1 className="text-xl font-semibold text-white">Transaction Required Fields</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Live view of the shared header requirements, posting-context rules, locked customize fields, and line rules per transaction family.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Core Rule
              </p>
              <p className="mt-2 text-sm text-white">Every transaction header must carry `subsidiaryId` and transaction `currencyId`.</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Shared Sources
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                `form-requirements.ts`, `transaction-posting-context.ts`, and `transaction-line-requirements.ts`
              </p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Reading Guide
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Header required = create/edit requirement. Posting context = non-negotiable posting rule. Locked fields = checked/greyed in shared customize.
              </p>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section
            key={section.key}
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
          >
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <div className="mt-4 space-y-4">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{row.label}</h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {row.formLabel ? `${row.formLabel} form` : 'No direct create form requirement block'}
                      </p>
                    </div>
                    <div
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      {row.lineMode}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Enforcement Status
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Header Rule Defined</span>
                              <StatusBadge status={row.headerRuleDefinedStatus} />
                            </div>
                          </div>
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Header API Enforced</span>
                              <StatusBadge status={row.headerApiEnforcedStatus} />
                            </div>
                          </div>
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Line Rule Defined</span>
                              <StatusBadge status={row.lineRuleDefinedStatus} />
                            </div>
                          </div>
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Line API Enforced</span>
                              <StatusBadge status={row.lineApiEnforcedStatus} />
                            </div>
                          </div>
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Customize Header Locked</span>
                              <StatusBadge status={row.customizeHeaderLockedStatus} />
                            </div>
                          </div>
                          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">Customize Line Locked</span>
                              <StatusBadge status={row.customizeLineLockedStatus} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Header Required
                        </p>
                        <div className="mt-2">
                          <FieldChips fields={row.headerRequiredFields} />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Posting Context
                        </p>
                        <div className="mt-2">
                          <FieldChips fields={row.postingContextFields} />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Locked In Customize
                        </p>
                        <div className="mt-2">
                          <FieldChips fields={row.headerLockedFields} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Line Policy
                        </p>
                        <PolicyGrid
                          items={[
                            {
                              label: 'Minimum Lines',
                              value: row.minimumLines == null ? 'N/A' : String(row.minimumLines),
                            },
                            { label: 'Negative Unit Price', value: row.negativeUnitPricePolicy },
                            { label: 'Negative Quantity', value: row.negativeQuantityPolicy },
                          ]}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Line Dimensions
                        </p>
                        <PolicyGrid items={row.lineDimensionPolicies} columns="sm:grid-cols-2" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Line Required Fields
                        </p>
                        <div className="mt-2">
                          <FieldChips fields={row.lineRequiredFields} />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Line Rules
                        </p>
                        <div className="mt-2">
                          <RuleList items={row.lineRuleSummary} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
