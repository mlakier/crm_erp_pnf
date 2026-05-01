# Phase 0 AI Capability and Control Schema

## Purpose

This document defines the canonical architecture for:

- AI capability definitions
- AI enablement and control scope
- AI task definitions
- AI execution and audit records
- AI suggestion vs execution lineage
- human approval and override support

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)

The goal is to treat AI as a controlled app-wide platform layer instead of a scattered set of module-specific features.

## Design Goals

1. Support AI across all app areas through one shared control model.
2. Allow AI to be enabled or disabled at progressively narrower scopes.
3. Distinguish clearly between AI suggestion, AI draft, AI recommendation, and AI execution.
4. Preserve complete traceability of prompts, outputs, approvals, overrides, and resulting actions.
5. Support human review wherever accounting, financial control, or operational governance requires it.
6. Make AI participation visible in shared frontend patterns.
7. Scale to high-volume operational and close processes without redesigning the control model later.

## Scope

This model applies across the entire app, including:

- master data maintenance
- saved searches and list experiences
- transaction entry and review
- AP and AR automation
- treasury and bank operations
- reconciliations and matching
- reporting and analytics
- close operations
- planning and forecasting
- integrations and exception handling
- administration and configuration surfaces

## Core Rule

AI should never exist only as a hidden behavior.

If AI participates in a process, the platform should be able to answer:

- what capability was invoked?
- for which module, process, and step?
- with what scope and settings?
- what did the AI suggest or do?
- who approved, rejected, or overrode it?
- what records were affected?

The model should also be able to answer:

- was the AI acting in suggestion, draft, recommendation, or execution mode?
- was the AI acting independently within approved boundaries or waiting on human approval?
- how much of the process was AI-assisted versus manually completed?

## Canonical Table Families

## 1. `AiCapabilityDefinition`

### Purpose

Defines one reusable AI capability the platform can expose.

Examples:

- bank_match_suggestion
- reconciliation_assistant
- variance_analysis
- ap_ocr_coding
- vendor_bill_accrual_assistant
- close_commentary
- narrative_reporting
- anomaly_detection
- search_assistant

### Recommended canonical fields

- `id`
- `code`
- `name`
- `category`
- `status`
- `description`
- `defaultExecutionMode`
- `defaultApprovalMode`
- `isSystemDefined`
- `createdAt`
- `updatedAt`

### Suggested categories

- reconciliation
- classification
- analytics
- narrative
- workflow_assist
- exception_triage
- search_assist
- automation_assist

### Suggested execution modes

- disabled
- suggest_only
- draft_only
- recommend_action
- execute_with_approval
- execute_if_allowed

### Suggested approval modes

- no_approval_required
- optional_review
- required_review
- required_dual_review

## 2. `AiCapabilityScope`

### Purpose

Defines where a capability is enabled or disabled and with what behavior.

This is the main control table for app-wide and step-level AI governance.

### Recommended canonical fields

- `id`
- `aiCapabilityDefinitionId`
- `scopeType`
- `scopeKey`
- `status`
- `executionMode`
- `approvalMode`
- `settingsJson`
- `priority`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

### Suggested scope types

- global
- module
- page
- process_family
- process_step
- run_type
- role
- environment
- tenant

### Rule

More specific scopes should be able to override broader scopes according to priority and effective dating.

## 3. `AiTaskDefinition`

### Purpose

Defines one reusable AI task shape that can be invoked by workflows or users.

Examples:

- score bank-match candidates
- draft variance commentary
- recommend an accrual for an expected vendor bill not yet received
- draft or prepare a reversing accrual entry for a recurring vendor pattern
- propose expense coding
- summarize close exceptions
- identify unusual fluctuations

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `aiCapabilityDefinitionId`
- `moduleKey`
- `processFamily`
- `processStep`
- `inputSchemaJson`
- `outputSchemaJson`
- `defaultSettingsJson`
- `createdAt`
- `updatedAt`

## 4. `AiTaskExecution`

### Purpose

Represents one invocation of an AI task.

### Recommended canonical fields

- `id`
- `executionNumber`
- `aiTaskDefinitionId`
- `aiCapabilityDefinitionId`
- `status`
- `executionMode`
- `approvalMode`
- `scopeResolutionJson`
- `moduleKey`
- `processFamily`
- `processStep`
- `sourceRecordType`
- `sourceRecordId`
- `sourceLineId`
- `sourceRunId`
- `sourceExceptionId`
- `inputPayloadJson`
- `outputPayloadJson`
- `confidenceScore`
- `message`
- `requestedAt`
- `startedAt`
- `completedAt`
- `requestedById`
- `createdAt`
- `updatedAt`

### Suggested statuses

- queued
- running
- completed
- completed_with_review_required
- approved
- rejected
- executed
- failed
- canceled

## 5. `AiSuggestion`

### Purpose

Represents one AI-produced suggestion or draft output that can be reviewed independently from the execution event itself.

### Recommended canonical fields

- `id`
- `aiTaskExecutionId`
- `suggestionType`
- `status`
- `targetRecordType`
- `targetRecordId`
- `targetFieldKey`
- `suggestedValueJson`
- `explanationJson`
- `confidenceScore`
- `rankOrder`
- `createdAt`
- `updatedAt`

### Suggested suggestion types

- field_value
- record_classification
- match_candidate
- narrative
- exception_priority
- workflow_next_step
- journal_proposal

### Suggested statuses

- open
- accepted
- rejected
- superseded
- executed

## 6. `AiApproval`

### Purpose

Represents human review, approval, rejection, or override of an AI suggestion or execution.

### Recommended canonical fields

- `id`
- `aiTaskExecutionId`
- `aiSuggestionId`
- `approvalType`
- `status`
- `actorId`
- `actedAt`
- `reasonCode`
- `note`
- `createdAt`
- `updatedAt`

### Suggested approval types

- review
- approval
- rejection
- override

### Suggested statuses

- pending
- approved
- rejected
- overridden

## 7. `AiAffectedRecordLink`

### Purpose

Links AI activity to the records it influenced, updated, or generated.

### Recommended canonical fields

- `id`
- `aiTaskExecutionId`
- `aiSuggestionId`
- `recordType`
- `recordId`
- `lineId`
- `changeType`
- `createdAt`

### Suggested change types

- suggested
- drafted
- executed
- reviewed
- rejected

## 8. `AiPromptAudit` (optional, governed)

### Purpose

Preserves prompt/response lineage where governance, troubleshooting, or model oversight requires it.

### Recommended canonical fields

- `id`
- `aiTaskExecutionId`
- `promptReference`
- `responseReference`
- `modelIdentifier`
- `tokenUsageJson`
- `createdAt`

### Rule

This should be implemented in a way that respects privacy, governance, and retention requirements.

## 9. `AiPolicyException`

### Purpose

Represents a blocked or flagged AI use because policy or scope controls prevented execution.

### Recommended canonical fields

- `id`
- `aiCapabilityDefinitionId`
- `scopeType`
- `scopeKey`
- `sourceRecordType`
- `sourceRecordId`
- `reasonCode`
- `message`
- `createdAt`

## Control Principles

## Progressive Autonomy Principle

The architecture should support progressive AI autonomy over time.

That means the same task family should be able to evolve through modes such as:

- disabled
- suggest_only
- draft_only
- recommend_action
- execute_with_approval
- execute_if_allowed

without changing the underlying data model.

This is especially important for:

- close operations
- reconciliations
- variance analysis
- exception triage
- reporting package generation

## Suggestion vs Execution

The model must preserve the distinction between:

- AI suggestion
- AI draft
- AI recommendation
- AI execution

These should not be treated as the same operational state.

## Human Override

Where control matters, users must be able to:

- accept
- reject
- override
- manually complete the task without AI

## Scope Resolution

The platform should resolve AI controls in order from broadest to most specific, with explicit precedence and auditability.

Example resolution chain:

- global
- environment
- tenant
- module
- process family
- process step
- role

## Relationship to Runs and Exceptions

### Rule

AI activity should be able to participate in run-driven processes, but remain traceable as AI.

### Expectations

- run items may invoke AI tasks
- AI tasks may produce exceptions or triage exceptions
- AI task executions should link to run headers/items where relevant
- AI suggestions should be reviewable from exception and run detail screens

## Relationship to Transactions and Reporting

AI should support both operational workflows and analytical/reporting workflows.

Examples:

- coding suggestion for AP entry
- match candidate suggestion for bank matching
- accrual recommendation for a missing vendor bill during close
- draft recurring vendor accrual journal with expected reversal pattern
- variance commentary draft for reporting
- KPI explanation draft for financial package

The platform should preserve which records and outputs were touched.

## Relationship to Shared Frontend

The shared frontend should support:

- AI-enabled badges or status indicators
- AI suggestion drawers / panels
- accept/reject/override actions
- scope visibility for whether AI is on or off
- traceability back to execution and approval history

These should be implemented as reusable UI patterns, not page-specific hacks.

## Reporting Expectations

The model should support reporting on:

- AI usage volume by module/process
- acceptance and rejection rates
- execution vs suggestion rates
- override rates
- confidence trends
- exception rates
- impact on operational throughput where measurable
- AI-assisted close completion rates
- AI-executed vs human-executed close-task proportions

## Indexing Guidance

### `AiCapabilityScope`

Consider indexes on:

- `id`
- `aiCapabilityDefinitionId`
- `scopeType`
- `scopeKey`
- `status`
- `effectiveFrom`
- `effectiveTo`
- `priority`

### `AiTaskExecution`

Consider indexes on:

- `id`
- `executionNumber`
- `aiTaskDefinitionId`
- `aiCapabilityDefinitionId`
- `status`
- `moduleKey`
- `processFamily`
- `processStep`
- `sourceRecordType`, `sourceRecordId`
- `sourceRunId`
- `requestedAt`
- `completedAt`

### `AiSuggestion`

Consider indexes on:

- `id`
- `aiTaskExecutionId`
- `suggestionType`
- `status`
- `targetRecordType`, `targetRecordId`
- `targetFieldKey`

### `AiApproval`

Consider indexes on:

- `id`
- `aiTaskExecutionId`
- `aiSuggestionId`
- `approvalType`
- `status`
- `actorId`
- `actedAt`

## Frontend Contract

The platform should expose AI through shared, consistent surfaces across the app:

- task-level AI invocation components
- suggestion review panels
- AI audit/history views
- AI control and settings administration pages
- exception and approval queues

The same interaction language should appear across:

- master data
- transactions
- reporting
- close
- treasury
- integrations
- admin/configuration

## Retrofit Guidance

The first-wave app areas most likely to benefit from early AI control wiring are:

- bank matching
- AP ingestion / OCR / coding
- variance analysis
- close checklist and exception review
- saved-search and analytics assistance
- report narrative generation

These should use the canonical AI control model instead of inventing one-off AI toggles.

## Immediate Next Tasks

1. define canonical close checklist schema
2. define canonical reporting metadata schema
3. define canonical approval / override governance rules for AI-assisted accounting steps
4. define retention and privacy rules for AI prompt/response audit data
