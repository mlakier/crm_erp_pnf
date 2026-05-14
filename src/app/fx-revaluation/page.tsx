import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { fmtDateOnly, fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import { loadCompanySetupSettings } from '@/lib/company-setup-settings-store'
import FxRevaluationRunPanel from '@/components/FxRevaluationRunPanel'
import CurrencyTranslationRunPanel from '@/components/CurrencyTranslationRunPanel'

function parseSummaryJson(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as {
      revaluedItems?: number
      skippedItems?: number
      failedItems?: number
      revaluedOpenItems?: number
      revaluedGlBalances?: number
      eligibleGlBalances?: number
      journalEntryId?: string | null
      localDeltaTotal?: number
      functionalDeltaTotal?: number
      groupTranslationDeltaTotal?: number
      translationStatus?: string | null
    }
  } catch {
    return null
  }
}

export default async function FxRevaluationPage() {
  const [
    { moneySettings },
    accountingPeriods,
    subsidiaries,
    recentRuns,
    recentTranslationRuns,
    eligibleRemeasurementAccounts,
    historicalCostFlaggedAccounts,
    translationSubsidiaries,
    companySetupSettings,
  ] = await Promise.all([
    loadCompanyDisplaySettings(),
    prisma.accountingPeriod.findMany({
      where: { closed: false },
      select: {
        id: true,
        name: true,
        subsidiaryId: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [{ endDate: 'desc' }, { name: 'asc' }],
    }),
    prisma.subsidiary.findMany({
      where: { active: true },
      select: { id: true, subsidiaryId: true, name: true },
      orderBy: [{ subsidiaryId: 'asc' }],
    }),
    prisma.runHeader.findMany({
      where: { runType: 'fx_revaluation' },
      include: {
        outputLinks: {
          where: { outputRecordType: 'journal_entry' },
          select: { outputRecordId: true },
          take: 1,
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    }),
    prisma.runHeader.findMany({
      where: { runType: 'translation' },
      include: {
        outputLinks: {
          where: { outputRecordType: 'journal_entry' },
          select: { outputRecordId: true },
          take: 1,
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    }),
    prisma.chartOfAccounts.count({
      where: {
        active: true,
        isPosting: true,
        revalueOpenBalance: true,
        monetaryClassification: 'monetary',
      },
    }),
    prisma.chartOfAccounts.count({
      where: {
        active: true,
        isPosting: true,
        revalueOpenBalance: true,
        monetaryClassification: { in: ['non_monetary_historical_cost', 'equity_historical', 'p_and_l_flow'] },
      },
    }),
    prisma.subsidiary.findMany({
      where: {
        active: true,
        groupCurrencyId: { not: null },
      },
      select: {
        id: true,
        functionalCurrencyId: true,
        groupCurrencyId: true,
      },
    }),
    loadCompanySetupSettings(),
  ])

  const defaultAsOfDate = new Date().toISOString().slice(0, 10)
  const translationSubsidiaryCount = translationSubsidiaries.filter((subsidiary) => (
    subsidiary.functionalCurrencyId
    && subsidiary.groupCurrencyId
    && subsidiary.functionalCurrencyId !== subsidiary.groupCurrencyId
  )).length
  const configuredCtaAccount = companySetupSettings.ctaAccountId
    ? await prisma.chartOfAccounts.findFirst({
      where: {
        id: companySetupSettings.ctaAccountId,
        active: true,
        isPosting: true,
      },
      select: { id: true },
    })
    : null
  const ctaConfigured = Boolean(configuredCtaAccount)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">FX Remeasurement & Translation</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Period-end unrealized FX remeasurement for open monetary balances, with translation/CTA kept as a separate close process.
        </p>
      </div>

      <FxRevaluationRunPanel
        accountingPeriods={accountingPeriods.map((period) => ({
          id: period.id,
          name: period.name,
          subsidiaryId: period.subsidiaryId ?? null,
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
        }))}
        subsidiaries={subsidiaries}
        defaultAsOfDate={defaultAsOfDate}
      />

      <CurrencyTranslationRunPanel
        accountingPeriods={accountingPeriods.map((period) => ({
          id: period.id,
          name: period.name,
          subsidiaryId: period.subsidiaryId ?? null,
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
        }))}
        subsidiaries={subsidiaries}
        defaultAsOfDate={defaultAsOfDate}
        ctaConfigured={ctaConfigured}
      />

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          {
            label: 'Remeasurement Scope',
            value: `${eligibleRemeasurementAccounts} monetary posting account${eligibleRemeasurementAccounts === 1 ? '' : 's'} enabled`,
            helper: 'Only monetary accounts flagged Remeasure Open Balance are included in this run.',
            status: eligibleRemeasurementAccounts > 0 ? 'Ready' : 'Needs Setup',
          },
          {
            label: 'Historical-Cost Guardrail',
            value: `${historicalCostFlaggedAccounts} invalid flag${historicalCostFlaggedAccounts === 1 ? '' : 's'}`,
            helper: 'Prepaids, deferred revenue/costs, fixed assets, inventory, equity, and P&L flow accounts should not be remeasured here.',
            status: historicalCostFlaggedAccounts === 0 ? 'Clean' : 'Review',
          },
          {
            label: 'Translation / CTA Readiness',
            value: ctaConfigured
              ? `Company CTA configured for ${translationSubsidiaryCount} translating subsidiar${translationSubsidiaryCount === 1 ? 'y' : 'ies'}`
              : 'Company CTA account missing',
            helper: 'Group translation is a separate close run and offsets to the CTA account configured in Company Setup.',
            status: ctaConfigured ? 'Ready' : 'Needs Setup',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border px-5 py-4"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  borderColor: item.status === 'Review' || item.status === 'Needs Setup' ? 'var(--warning)' : 'var(--success)',
                  color: item.status === 'Review' || item.status === 'Needs Setup' ? 'var(--warning)' : 'var(--success)',
                }}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.helper}</p>
          </div>
        ))}
      </section>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Recent Runs
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Remeasurement posts local/functional unrealized FX only. Group currency translation is reviewed separately and should flow to CTA, not P&L.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {['Run', 'Status', 'Requested', 'As Of', 'Summary', 'Journal'].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No FX revaluation runs yet.
                  </td>
                </tr>
              ) : (
                recentRuns.map((run, index) => {
                  const summary = parseSummaryJson(run.summaryJson)
                  const journalId = run.outputLinks[0]?.outputRecordId ?? summary?.journalEntryId ?? null

                  return (
                    <tr key={run.id} style={index < recentRuns.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link href={`/fx-revaluation/runs/${run.id}`} className="text-blue-400 hover:underline">
                          {run.runNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {run.status}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {fmtDocumentDate(run.requestedAt, moneySettings)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {run.asOfDate ? fmtDateOnly(run.asOfDate, moneySettings) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {summary
                          ? `Remeasured ${summary.revaluedItems ?? 0}, skipped ${summary.skippedItems ?? 0}, failed ${summary.failedItems ?? 0}`
                          : (run.message ?? '-')}
                        {summary?.eligibleGlBalances
                          ? (
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                              Open items: {summary.revaluedOpenItems ?? 0}; GL balances: {summary.revaluedGlBalances ?? 0}
                            </span>
                          )
                          : null}
                        {summary?.groupTranslationDeltaTotal
                          ? (
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                              Translation preview: {summary.groupTranslationDeltaTotal.toFixed(2)} not posted here
                            </span>
                          )
                          : null}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {journalId ? (
                          <Link href={`/journals/${journalId}`} className="text-blue-400 hover:underline">
                            Open Journal
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="mt-6 overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Recent Translation / CTA Runs
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Translation runs post group-currency balance-sheet true-ups and offset CTA. They do not post unrealized FX to P&L.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {['Run', 'Status', 'Requested', 'As Of', 'Summary', 'Journal'].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTranslationRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No translation / CTA runs yet.
                  </td>
                </tr>
              ) : (
                recentTranslationRuns.map((run, index) => {
                  const summary = parseSummaryJson(run.summaryJson) as ReturnType<typeof parseSummaryJson> & {
                    translatedAccounts?: number
                    skippedAccounts?: number
                    groupDeltaTotal?: number
                  }
                  const journalId = run.outputLinks[0]?.outputRecordId ?? summary?.journalEntryId ?? null

                  return (
                    <tr key={run.id} style={index < recentTranslationRuns.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link href={`/fx-revaluation/runs/${run.id}`} className="text-blue-400 hover:underline">
                          {run.runNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {run.status}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {fmtDocumentDate(run.requestedAt, moneySettings)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {run.asOfDate ? fmtDateOnly(run.asOfDate, moneySettings) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {summary
                          ? `Translated ${summary.translatedAccounts ?? 0}, skipped ${summary.skippedAccounts ?? 0}, failed ${summary.failedItems ?? 0}`
                          : (run.message ?? '-')}
                        {summary?.groupDeltaTotal
                          ? (
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                              CTA group delta: {summary.groupDeltaTotal.toFixed(2)}
                            </span>
                          )
                          : null}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {journalId ? (
                          <Link href={`/journals/${journalId}`} className="text-blue-400 hover:underline">
                            Open Journal
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
