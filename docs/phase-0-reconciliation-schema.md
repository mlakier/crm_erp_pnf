# Phase 0 Reconciliation Schema

## Purpose

This document defines the canonical architecture for:

- in-app reconciliations
- reconciliation headers and lines
- AI-assisted matching and exception triage
- open-item-driven reconciliation support
- reconciliation evidence, approvals, and certification
- linkage to monthly balance-sheet roll-forwards

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-open-item-schema.md](./phase-0-open-item-schema.md)
- [phase-0-clearing-schema.md](./phase-0-clearing-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)

The goal is to make reconciliations a native control process in the app, driven as much as practical by canonical open-item data and governed AI assistance, while tying directly into roll-forward reporting.

## Design Goals

1. Support reconciliations natively in-app without relying on external spreadsheets or third-party reconciliation tools.
2. Use open-item management as the primary driver wherever reconciliation subject matter is open-item-oriented.
3. Support AI-assisted grouping, matching, exception detection, and commentary.
4. Preserve human review, override, and certification controls.
5. Link reconciliations directly to balance-sheet roll-forwards and underlying GL/source records.
6. Scale to high-volume reconciliations across multiple entities, periods, and workstreams.

## Scope

This model applies to:

- bank reconciliations
- AR and AP reconciliations
- intercompany reconciliations
- account reconciliations for balance-sheet accounts
- open-item reconciliations
- close-related reconciliation workflows

It should also support future reconciliation families using the same control pattern.

## Core Rule

Reconciliations should be done in-app and should rely heavily on:

- canonical open-item data
- settlement and clearing lineage
- GL and summary-GL balances
- AI-assisted matching and exception analysis

They should integrate directly with monthly balance-sheet roll-forwards.

## Canonical Table Families

## 1. `ReconciliationDefinition`

### Purpose

Defines one governed reconciliation type or template.

Examples:

- bank_reconciliation
- ar_open_item_reconciliation
- ap_open_item_reconciliation
- intercompany_reconciliation
- prepaid_reconciliation

### Recommended canonical fields

- `id`
- `code`
- `name`
- `reconciliationType`
- `status`
- `description`
- `defaultScopeJson`
- `defaultAiCapabilityCode`
- `createdAt`
- `updatedAt`

### Suggested reconciliation types

- bank
- open_item
- intercompany
- account_balance
- rollforward_support

## 2. `ReconciliationInstance`

### Purpose

Represents one reconciliation for a specific period, account, entity, or scope.

### Recommended canonical fields

- `id`
- `instanceNumber`
- `reconciliationDefinitionId`
- `status`
- `accountingPeriodId`
- `asOfDate`
- `subsidiaryId`
- `accountId`
- `scopeJson`
- `bookBalanceTransactionAmount`
- `bookBalanceLocalAmount`
- `bookBalanceFunctionalAmount`
- `supportBalanceTransactionAmount`
- `supportBalanceLocalAmount`
- `supportBalanceFunctionalAmount`
- `varianceTransactionAmount`
- `varianceLocalAmount`
- `varianceFunctionalAmount`
- `startedAt`
- `completedAt`
- `certifiedAt`
- `message`
- `createdById`
- `createdAt`
- `updatedAt`

### Suggested statuses

- not_started
- in_progress
- exception_review
- balanced
- certified
- reopened
- canceled

## 3. `ReconciliationLine`

### Purpose

Represents one supporting line, matched line, or reconciling item within a reconciliation.

### Recommended canonical fields

- `id`
- `reconciliationInstanceId`
- `lineNumber`
- `lineType`
- `status`
- `sourceRecordType`
- `sourceRecordId`
- `sourceLineId`
- `openItemId`
- `clearingDocumentId`
- `glHeaderId`
- `glLineId`
- `summaryGlRowId`
- `transactionDate`
- `postingDate`
- `description`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `matchedGroupKey`
- `exceptionReasonCode`
- `aiConfidenceScore`
- `createdAt`
- `updatedAt`

### Suggested line types

- book_balance
- support_item
- matched_item
- reconciling_item
- variance_item
- rollforward_bridge

### Suggested statuses

- unmatched
- matched
- suggested
- accepted
- rejected
- cleared
- exception

## 4. `ReconciliationMatchGroup`

### Purpose

Represents one AI- or user-formed grouping of lines believed to reconcile together.

### Recommended canonical fields

- `id`
- `reconciliationInstanceId`
- `groupNumber`
- `status`
- `matchMethod`
- `confidenceScore`
- `explanationJson`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `createdAt`
- `updatedAt`

### Suggested match methods

- exact
- rule_based
- ai_suggested
- manual

### Suggested statuses

- suggested
- accepted
- rejected
- posted

## 5. `ReconciliationException`

### Purpose

Represents an unresolved reconciliation issue, blocker, or unusual variance.

### Recommended canonical fields

- `id`
- `reconciliationInstanceId`
- `reconciliationLineId`
- `matchGroupId`
- `severity`
- `status`
- `exceptionType`
- `message`
- `detailsJson`
- `assignedToId`
- `resolvedAt`
- `resolvedById`
- `resolutionNote`
- `createdAt`
- `updatedAt`

### Suggested exception types

- unmatched_balance
- timing_difference
- missing_support
- open_item_discrepancy
- fx_difference
- intercompany_mismatch
- duplicate_candidate
- policy_exception

## 6. `ReconciliationEvidence`

### Purpose

Represents supporting files, report snapshots, notes, or linked workpapers.

### Recommended canonical fields

- `id`
- `reconciliationInstanceId`
- `reconciliationLineId`
- `evidenceType`
- `referenceType`
- `referenceId`
- `fileReference`
- `note`
- `createdById`
- `createdAt`

### Suggested evidence types

- report_snapshot
- statement_line
- workpaper
- open_item_detail
- rollforward_support
- signoff_note

## 7. `ReconciliationApproval`

### Purpose

Represents review, approval, rejection, or certification of a reconciliation.

### Recommended canonical fields

- `id`
- `reconciliationInstanceId`
- `approvalType`
- `status`
- `actorId`
- `actedAt`
- `note`
- `createdAt`
- `updatedAt`

### Suggested approval types

- review
- approval
- certification
- override
- rejection

## Open-Item-Driven Reconciliation Principle

Reconciliations should be driven largely by open-item management where the underlying subject matter is receivables, payables, credits, settlements, or other open-item-controlled balances.

### Expectations

The reconciliation layer should be able to use:

- `OpenItem`
- `OpenItemEntry`
- `OpenItemApplication`
- `ClearingDocumentHeader`
- `ClearingDocumentLine`

as native source records rather than forcing users to rebuild settlement logic manually.

## AI-Assisted Reconciliation Principle

AI should be used as much as practical to help perform reconciliations, but under governed control.

### Examples of AI participation

- suggest line matches
- group likely reconciling items
- identify timing differences
- surface unusual variances
- draft reconciliation commentary
- prioritize exceptions for review

### Control expectations

- AI must remain switchable through the canonical AI control model
- AI suggestions must remain reviewable
- users must be able to accept, reject, or override AI matches
- AI-assisted reconciliations must remain auditable

## Roll-Forward Integration Principle

Reconciliations should integrate directly with monthly balance-sheet roll-forwards.

### Expectations

The platform should support drill-through:

- from roll-forward line to reconciliation
- from reconciliation to matched/unmatched support
- from reconciliation to GL, open item, clearing, and source transaction

### Reporting expectation

Reconciliation status should be visible as part of balance-sheet control reporting, not as a disconnected workpaper process.

## Relationship to GL and Summary GL

Reconciliations should use:

- detailed GL for precise source tracing
- indexed summary GL for fast balance-level reporting

### Rule

Summary balances should accelerate reconciliation work, but detailed GL and source/open-item lineage remain the source of truth for resolution and drill-through.

## Relationship to Close

Reconciliations should integrate directly with close checklists and certifications.

### Expectations

- reconciliation completion can satisfy close tasks
- unresolved reconciliation exceptions can block close tasks
- reconciliation certifications can feed close certification workflows

## Reporting Expectations

The model should support reporting on:

- reconciled vs unreconciled balances
- aging of unresolved reconciliation items
- AI-assisted match rates
- override rates
- period-over-period reconciliation completion
- reconciliation support for balance-sheet roll-forward lines

## Indexing Guidance

### `ReconciliationInstance`

Consider indexes on:

- `id`
- `instanceNumber`
- `reconciliationDefinitionId`
- `status`
- `accountingPeriodId`
- `asOfDate`
- `subsidiaryId`
- `accountId`

### `ReconciliationLine`

Consider indexes on:

- `id`
- `reconciliationInstanceId`
- `lineNumber`
- `status`
- `lineType`
- `openItemId`
- `clearingDocumentId`
- `glHeaderId`
- `glLineId`
- `summaryGlRowId`
- `matchedGroupKey`

### `ReconciliationException`

Consider indexes on:

- `id`
- `reconciliationInstanceId`
- `reconciliationLineId`
- `matchGroupId`
- `severity`
- `status`
- `assignedToId`

## Frontend Contract

The shared frontend should expose:

- reconciliation list pages
- reconciliation detail pages
- AI-assisted matching workspace
- exception queues
- evidence/support views
- certification/signoff flows
- drill-through into open items, clearing, GL, roll-forwards, and source records

These should be native in-app surfaces, not off-platform workarounds.

## Retrofit Guidance

The first-wave reconciliation layer should prioritize:

- bank reconciliations
- AR open-item reconciliations
- AP open-item reconciliations
- intercompany reconciliations
- roll-forward-supported balance-sheet reconciliations

## Immediate Next Tasks

1. define recurring-revenue movement taxonomy aligned to MRR reporting
2. define summary GL refresh/orchestration rules
3. define reconciliation-to-close certification rules
4. define bank matching specialization on top of the canonical reconciliation model
