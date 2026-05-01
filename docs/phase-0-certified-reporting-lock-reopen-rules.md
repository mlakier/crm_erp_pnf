# Phase 0 Certified Reporting Lock and Reopen Rules

## Purpose

This document defines the canonical governance rules for:

- certified reporting outputs
- reporting lock states
- reopen and re-certification behavior
- relationship between close certification and reporting certification
- controlled regeneration of financial packages, dashboards, and snapshots

It builds on:

- [phase-0-close-checklist-schema.md](./phase-0-close-checklist-schema.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-summary-refresh-orchestration-rules.md](./phase-0-summary-refresh-orchestration-rules.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)

The goal is to ensure official financial and management outputs are governed, reproducible, and auditable while still allowing controlled reopening when required.

## Design Goals

1. Distinguish clearly between preliminary and certified reporting outputs.
2. Ensure certified outputs are reproducible from governed snapshots and refresh runs.
3. Support controlled reopen workflows when accounting or source data changes.
4. Preserve prior certifications and historical versions rather than overwriting them.
5. Align reporting certification with close governance, without making them inseparable.
6. Support app-scale governance for reports, dashboards, packages, and recurring-revenue outputs.

## Core Rule

Certified reporting should never be a silent byproduct of the latest data refresh.

Certified outputs must be explicitly marked, versioned, and governed.

If a certified reporting output must change, the platform should support a controlled reopen and re-certification process rather than in-place silent mutation.

## Certification States

The platform should distinguish at least these reporting states:

- draft
- preliminary
- review_ready
- certified
- reopened
- superseded
- archived

### Notes

- `preliminary` means the output is generated and reviewable, but not official.
- `certified` means the output is approved for official use under policy.
- `reopened` means a previously certified output has been intentionally reopened due to changed facts or governance action.
- `superseded` means a newer certified output now replaces it for official reference.

## Canonical Concepts

## 1. Reporting Certification Boundary

Certification should be applicable to:

- financial statements
- management reports
- board packages
- KPI packages
- recurring-revenue reports
- close-support reports
- dashboard snapshots where policy requires

Certification may attach to:

- one `ReportSnapshot`
- one `ReportPackageDefinition` output instance
- one dashboard snapshot
- one recurring-revenue snapshot

## 2. Lock Boundary

The platform should support multiple governance boundaries:

- accounting period lock
- close checklist certification
- report/package certification
- board-package release state

These are related, but not always identical.

### Example

- a period may be operationally closed
- but a management package may still be in review
- or a dashboard snapshot may remain preliminary

## 3. Reopen Boundary

Reopen should be explicit and auditable.

Reasons may include:

- late journal entry
- accrual correction
- FX rerun
- rev rec/amort rerun
- source data correction
- policy or classification correction
- reporting presentation correction

## Canonical Table Families

## 1. `ReportingCertification`

### Purpose

Represents one certification action or status record for a report, package, dashboard, or snapshot.

### Recommended canonical fields

- `id`
- `certificationNumber`
- `targetType`
- `targetId`
- `status`
- `accountingPeriodId`
- `asOfDate`
- `scopeJson`
- `sourceRefreshRunId`
- `sourceCloseChecklistInstanceId`
- `sourceSnapshotId`
- `certifiedAt`
- `certifiedById`
- `reviewedAt`
- `reviewedById`
- `message`
- `createdAt`
- `updatedAt`

### Suggested target types

- report_snapshot
- package_snapshot
- dashboard_snapshot
- recurring_revenue_snapshot
- financial_statement_set

## 2. `ReportingLockState`

### Purpose

Represents the current lock/governance state for a reporting target or scope.

### Recommended canonical fields

- `id`
- `targetType`
- `targetId`
- `lockType`
- `status`
- `accountingPeriodId`
- `scopeJson`
- `lockedAt`
- `lockedById`
- `unlockedAt`
- `unlockedById`
- `message`
- `createdAt`
- `updatedAt`

### Suggested lock types

- reporting_lock
- package_lock
- dashboard_lock
- close_dependent_lock

### Suggested statuses

- unlocked
- locked
- reopened
- superseded

## 3. `ReportingReopenEvent`

### Purpose

Represents one explicit reopen action against a previously locked or certified reporting output.

### Recommended canonical fields

- `id`
- `reopenNumber`
- `targetType`
- `targetId`
- `priorCertificationId`
- `priorLockStateId`
- `reasonCode`
- `message`
- `reopenedAt`
- `reopenedById`
- `createdAt`

### Suggested reason codes

- late_posting
- correction
- fx_rerun
- revrec_rerun
- amort_rerun
- source_data_change
- policy_change
- presentation_change

## 4. `ReportingSupersessionLink`

### Purpose

Preserves lineage when one certified reporting output supersedes another.

### Recommended canonical fields

- `id`
- `priorTargetType`
- `priorTargetId`
- `newTargetType`
- `newTargetId`
- `reasonCode`
- `createdAt`

## Governance Principles

## Certified Means Reproducible

Once a reporting output is certified, the platform should be able to identify:

- the source snapshot or report output
- the source refresh run(s)
- the close/checklist state that supported certification
- the user(s) who reviewed and certified it

## Reopen Does Not Erase History

Reopen should never destroy prior certified history.

Instead:

- preserve the prior certified output
- mark it as reopened or superseded
- create a new certification path for the revised output

## Close and Reporting Are Linked but Distinct

Close certification and reporting certification should integrate, but should remain separately traceable.

### Examples

- close may complete before the board package is certified
- a recurring-revenue package may be certified separately from the full financial package
- a dashboard snapshot may remain preliminary while statements are certified

## AI Governance Principle

AI may assist review, commentary, exception identification, and comparison of certified vs reopened outputs, but AI should not silently certify official reporting.

### Expectations

- AI can help identify likely reasons for reopen
- AI can draft certification/reopen commentary
- human certification control remains explicit

## Relationship to Refresh and Snapshots

Certification should be tied to governed refresh and snapshot artifacts.

### Expectations

- certifications should reference source snapshot ids where applicable
- certifications should reference source refresh runs where applicable
- reopen should invalidate or mark stale dependent outputs

## Relationship to Period Locking

Reporting lock and accounting period lock should be able to influence each other, but should not be assumed identical.

### Expectations

- a certified package may depend on period lock
- reopening a period may force reporting reopen or staleness
- policy should decide whether some reporting can stay certified despite non-material underlying changes

## Relationship to Dashboards and Packages

Dashboards and packages should support:

- preliminary vs certified views
- point-in-time snapshot comparison
- version lineage
- supersession tracking

This is especially important for:

- board decks
- management packages
- close packages
- recurring-revenue investor-style reporting

## Reporting Expectations

The model should support reporting on:

- certified vs preliminary outputs
- reopened outputs
- superseded outputs
- time-to-certification
- reopen frequency by report family
- certification bottlenecks
- material changes between certified versions

## Frontend Contract

The shared frontend should expose:

- certification status badges
- lock/reopen actions where permitted
- reopen reason capture
- historical version comparison
- supersession visibility
- certified vs preliminary report/package selection

These should be shared platform behaviors, not one-off report implementations.

## Indexing Guidance

### `ReportingCertification`

Consider indexes on:

- `id`
- `certificationNumber`
- `targetType`
- `targetId`
- `status`
- `accountingPeriodId`
- `certifiedAt`
- `certifiedById`

### `ReportingLockState`

Consider indexes on:

- `id`
- `targetType`
- `targetId`
- `lockType`
- `status`
- `accountingPeriodId`

### `ReportingReopenEvent`

Consider indexes on:

- `id`
- `reopenNumber`
- `targetType`
- `targetId`
- `priorCertificationId`
- `reopenedAt`
- `reopenedById`

## Immediate Next Tasks

1. define package export/rendering strategy for board and management outputs
2. define summary refresh monitoring and operator exception surfaces
3. define materiality-aware reopen policy rules
4. define certification workflow UX and approval routing
