# Phase 0 Close Checklist Schema

## Purpose

This document defines the canonical architecture for:

- interactive accounting and close checklists
- close templates and task definitions
- period-specific close instances
- task dependencies and approvals
- links to runs, exceptions, reports, and reconciliations
- optional AI-assisted close support under platform control

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)

The goal is to make close operations a first-class governed platform capability rather than a loose sequence of manual reminders and hidden process knowledge.

## Design Goals

1. Support repeatable close templates for month-end, quarter-end, year-end, and sub-close processes.
2. Support task sequencing, dependencies, ownership, approvals, and evidence.
3. Link close steps directly to runs, reports, reconciliations, and resulting records.
4. Support exception and blocker visibility.
5. Support AI assistance as an optional, controllable layer rather than a mandatory behavior.
6. Support full auditability of who completed, approved, deferred, or overrode close steps.
7. Scale to multi-entity, high-volume close operations where AI can eventually complete a meaningful portion of the workflow.

## Scope

This model applies to:

- accounting close
- treasury close
- AR close
- AP close
- revenue close
- fixed asset close
- FX remeasurement / translation close
- consolidation close
- management reporting package completion

It also supports future operational checklist families using the same pattern.

## Core Rule

A close process is not just a static checklist.

A close process is:

- a reusable template
- instantiated for a specific period or scope
- made of governed task instances
- linked to evidence, runs, exceptions, and approvals

The model should be able to support both:

- human-operated close
- progressively AI-operated close within controlled boundaries

## Canonical Table Families

## 1. `CloseChecklistTemplate`

### Purpose

Defines one reusable checklist template.

Examples:

- month_end_close
- quarter_end_close
- year_end_close
- treasury_close
- revenue_close

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `closeType`
- `description`
- `defaultScopeJson`
- `version`
- `createdAt`
- `updatedAt`

### Suggested close types

- monthly
- quarterly
- annual
- treasury
- revenue
- ap
- ar
- fixed_assets
- consolidation
- management_reporting

## 2. `CloseChecklistTemplateTask`

### Purpose

Defines one reusable task step inside a close template.

### Recommended canonical fields

- `id`
- `closeChecklistTemplateId`
- `taskCode`
- `taskName`
- `taskType`
- `sequenceNumber`
- `description`
- `ownerRoleKey`
- `reviewerRoleKey`
- `approvalMode`
- `isRequired`
- `canRunInParallel`
- `defaultDueOffsetJson`
- `defaultAiCapabilityCode`
- `settingsJson`
- `createdAt`
- `updatedAt`

### Suggested task types

- run_process
- review_report
- reconciliation
- certification
- variance_analysis
- checklist_step
- approval
- report_package
- journal_review
- exception_review

### Suggested approval modes

- no_approval
- optional_review
- required_review
- required_dual_review

## 3. `CloseChecklistTaskDependency`

### Purpose

Defines task dependency relationships inside a template.

### Recommended canonical fields

- `id`
- `closeChecklistTemplateId`
- `predecessorTaskId`
- `successorTaskId`
- `dependencyType`
- `createdAt`

### Suggested dependency types

- finish_to_start
- finish_to_finish
- start_to_start

## 4. `CloseChecklistInstance`

### Purpose

Represents one instantiated checklist for a specific accounting period, scope, or close event.

### Recommended canonical fields

- `id`
- `instanceNumber`
- `closeChecklistTemplateId`
- `status`
- `accountingPeriodId`
- `asOfDate`
- `scopeJson`
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
- blocked
- completed
- certified
- reopened
- canceled

## 5. `CloseChecklistTaskInstance`

### Purpose

Represents one live task inside a close instance.

### Recommended canonical fields

- `id`
- `closeChecklistInstanceId`
- `closeChecklistTemplateTaskId`
- `status`
- `taskType`
- `taskCode`
- `taskName`
- `assignedToId`
- `reviewerId`
- `dueAt`
- `startedAt`
- `completedAt`
- `approvedAt`
- `blockedReason`
- `message`
- `evidenceSummaryJson`
- `createdAt`
- `updatedAt`

### Suggested statuses

- not_started
- ready
- in_progress
- waiting_on_dependency
- waiting_on_review
- blocked
- completed
- approved
- rejected
- reopened
- skipped

## 6. `CloseChecklistTaskLink`

### Purpose

Links a close task instance to the records, runs, reports, or exceptions it depends on or produces.

### Recommended canonical fields

- `id`
- `closeChecklistTaskInstanceId`
- `linkType`
- `recordType`
- `recordId`
- `lineId`
- `createdAt`

### Suggested link types

- run
- report
- reconciliation
- journal
- exception
- file
- workpaper
- certification

## 7. `CloseChecklistApproval`

### Purpose

Represents review, approval, rejection, or certification activity on a close task or checklist instance.

### Recommended canonical fields

- `id`
- `closeChecklistInstanceId`
- `closeChecklistTaskInstanceId`
- `approvalType`
- `status`
- `actorId`
- `actedAt`
- `note`
- `createdAt`
- `updatedAt`

### Suggested approval types

- task_review
- task_approval
- checklist_certification
- rejection
- override

### Suggested statuses

- pending
- approved
- rejected
- overridden

## 8. `CloseChecklistException`

### Purpose

Represents a blocker, warning, or unresolved issue related to the close process.

### Recommended canonical fields

- `id`
- `closeChecklistInstanceId`
- `closeChecklistTaskInstanceId`
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

### Suggested severities

- info
- warning
- error
- blocking

### Suggested statuses

- open
- in_review
- resolved
- overridden
- ignored

## 9. `CloseChecklistEvidence`

### Purpose

Represents stored evidence, workpapers, notes, or report outputs tied to a close step.

### Recommended canonical fields

- `id`
- `closeChecklistTaskInstanceId`
- `evidenceType`
- `referenceType`
- `referenceId`
- `fileReference`
- `note`
- `createdById`
- `createdAt`

### Suggested evidence types

- report_snapshot
- exported_package
- reconciliation_support
- workpaper
- run_output
- signoff_note

## Relationship to Runs

### Rule

Close tasks should link directly to process runs where those runs are part of close execution.

### Examples

- FX remeasurement run
- translation / CTA run
- revenue recognition journal run
- amortization run
- payment run
- billing run where relevant to period close

### Expectation

Users should be able to drill:

- from checklist to run
- from run to output
- from output to GL or source transaction

## Relationship to Reporting

### Rule

Close should link directly to the reporting outputs that prove the step was performed.

Examples:

- trial balance
- roll-forward report
- variance analysis
- deferred waterfall
- management package
- bank reconciliation summary

## Relationship to AI

### Rule

AI can assist close, but only through the governed AI capability/control model.

### Example AI-assisted close tasks

- variance analysis drafts
- exception triage
- reconciliation commentary
- recommend accruals for expected vendor bills not yet received
- draft recurring accrual and reversal patterns for known vendor cycles
- close summary generation
- next-best-step guidance

### Control expectations

- AI must be enabled for the relevant module/process/step
- AI outputs must remain reviewable
- human override must exist
- AI activity must be auditable

### Long-term design expectation

The close architecture should support a future state where AI performs a meaningful portion of close execution, including:

- running variance analysis tasks
- preparing close commentary
- triaging exceptions
- recommending or preparing certifications
- driving next-best-step sequencing

without weakening:

- approval controls
- evidence requirements
- audit history
- period-governance rules

## Period Governance Principle

Close instances should be period-aware and support reopening with auditability.

### Expectations

- checklist instances tie to accounting periods and/or as-of dates
- reopened close tasks preserve prior approval history
- certifications are never silently overwritten

## Reporting Expectations

The model should support reporting on:

- checklist completion status
- overdue close tasks
- blockers and exceptions
- cycle times by task and by close type
- run completion dependency status
- approval bottlenecks
- AI-assisted close usage where enabled
- percentage of close tasks completed with AI participation
- percentage of close tasks completed through AI execution modes
- close scalability by entity, workstream, and period

## Indexing Guidance

### `CloseChecklistInstance`

Consider indexes on:

- `id`
- `instanceNumber`
- `closeChecklistTemplateId`
- `status`
- `accountingPeriodId`
- `asOfDate`
- `startedAt`
- `completedAt`

### `CloseChecklistTaskInstance`

Consider indexes on:

- `id`
- `closeChecklistInstanceId`
- `closeChecklistTemplateTaskId`
- `status`
- `taskType`
- `taskCode`
- `assignedToId`
- `reviewerId`
- `dueAt`
- `completedAt`

### `CloseChecklistException`

Consider indexes on:

- `id`
- `closeChecklistInstanceId`
- `closeChecklistTaskInstanceId`
- `severity`
- `status`
- `assignedToId`

## Frontend Contract

The shared frontend should expose:

- checklist list pages
- checklist detail pages
- task boards / task lists
- dependency and blocker visibility
- evidence attachment / review surfaces
- signoff and approval interactions
- exception queues

These should use shared list/detail patterns wherever possible.

## Retrofit Guidance

The first-wave checklist should cover:

- month-end accounting close
- FX remeasurement / translation completion
- bank reconciliation completion
- revenue recognition run completion
- amortization run completion
- management reporting package completion

This should evolve into broader guided accounting and operational close workflows later.

## Immediate Next Tasks

1. define canonical reporting metadata schema
2. define canonical reconciliation schema
3. define close-task to run-task dependency rules
4. define certification and period-locking interactions
