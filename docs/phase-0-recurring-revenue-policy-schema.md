# Phase 0 Recurring Revenue Policy and Movement-Record Schema

## Purpose

This document defines the canonical architecture for:

- recurring-revenue policy definitions
- recurring-revenue movement records
- MRR / ARR calculation governance
- subscription vs non-subscription recurring classification
- usage-based recurring-revenue treatment
- FX-neutral and FX-inclusive recurring-revenue presentation support

It builds on:

- [phase-0-recurring-revenue-movement-taxonomy.md](./phase-0-recurring-revenue-movement-taxonomy.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)

The goal is to make recurring-revenue analytics driven by governed records and policies rather than spreadsheet-only interpretation.

## Design Goals

1. Convert the recurring-revenue taxonomy into a recordable and auditable model.
2. Support subscription, non-subscription, and usage-based recurring-revenue logic together.
3. Support both MRR and ARR views from the same governed record base.
4. Preserve movement attribution at customer, contract, subscription, invoice, and usage levels where applicable.
5. Support FX-neutral and FX-inclusive presentation.
6. Support period-over-period rollforwards and cohort analytics from canonical records.

## Core Rule

Recurring-revenue reporting should be built from governed movement records plus governed policy definitions.

Do not rely on ad hoc report logic alone to decide:

- what counts as recurring
- how movement is classified
- how usage is treated
- how annualization is applied
- how FX effects are presented

## Canonical Table Families

## 1. `RecurringRevenuePolicyDefinition`

### Purpose

Defines one governed recurring-revenue policy set.

Examples:

- corporate_saas_policy
- board_reporting_policy
- management_reporting_policy
- fx_neutral_policy

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `policyType`
- `description`
- `effectiveFrom`
- `effectiveTo`
- `settingsJson`
- `createdAt`
- `updatedAt`

### Suggested policy types

- recurring_revenue
- mrr
- arr
- usage_treatment
- fx_presentation

### Notes

`settingsJson` can govern rules such as:

- what qualifies as recurring
- how usage should be treated
- annualization rules
- FX-neutral rules
- customer/contract hierarchy rules

## 2. `RecurringRevenueSourceDefinition`

### Purpose

Defines one allowed operational source family for recurring-revenue movement.

Examples:

- subscription
- billing_schedule
- usage
- invoice
- credit_memo
- revenue_recognition_output
- non_subscription_contract

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `sourceType`
- `settingsJson`
- `createdAt`
- `updatedAt`

## 3. `RecurringRevenueMovementRecord`

### Purpose

Represents one canonical recurring-revenue movement fact.

This is the core reporting record behind MRR and ARR analytics.

### Recommended canonical fields

- `id`
- `movementNumber`
- `status`
- `movementType`
- `movementDate`
- `accountingPeriodId`
- `policyDefinitionId`
- `sourceDefinitionId`
- `sourceRecordType`
- `sourceRecordId`
- `sourceLineId`
- `customerId`
- `subscriptionId`
- `billingScheduleId`
- `usageRecordId`
- `contractId`
- `subsidiaryId`
- `transactionCurrencyId`
- `localCurrencyId`
- `functionalCurrencyId`
- `exchangeRateContextId`
- `mrrAmount`
- `arrAmount`
- `fxNeutralMrrAmount`
- `fxNeutralArrAmount`
- `isRecurring`
- `isSubscriptionBased`
- `isUsageBased`
- `isNonSubscriptionRecurring`
- `cohortDate`
- `segmentKeyJson`
- `memo`
- `createdAt`
- `updatedAt`

### Notes

- `movementType` should use the governed taxonomy from the recurring-revenue movement taxonomy doc.
- `mrrAmount` and `arrAmount` may both be stored for reporting efficiency if governance is preserved.
- `segmentKeyJson` can capture reusable dimensional attributes such as segment, plan, product family, region, channel, or cohort.

## 4. `RecurringRevenueMovementLink`

### Purpose

Links recurring-revenue movement records to other supporting records for drill-through and explanation.

### Recommended canonical fields

- `id`
- `recurringRevenueMovementRecordId`
- `linkType`
- `recordType`
- `recordId`
- `lineId`
- `createdAt`

### Suggested link types

- source_transaction
- source_line
- subscription
- billing_schedule
- usage
- invoice
- credit_memo
- revrec_output
- report_snapshot

## 5. `RecurringRevenuePolicyException`

### Purpose

Represents a movement or source that could not be cleanly classified under policy and needs review.

### Recommended canonical fields

- `id`
- `policyDefinitionId`
- `sourceRecordType`
- `sourceRecordId`
- `movementRecordId`
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

- ambiguous_recurring_status
- ambiguous_usage_treatment
- missing_subscription_context
- fx_context_missing
- annualization_failure
- movement_classification_conflict

## 6. `RecurringRevenueSnapshot`

### Purpose

Represents a versioned snapshot of recurring-revenue balances and movement outputs for a period or as-of date.

### Recommended canonical fields

- `id`
- `snapshotNumber`
- `policyDefinitionId`
- `asOfDate`
- `accountingPeriodId`
- `scopeJson`
- `status`
- `sourceRefreshRunId`
- `createdById`
- `createdAt`

## Policy Principles

## Recurring Qualification Principle

The platform should govern what qualifies as recurring.

### Examples

Policy may classify:

- a subscription charge as recurring
- a managed-services contract as non-subscription recurring
- a one-time implementation fee as non-recurring
- usage overages as recurring-like or non-recurring depending on policy

## Annualization Principle

ARR should be governed, not assumed.

### Expectations

The policy layer should define how ARR is derived from recurring movements, including cases such as:

- monthly subscriptions
- annual prepaid subscriptions
- variable recurring usage patterns
- non-subscription recurring contracts

## Usage Treatment Principle

Usage-based billing must be policy-driven.

### Expectations

The policy layer should be able to distinguish:

- usage that behaves like recurring expansion/contraction
- usage that is best treated as non-recurring true-up
- usage that should only appear in operational analytics, not MRR

## FX Presentation Principle

Recurring-revenue analytics should support both FX-inclusive and FX-neutral views.

### Expectations

The movement record model should support:

- transactional / functional values
- FX-neutral presentation values
- explicit exchange-rate context linkage

This allows:

- operational/local reporting
- management reporting
- investor-style presentation

## Relationship to Source Transactions

Recurring-revenue movement records should preserve linkage back to the operational source records that caused them.

Examples:

- subscriptions
- billing schedules
- usage records
- invoices
- credit memos
- rev rec outputs where relevant for drill-through

### Rule

Recurring-revenue movement should remain analytically distinct from revenue-recognition posting, but drill-through between them should be possible.

## Relationship to Reporting and Packages

The reporting layer should use recurring-revenue movement records as the canonical source for:

- MRR rollforwards
- ARR reporting
- expansion / contraction / churn bridges
- SaaS KPI dashboards
- board package recurring-revenue sections
- management package recurring-revenue sections

## Relationship to AI

AI can assist classification review, variance explanation, and recurring-revenue narrative generation, but should not replace the governed policy model.

### Examples

- explain unusual MRR movement
- suggest likely classification for ambiguous usage movement
- draft narrative for churn or expansion changes

## Reporting Expectations

The model should support:

- monthly MRR reporting
- annual MRR and ARR reporting
- customer-level movement analysis
- cohort-level movement analysis
- segment and dimensional recurring-revenue analytics
- subscription vs non-subscription revenue splits
- usage-driven recurring movement reporting
- FX-neutral recurring-revenue reporting

## Indexing Guidance

### `RecurringRevenueMovementRecord`

Consider indexes on:

- `id`
- `movementNumber`
- `movementType`
- `movementDate`
- `accountingPeriodId`
- `policyDefinitionId`
- `sourceDefinitionId`
- `customerId`
- `subscriptionId`
- `billingScheduleId`
- `subsidiaryId`
- `isRecurring`
- `isSubscriptionBased`
- `isUsageBased`
- `cohortDate`

### `RecurringRevenueMovementLink`

Consider indexes on:

- `id`
- `recurringRevenueMovementRecordId`
- `linkType`
- `recordType`
- `recordId`

### `RecurringRevenuePolicyException`

Consider indexes on:

- `id`
- `policyDefinitionId`
- `sourceRecordType`
- `sourceRecordId`
- `movementRecordId`
- `status`
- `assignedToId`

## Frontend Contract

The shared reporting layer should expose:

- recurring-revenue movement reports
- MRR / ARR rollforward views
- cohort analytics
- subscription vs non-subscription splits
- usage-based recurring movement analysis
- policy exception review views
- drill-through to source subscriptions, billings, usages, invoices, and rev rec outputs

## Immediate Next Tasks

1. define package export/rendering strategy for board and management outputs
2. define certified-reporting lock and reopen rules
3. define summary refresh monitoring and operator exception surfaces
4. define recurring-revenue policy administration UX and governance workflow
