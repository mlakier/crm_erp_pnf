# Phase 0 Run and Integration Schema

## Purpose

This document defines the canonical architecture for:

- process runs and batch execution
- run detail / item records
- exception and retry handling
- integration definitions and connections
- inbound and outbound message logging
- scheduled jobs and orchestration

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)
- [phase-0-clearing-schema.md](./phase-0-clearing-schema.md)
- [phase-0-fx-intercompany-schema.md](./phase-0-fx-intercompany-schema.md)

The goal is to make operational runs, accounting runs, and integrations first-class platform records rather than scattered background behaviors.

## Design Goals

1. Model all major process runs with a common header/detail pattern.
2. Preserve full auditability of what a run did, when, and to which records.
3. Support exception-oriented operations instead of opaque background jobs.
4. Support retries, dead-letter handling, and operator review.
5. Support both accounting runs and operational integrations through shared platform contracts.
6. Make orchestration visible to users and administrators through consistent UI patterns.

## Scope

This model applies to:

- billing runs
- payment runs
- revenue recognition journal runs
- amortization runs
- month-end FX runs
- translation runs
- bank import and matching runs
- AP inbox / OCR / auto-coding pipelines
- webhook processing
- file imports / exports
- scheduled notifications and report delivery

It does not require every run family to exist immediately, but all should fit this common model.

## Core Rule

A run is not just a background status flag on a source transaction.

A run is:

- a first-class header
- plus one or more scoped items / detail rows
- plus output and exception lineage
- plus operator-visible state

## Canonical Table Families

## 1. `RunHeader`

### Purpose

Represents one execution of a batch, process, or orchestration flow.

Examples:

- one billing run
- one payment run
- one revenue recognition journal run
- one bank statement import run
- one AP inbox ingestion run

### Recommended canonical fields

- `id`
- `runNumber`
- `runType`
- `status`
- `triggerType`
- `scopeType`
- `scopeJson`
- `requestedAt`
- `startedAt`
- `completedAt`
- `asOfDate`
- `accountingPeriodId`
- `subsidiaryScope`
- `message`
- `summaryJson`
- `requestedById`
- `startedById`
- `completedById`
- `parentRunId`
- `orchestrationId`
- `createdAt`
- `updatedAt`

### Suggested run types

- billing
- payment
- revrec
- amortization
- fx_ingestion
- fx_remeasurement
- translation
- bank_import
- bank_match
- ap_ingestion
- ocr
- auto_coding
- report_delivery
- webhook_processing
- file_import
- file_export

### Suggested status values

- queued
- running
- completed
- completed_with_exceptions
- failed
- canceled
- reversed if a run family supports reversal semantics

### Suggested trigger types

- manual
- scheduled
- event_driven
- integration
- orchestrated

## 2. `RunItem`

### Purpose

Represents one work unit or scoped record inside a run.

Examples:

- one invoice being billed
- one bill being paid
- one open item being remeasured
- one bank statement line being matched
- one AP email being ingested

### Recommended canonical fields

- `id`
- `runHeaderId`
- `itemNumber`
- `itemType`
- `status`
- `sourceRecordType`
- `sourceRecordId`
- `sourceLineId`
- `targetRecordType`
- `targetRecordId`
- `targetLineId`
- `message`
- `requestPayloadJson`
- `resultPayloadJson`
- `startedAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### Suggested item statuses

- pending
- running
- succeeded
- skipped
- warning
- failed
- retried

## 3. `RunOutputLink`

### Purpose

Links a run or item to the records it generated or affected.

### Recommended canonical fields

- `id`
- `runHeaderId`
- `runItemId`
- `outputType`
- `outputRecordType`
- `outputRecordId`
- `outputLineId`
- `glHeaderId`
- `glLineId`
- `createdAt`

### Examples

- billing run generated invoice
- payment run generated check
- rev rec run generated journal
- FX remeasurement run generated GL posting

## 4. `RunException`

### Purpose

Represents one operator-visible exception raised during a run.

### Recommended canonical fields

- `id`
- `runHeaderId`
- `runItemId`
- `severity`
- `exceptionType`
- `status`
- `sourceRecordType`
- `sourceRecordId`
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
- ignored
- superseded

## 5. `RetryQueueItem`

### Purpose

Represents a retryable failed operation.

### Recommended canonical fields

- `id`
- `sourceType`
- `sourceId`
- `runHeaderId`
- `runItemId`
- `retryType`
- `status`
- `attemptCount`
- `nextAttemptAt`
- `lastAttemptAt`
- `message`
- `payloadJson`
- `createdAt`
- `updatedAt`

### Suggested statuses

- pending
- scheduled
- retrying
- succeeded
- failed_terminal
- moved_to_dead_letter

## 6. `DeadLetterItem`

### Purpose

Represents an operation that could not be completed automatically and requires operator action.

### Recommended canonical fields

- `id`
- `sourceType`
- `sourceId`
- `runHeaderId`
- `runItemId`
- `failureType`
- `status`
- `message`
- `payloadJson`
- `lastAttemptAt`
- `createdAt`
- `updatedAt`

## 7. `IntegrationDefinition`

### Purpose

Represents one configured integration capability.

Examples:

- bank provider connection
- AP inbox ingestion
- OCR vendor
- CRM sync
- data warehouse export

### Recommended canonical fields

- `id`
- `code`
- `name`
- `integrationType`
- `direction`
- `status`
- `provider`
- `version`
- `settingsJson`
- `createdAt`
- `updatedAt`

### Suggested integration types

- rest
- soap
- webhook
- sftp
- email
- ocr
- file_import
- file_export

## 8. `IntegrationConnection`

### Purpose

Represents one credentialed or configured connection instance.

### Recommended canonical fields

- `id`
- `integrationDefinitionId`
- `connectionName`
- `status`
- `authType`
- `endpoint`
- `credentialReference`
- `lastSuccessfulAt`
- `lastFailureAt`
- `message`
- `createdAt`
- `updatedAt`

## 9. `IntegrationMessage`

### Purpose

Represents one inbound or outbound message or payload event.

### Recommended canonical fields

- `id`
- `integrationDefinitionId`
- `integrationConnectionId`
- `direction`
- `messageType`
- `status`
- `externalMessageId`
- `sourceRecordType`
- `sourceRecordId`
- `payloadReference`
- `receivedAt`
- `processedAt`
- `message`
- `createdAt`
- `updatedAt`

### Suggested directions

- inbound
- outbound

### Suggested statuses

- received
- queued
- processed
- failed
- retried
- dead_lettered

## 10. `ScheduledJobDefinition`

### Purpose

Represents a reusable scheduled job or orchestration schedule.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `jobType`
- `status`
- `scheduleExpression`
- `timezone`
- `targetRunType`
- `defaultScopeJson`
- `lastTriggeredAt`
- `nextTriggerAt`
- `createdAt`
- `updatedAt`

## 11. `OrchestrationDefinition`

### Purpose

Represents a higher-order sequence of run steps.

Examples:

- month-end process
- nightly integrations
- close checklist automation

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `orchestrationType`
- `definitionJson`
- `createdAt`
- `updatedAt`

## 12. `OrchestrationStepExecution`

### Purpose

Represents one step execution inside an orchestration.

### Recommended canonical fields

- `id`
- `orchestrationId`
- `runHeaderId`
- `stepNumber`
- `stepType`
- `status`
- `startedAt`
- `completedAt`
- `message`
- `createdAt`
- `updatedAt`

## Relationship to Transactions and GL

### Rule

Runs must be linked to the records they create, change, or post.

### Expectations

- generated business transactions should link through `RunOutputLink`
- generated GL should link through `RunOutputLink`
- exceptions should point back to both source records and run items
- reversals or reruns should preserve lineage instead of replacing history

## Relationship to Integrations

### Rule

Integrations should use the same execution and exception vocabulary as accounting runs where possible.

### Expectations

- inbound integration work can create `RunHeader` / `RunItem`
- integration messages should be traceable to run items
- failures should be visible through shared exception and retry models

## Relationship to Close and Checklist

### Rule

Interactive close and checklist workflows should be able to reference runs directly.

### Expectations

- month-end checklist items can require specific runs to complete
- orchestration steps can enforce run dependencies
- users should be able to drill from checklist step to run to output to GL

## Automation Principle

The platform should automate standard recurring processes where the rules are deterministic, but always leave behind first-class run records.

Examples:

- nightly FX pull creates rate batch and run header
- scheduled bank import creates import run and item rows
- AP inbox polling creates ingestion run and item rows
- month-end orchestration creates child runs for FX, rev rec, amortization, and close outputs

## AI Participation Principle

AI should be able to participate in any run family or process family where it adds value, but always as a controllable layer.

### Examples

- reconciliation suggestion generation
- bank-match candidate scoring
- AP OCR classification and auto-coding suggestions
- exception triage and prioritization
- variance analysis generation
- close commentary or checklist guidance
- report narrative generation

### Control expectations

The platform should support AI controls at:

- run-family level
- process-step level
- item level where appropriate
- role / environment level where appropriate

AI-enabled run behavior should still preserve:

- the underlying run record
- exception visibility
- human approval paths where needed
- traceability of suggested vs executed action

## Reporting Expectations

The model should support reporting on:

- run success/failure rates
- processing durations
- volume by run type
- exception counts and aging
- retry/dead-letter backlog
- generated output counts and values

## Indexing Guidance

### `RunHeader`

Consider indexes on:

- `id`
- `runNumber`
- `runType`
- `status`
- `triggerType`
- `requestedAt`
- `startedAt`
- `completedAt`
- `asOfDate`
- `accountingPeriodId`
- `parentRunId`
- `orchestrationId`

### `RunItem`

Consider indexes on:

- `id`
- `runHeaderId`
- `itemNumber`
- `itemType`
- `status`
- `sourceRecordType`, `sourceRecordId`
- `targetRecordType`, `targetRecordId`

### `RunException`

Consider indexes on:

- `id`
- `runHeaderId`
- `runItemId`
- `severity`
- `status`
- `sourceRecordType`, `sourceRecordId`
- `assignedToId`

### `IntegrationMessage`

Consider indexes on:

- `id`
- `integrationDefinitionId`
- `integrationConnectionId`
- `direction`
- `status`
- `externalMessageId`
- `sourceRecordType`, `sourceRecordId`
- `receivedAt`
- `processedAt`

## Frontend Contract

The shared frontend should expose:

- run list pages
- run detail pages
- exception queues
- retry / dead-letter admin views
- integration configuration pages
- message logs
- orchestration progress views

These should follow the same shared list/detail/search patterns used elsewhere in the platform.

## Retrofit Guidance for Current App

The current app already has or is expected to have families such as:

- FX sync
- exchange-rate pulls
- billing-related jobs
- posting and schedule runs

These should evolve toward the canonical model by:

1. introducing shared run headers and items
2. introducing output links instead of opaque status-only background behavior
3. introducing exception/retry visibility for operators
4. aligning integration logs and message processing to the same execution model

## Immediate Next Tasks

1. define canonical activity-type catalog
2. define canonical close checklist schema
3. define canonical reporting metadata schema
4. define migration approach for existing app jobs and process flows
