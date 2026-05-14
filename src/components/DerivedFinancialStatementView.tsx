import FinancialStatementFilters from '@/components/FinancialStatementFilters'
import type { DerivedStatementLine, DerivedStatementSection } from '@/lib/derived-financial-statements'
import type { FinancialStatementAmountLayer } from '@/lib/financial-statement-report'

type Option = {
  id: string
  label: string
}

type FooterLine = {
  label: string
  amount: number
  emphasis?: 'normal' | 'subtotal' | 'total'
}

function formatAmount(amount: number) {
  const absolute = Math.abs(amount)
  const formatted = absolute.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (Math.abs(amount) < 0.005) return '0.00'
  return amount < 0 ? `(${formatted})` : formatted
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function rowClass(line: DerivedStatementLine | FooterLine) {
  if (line.emphasis === 'total') return 'text-sm font-bold text-white'
  if (line.emphasis === 'subtotal') return 'text-xs font-bold text-white'
  return 'text-xs text-white'
}

function labelPadding(level: DerivedStatementLine['level'] = 0) {
  if (level === 2) return 'pl-8'
  if (level === 1) return 'pl-4'
  return ''
}

function StatementRow({ line }: { line: DerivedStatementLine | FooterLine }) {
  const level = 'level' in line ? line.level : 0
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_9rem] items-baseline gap-6 py-0.5 ${rowClass(line)}`}>
      <div className={labelPadding(level)}>{line.label}</div>
      <div className="text-right">{formatAmount(line.amount)}</div>
    </div>
  )
}

export default function DerivedFinancialStatementView({
  title,
  subtitle,
  statementLabel,
  amountHeading,
  currencyLabel,
  basePath,
  periods,
  subsidiaries,
  selectedPeriodId,
  selectedSubsidiaryId,
  startDate,
  endDate,
  amountLayer,
  includeChildren,
  sections,
  footerLines,
  guardrail,
  showSectionTotals = true,
}: {
  title: string
  subtitle: string
  statementLabel: string
  amountHeading: string
  currencyLabel: string
  basePath: string
  periods: Option[]
  subsidiaries: Option[]
  selectedPeriodId: string | null
  selectedSubsidiaryId: string | null
  startDate: Date | null
  endDate: Date
  amountLayer: FinancialStatementAmountLayer
  includeChildren: boolean
  sections: DerivedStatementSection[]
  footerLines?: FooterLine[]
  guardrail?: string | null
  showSectionTotals?: boolean
}) {
  return (
    <main className="mx-auto min-h-full max-w-4xl px-4 py-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
          Record To Report
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      </div>

      <FinancialStatementFilters
        basePath={basePath}
        periods={periods}
        subsidiaries={subsidiaries}
        selectedPeriodId={selectedPeriodId}
        selectedSubsidiaryId={selectedSubsidiaryId}
        startDate={startDate}
        endDate={endDate}
        amountLayer={amountLayer}
        includeChildren={includeChildren}
        showAccountDetail={false}
        showStartDate={false}
        dateMode="month"
        showAccountDetailToggle={false}
      />

      {guardrail ? (
        <div
          className="mb-4 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--warning)', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
        >
          {guardrail}
        </div>
      ) : null}

      <section
        className="rounded-2xl border p-5"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-white">{statementLabel}</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {startDate ? `${formatDate(startDate)} through ${formatDate(endDate)}` : `As of ${formatDate(endDate)}`}
            </p>
          </div>
          <div className="pb-0.5 text-right text-xs font-bold uppercase tracking-[0.18em] underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>
            {amountHeading} <span className="ml-1">{currencyLabel}</span>
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          {sections.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <div className="mb-2 text-sm font-bold text-white">{section.label}</div>
              {section.lines.length > 0 ? (
                <div>
                  {section.lines.map((line, index) => (
                    <StatementRow key={`${section.label}-${line.label}-${index}`} line={line} />
                  ))}
                </div>
              ) : (
                <div className="py-0.5 pl-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  No activity
                </div>
              )}
              {showSectionTotals ? (
                <StatementRow line={{ label: `Net ${section.label}`, amount: section.total, emphasis: 'subtotal' }} />
              ) : null}
            </div>
          ))}

          {footerLines && footerLines.length > 0 ? (
            <div className="mt-4 pt-2">
              {footerLines.map((line) => (
                <StatementRow key={line.label} line={line} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
