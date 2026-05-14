'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import HelpTooltipIcon from '@/components/HelpTooltipIcon'

import type { DimensionConfigurationRow, DimensionTargetKey } from '@/lib/dimension-control-plane'
import {
  formatDimensionTargetLabel,
  formatDimensionSelectionTypeLabel,
  formatDimensionTypeLabel,
  formatDimensionValueModelLabel,
} from '@/lib/dimension-control-plane'

type Props = {
  initialRows: DimensionConfigurationRow[]
}

const SOURCE_EXTENSION_DEPENDENCIES: Record<string, DimensionTargetKey[]> = {
  customer_defaults: ['customer_record'],
  vendor_defaults: ['vendor_record'],
  item_defaults: ['item_record'],
  gl_account_defaults: ['gl_account_record'],
  project_defaults: ['project_header'],
  subscription_defaults: ['subscription_header'],
  subscription_plan_defaults: ['subscription_header'],
  subsidiary_defaults: ['subsidiary_record'],
  counterparty_defaults: ['customer_record', 'vendor_record', 'employee_record', 'contact_record'],
  employee_defaults: ['employee_record', 'user_record'],
  custom_record_defaults: ['custom_record'],
}

export default function ManageDimensionsClient({ initialRows }: Props) {
  const router = useRouter()
  const [deleteState, setDeleteState] = useState<{ id: string | null; error: string | null }>({ id: null, error: null })
  const activeCount = initialRows.filter((row) => row.isActive).length
  const seededCount = initialRows.filter((row) => row.isSeeded).length
  const needsReviewCount = initialRows.filter((row) => getPolicyIssues(row).length > 0).length

  async function deleteDimension(row: DimensionConfigurationRow) {
    const confirmed = window.confirm(`Delete custom dimension ${row.label}? This removes the dimension definition, its value list, and its value-field definitions if it is not used anywhere.`)
    if (!confirmed) return

    setDeleteState({ id: row.id, error: null })
    try {
      const response = await fetch('/api/config/dimensions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensionId: row.id }),
      })
      const body = (await response.json().catch(() => null)) as { error?: string | null } | null
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to delete dimension.')
      }
      setDeleteState({ id: null, error: null })
      router.refresh()
    } catch (error) {
      setDeleteState({ id: null, error: error instanceof Error ? error.message : 'Failed to delete dimension.' })
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border p-8"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-xl font-semibold text-white">Manage Dimensions</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Use this page to manage the dimension catalog simply: list dimensions, add new ones, and open a single
              dimension detail page for editing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/configuration/manage-dimensions/new"
              className="rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              New Dimension Setup
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Total Dimensions" value={String(initialRows.length)} />
          <MetricCard label="Active" value={String(activeCount)} />
          <MetricCard label="Seeded" value={String(seededCount)} />
          <MetricCard label="Needs Review" value={String(needsReviewCount)} />
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center justify-between gap-4 border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div>
            <h2 className="text-lg font-semibold text-white">Dimensions</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Open a dimension to edit its maintained record, or use setup to create a new one through a guided flow.
            </p>
          </div>
        </div>
        {deleteState.error ? (
          <div className="mx-6 mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: 'var(--danger)', backgroundColor: 'rgba(127, 29, 29, 0.18)' }}>
            {deleteState.error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead style={{ backgroundColor: 'var(--card-elevated)' }}>
              <tr>
                {[
                  { label: 'Dimension', helpText: 'The business-facing dimension name plus its seeded or custom status.' },
                  { label: 'Key', helpText: 'The stable internal identifier used by the platform.' },
                  { label: 'Model', helpText: 'Shows whether the dimension is internal or custom, how its values are modeled, and how users select values.' },
                  { label: 'Type', helpText: 'Shows whether the dimension behaves more like a financial reporting axis or an operational reporting axis.' },
                  { label: 'Value Source', helpText: 'The underlying value list the dimension uses, such as Departments, Locations, Classes, or a generic value pool.' },
                  { label: 'Applies To', helpText: 'Read-only summary of where this dimension is currently extended, such as customers, items, projects, subscriptions, or GL lines.' },
                  { label: 'Family Coverage', helpText: 'Shows which transaction families can carry this dimension on headers and/or lines.' },
                  { label: 'Sourcing', helpText: 'Shows how many ordered sourcing defaults are configured across transaction families.' },
                  { label: 'Health', helpText: 'A quick policy-readiness check for missing sources, requiredness gaps, or posting conflicts.' },
                  { label: 'Status', helpText: 'Whether the dimension is active for new use.' },
                  { label: 'Posting', helpText: 'Summarizes whether the dimension is configured to post to GL and whether GL should split by value.' },
                  { label: 'Action', helpText: 'Open the full editable detail page for this dimension.' },
                ].map((header) => (
                  <th
                    key={header.label}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{header.label}</span>
                      <HelpTooltipIcon content={header.helpText} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialRows.map((row) => {
                const policyIssues = getPolicyIssues(row)

                return (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border-muted)' }}>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{row.label}</span>
                      {row.isSeeded ? <Badge label="Seeded" tone="blue" /> : <Badge label="Custom" tone="slate" />}
                    </div>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.description || 'No description yet.'}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row.dimensionKey}
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div>{formatDimensionTypeLabel(row.dimensionType)}</div>
                    <div>{formatDimensionValueModelLabel(row.valueModel)}</div>
                    <div>{formatDimensionSelectionTypeLabel(row.selectionType)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row.postToGl ? 'Financial + Reporting' : 'Operational / Reporting'}
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatValueSourceLabel(row.valueSourceType)}
                  </td>
                  <td className="px-4 py-4">
                    <CoveragePills labels={getApplicabilityLabels(row)} emptyLabel="Not extended" />
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatFamilyCoverage(row)}
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatSourcingCoverage(row)}
                  </td>
                  <td className="px-4 py-4">
                    {policyIssues.length > 0 ? (
                      <Badge label={`${policyIssues.length} Review`} tone="amber" title={policyIssues.join('\n')} />
                    ) : (
                      <Badge label="Ready" tone="green" />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge label={row.isActive ? 'Active' : 'Inactive'} tone={row.isActive ? 'green' : 'slate'} />
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row.postToGl ? (row.requiresGlSplit ? 'Posts to GL + Split' : 'Posts to GL') : 'Reporting only'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/configuration/manage-dimensions/${row.id}`}
                        className="rounded-md border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Open
                      </Link>
                      {!row.isSeeded ? (
                        <button
                          type="button"
                          onClick={() => void deleteDimension(row)}
                          disabled={deleteState.id === row.id}
                          className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
                          style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: 'var(--danger)' }}
                        >
                          {deleteState.id === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function CoveragePills({ labels, emptyLabel }: { labels: string[]; emptyLabel: string }) {
  if (labels.length === 0) {
    return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{emptyLabel}</span>
  }

  const visibleLabels = labels.slice(0, 5)
  const hiddenLabels = labels.slice(visibleLabels.length)
  const hiddenCount = labels.length - visibleLabels.length

  return (
    <div className="flex max-w-sm flex-wrap gap-2">
      {visibleLabels.map((label) => (
        <Badge key={label} label={label} tone="slate" />
      ))}
      {hiddenCount > 0 ? <Badge label={`+${hiddenCount}`} tone="blue" title={hiddenLabels.join(', ')} /> : null}
    </div>
  )
}

function Badge({
  label,
  tone,
  title,
}: {
  label: string
  tone: 'amber' | 'blue' | 'green' | 'slate'
  title?: string
}) {
  const toneMap = {
    amber: { color: '#fde68a', borderColor: 'rgba(253, 230, 138, 0.4)', backgroundColor: 'rgba(180, 83, 9, 0.14)' },
    blue: { color: '#93c5fd', borderColor: 'rgba(147, 197, 253, 0.35)', backgroundColor: 'rgba(59, 130, 246, 0.12)' },
    green: { color: '#86efac', borderColor: 'rgba(134, 239, 172, 0.35)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
    slate: { color: 'var(--text-secondary)', borderColor: 'var(--border-muted)', backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  } as const

  const styles = toneMap[tone]
  return (
    <span
      className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={styles}
      title={title}
    >
      {label}
    </span>
  )
}

function getApplicabilityLabels(row: DimensionConfigurationRow) {
  return row.applicabilities
    .filter((entry) => entry.isVisible)
    .map((entry) => formatDimensionTargetLabel(entry.targetKey))
}

function formatValueSourceLabel(value: string) {
  switch (value) {
    case 'department':
      return 'Departments'
    case 'location':
      return 'Locations'
    case 'class':
      return 'Classes'
    case 'generic':
      return 'Generic Values'
    default:
      return value
  }
}

function formatFamilyCoverage(row: DimensionConfigurationRow) {
  const enabled = row.transactionFamilyAssignments
    .filter((assignment) => assignment.allowsHeader || assignment.allowsLine)
    .map((assignment) => {
      const scopes = [assignment.allowsHeader ? 'H' : '', assignment.allowsLine ? 'L' : ''].filter(Boolean).join('+')
      return `${formatFamilyLabel(assignment.familyKey)} ${scopes}`
    })

  return enabled.length > 0 ? enabled.join(', ') : 'No transaction families'
}

function formatSourcingCoverage(row: DimensionConfigurationRow) {
  const sourceCount = row.transactionFamilySourcingPolicies.reduce(
    (count, policy) => count + policy.headerSourcePriority.length + policy.lineSourcePriority.length,
    0,
  )
  if (sourceCount === 0) return 'No family sources'
  const blockedCount = getSourcingDependencyWarnings(row).length
  return blockedCount > 0 ? `${sourceCount} ordered sources, ${blockedCount} blocked` : `${sourceCount} ordered sources`
}

function formatFamilyLabel(value: string) {
  switch (value) {
    case 'crm':
      return 'LTC'
    case 'p2p':
      return 'PTP'
    case 'rtr':
      return 'RTR'
    case 'billing_revenue':
      return 'Billing'
    default:
      return value
  }
}

function getPolicyIssues(row: DimensionConfigurationRow) {
  const issues: string[] = []
  const enabledFamilies = row.transactionFamilyAssignments.filter((assignment) => assignment.allowsHeader || assignment.allowsLine)
  const familyPolicyByKey = new Map(row.transactionFamilySourcingPolicies.map((policy) => [policy.familyKey, policy]))

  if (row.isActive && enabledFamilies.length === 0) {
    issues.push('No transaction family application')
  }

  for (const assignment of enabledFamilies) {
    const policy = familyPolicyByKey.get(assignment.familyKey)
    if (assignment.allowsHeader && (!policy || policy.headerSourcePriority.length === 0)) {
      issues.push(`${formatFamilyLabel(assignment.familyKey)} header has no sources`)
    }
    if (assignment.allowsLine && (!policy || policy.lineSourcePriority.length === 0)) {
      issues.push(`${formatFamilyLabel(assignment.familyKey)} line has no sources`)
    }
  }

  if (row.postToGl && !row.allowsGlAssignment) {
    issues.push('Posts to GL but GL assignment is off')
  }
  if (row.requiresGlSplit && !row.postToGl) {
    issues.push('Requires GL split but does not post to GL')
  }
  if (row.validationMode !== 'optional' && !row.transactionFamilySourcingPolicies.some((policy) => policy.failIfUnresolved)) {
    issues.push('Required but unresolved values do not fail')
  }

  issues.push(...getSourcingDependencyWarnings(row))

  return issues
}

function getSourcingDependencyWarnings(row: DimensionConfigurationRow) {
  const warnings = new Set<string>()

  for (const policy of row.transactionFamilySourcingPolicies) {
    for (const sourceKey of new Set([...policy.headerSourcePriority, ...policy.lineSourcePriority])) {
      const eligibility = getSourceEligibility(row, sourceKey)
      if (!eligibility.eligible && eligibility.reason) {
        warnings.add(`${formatFamilyLabel(policy.familyKey)} uses ${formatSourceLabel(sourceKey)}, but ${eligibility.reason.toLowerCase()}`)
      }
    }
  }

  return Array.from(warnings)
}

function getSourceEligibility(row: DimensionConfigurationRow, sourceKey: string): { eligible: boolean; reason?: string } {
  const dependencies = SOURCE_EXTENSION_DEPENDENCIES[sourceKey] ?? []
  if (dependencies.length === 0) return { eligible: true }

  const hasRequiredExtension = dependencies.some((targetKey) =>
    row.applicabilities.some((entry) => entry.targetKey === targetKey && entry.isVisible),
  )
  if (hasRequiredExtension) return { eligible: true }

  return {
    eligible: false,
    reason: `Enable ${formatTargetList(dependencies)} in Where It Applies first.`,
  }
}

function formatSourceLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function formatTargetList(targetKeys: DimensionTargetKey[]) {
  const labels = targetKeys.map((targetKey) => formatDimensionTargetLabel(targetKey))
  if (labels.length <= 1) return labels[0] ?? 'the required target'
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, or ${labels[labels.length - 1]}`
}
