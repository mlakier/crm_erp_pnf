# Phase 0 Dimension, Billing, and Revenue Propagation Spec

## Purpose

This document defines how seeded dimensions, future custom dimensions, subscriptions, billing schedules, usage-based billing, revenue arrangements, revenue plans, and downstream GL postings should work as one propagation system.

It is the companion design layer for:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-extensibility-schema.md](./phase-0-extensibility-schema.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)
- [phase-0-recurring-revenue-policy-schema.md](./phase-0-recurring-revenue-policy-schema.md)
- [phase-0-dimension-billing-revenue-implementation-matrix.md](./phase-0-dimension-billing-revenue-implementation-matrix.md)
- [phase-0-dimension-policy-admin-ui-spec.md](./phase-0-dimension-policy-admin-ui-spec.md)

The goal is to avoid building:

- one dimension model for transactions
- another for subscriptions
- another for billing
- another for revenue recognition
- another for GL posting

Instead, the platform should use one dimension and propagation framework from operational source through accounting output.

## Design Goals

1. Treat `Department`, `Location`, and `Class` as the first seeded dimension definitions in the same framework that will later support custom dimensions.
2. Allow dimensions to appear on:
   - master data where appropriate
   - transaction headers
   - transaction lines
   - usage events
   - billable charges
   - invoice lines
   - revenue arrangements and revenue elements
   - actual and forecast plans
   - GL postings
3. Make sourcing deterministic and auditable.
4. Allow subscriptions, subscription plans, projects, and usage events to participate as dimension sources.
5. Support invoice grouping across multiple services and billing streams under one billing account.
6. Preserve dimensional fidelity into downstream revenue recognition and GL posting.
7. Prevent summarization from destroying required dimensional detail.

## Core Principle

Dimensions are not just display fields.

Dimensions are classification values that must be able to flow through:

- operational source objects
- billing orchestration
- invoicing
- revenue arrangements
- revenue plans
- rev rec journals
- downstream accounting and reporting

If a dimension is sourced incorrectly upstream, it will be wrong in:

- invoice lines
- revenue recognition
- open items
- clearing
- GL lines
- management reporting

So sourcing rules must be explicit at the platform level.

## Source Resolution Contract

The intended runtime resolver should evaluate dimension values in deterministic priority order.

For each dimension, transaction family, and scope, the policy defines ordered sources such as:

- upstream header
- upstream line
- customer default
- vendor default
- item default
- GL account default
- project default
- subscription default
- subscription plan default
- billable charge
- manual entry
- custom record default

The resolver should:

- stop at the first source that returns a valid value
- record the winning source on `DimensionAssignment`
- respect manual override policy
- fail save or post when `failIfUnresolved` applies and no value is found
- carry source metadata forward for auditability

Header and line rules are configured by transaction family rather than as global transaction-header and transaction-line policies.

The generic header/line applicability records remain compatibility targets for existing UI/customize plumbing, but the admin-facing policy should be transaction-family driven.

### First Live Resolver Slice

The first implemented resolver slice is deliberately narrow:

- target: invoice lines and bill lines
- dimensions: seeded `Department`, `Location`, and `Class`
- live sources:
  - explicit line entry
  - item defaults for `Department` and `Location`
- preview API:
  - `POST /api/config/dimensions/resolve`

This creates the resolver contract without pretending all source providers are live.

Next source-provider candidates should be added in this order:

- customer defaults for LTC headers and lines
- vendor defaults for PTP headers and lines
- GL account defaults for RTR and expense-account lines
- project defaults
- subscription and subscription plan defaults
- billable charge and usage-event defaults
- custom record defaults

## Transaction Family Scope

The current family model is:

- `LTC`
  - lead-to-cash documents such as opportunity, quote, sales order, fulfillment, invoice, credit memo, customer refund, and related customer/revenue records
- `PTP`
  - procure-to-pay documents such as purchase requisition, purchase order, receipt, bill, bill credit, bill payment, and vendor refund
- `RTR`
  - record-to-report activity such as journal, intercompany journal, clearing, reclass, allocation, accrual, FX, and GL lines
- `Billing / Revenue`
  - specialized subscription, usage, billable charge, revenue arrangement, revenue element, revenue plan, forecast plan, and revenue recognition activity when ordinary LTC inheritance is not enough

Revenue arrangements, elements, plans, forecasts, and revenue recognition journals should inherit from upstream LTC transaction lines where available.

Billing / Revenue policy exists for cases where revenue or billing objects are created outside a clean LTC chain, combine multiple services into one customer invoice, or require subscription/usage-specific defaults.

## Seeded vs Custom Dimensions

The first seeded dimensions should be:

- `Department`
- `Location`
- `Class`

These should not be treated as special one-off fields forever.

They should be modeled as preconfigured dimension definitions delivered by the platform.

Later custom dimensions should use the exact same framework.

Examples:

- a regulatory classification dimension
- a channel dimension
- a service line dimension
- a business unit dimension

## Canonical Dimension Records

### 1. `DimensionDefinition`

Defines the dimension itself.

Recommended canonical fields:

- `id`
- `dimensionKey`
- `label`
- `description`
- `isSeeded`
- `isCustom`
- `isActive`
- `allowsHeaderAssignment`
- `allowsLineAssignment`
- `allowsGlAssignment`
- `allowsProjectAssignment`
- `allowsSubscriptionAssignment`
- `inheritanceMode`
- `overrideMode`
- `validationMode`
- `postToGl`
- `requiresGlSplit`

### 2. `DimensionValue`

Defines the actual selectable values within a dimension.

Recommended canonical fields:

- `id`
- `dimensionId`
- `valueKey`
- `code`
- `name`
- `description`
- `isActive`
- `parentValueId`

### 3. `DimensionApplicability`

Defines where a dimension appears.

Recommended canonical fields:

- `id`
- `dimensionId`
- `entityType`
- `scopeLevel`
  - `header`
  - `line`
  - `both`
- `isVisible`
- `isRequired`
- `isLockedInCustomize`

### 4. `DimensionSourcingPolicy`

Defines how a dimension is resolved.

Recommended canonical fields:

- `id`
- `dimensionId`
- `entityType`
- `scopeLevel`
- `sourcePriorityJson`
- `allowHeaderInheritance`
- `allowSourceLineInheritance`
- `allowProjectInheritance`
- `allowSubscriptionInheritance`
- `allowManualOverride`
- `failIfUnresolved`

### 5. `DimensionAssignment`

Stores the chosen value on a header, line, billing object, revenue object, or GL line.

Recommended canonical fields:

- `id`
- `targetType`
- `targetId`
- `scopeLevel`
- `dimensionId`
- `dimensionValueId`
- `sourceType`
- `sourceRecordType`
- `sourceRecordId`
- `isOverridden`

This is important because users will eventually ask:

- why did this invoice line get this class?
- why did this GL line get this department?

The system should be able to answer that.

## Subscription, Billing, and Revenue Objects

### 1. `BillingAccount`

Represents how the customer should be billed and grouped.

Recommended fields:

- `id`
- `customerId`
- `billToAddressId`
- `subsidiaryId`
- `currencyId`
- `billingCalendarPolicyId`
- `invoiceGroupingPolicyId`
- `autoConsolidateInvoices`

### 2. `BillingSchedule`

Represents how billing should occur over time.

Recommended fields:

- `id`
- `scheduleType`
  - `monthly`
  - `annual`
  - `anniversary`
  - `calendar_year`
  - `specific_date`
- `billDayOfMonth`
- `specificBillDate`
- `prorationMethod`
- `calendarYearProrationPolicy`
- `autoRenew`
- `renewalTerm`
- `renewalNoticeDays`

### 3. `SubscriptionPlan`

Represents the commercial template.

Recommended fields:

- `id`
- `planCode`
- `name`
- `billingType`
  - `fixed`
  - `usage`
  - `hybrid`
- `defaultBillingScheduleId`
- `defaultRevenuePolicyId`
- `defaultDimensionDefaultsJson`

### 4. `Subscription`

Represents the customer-specific instantiation of a plan.

Recommended fields:

- `id`
- `customerId`
- `billingAccountId`
- `subscriptionPlanId`
- `startDate`
- `endDate`
- `status`
- `actualBillingScheduleId`
- `overrideDimensionDefaultsJson`

### 5. `UsageEvent`

Represents raw or normalized usage.

Recommended fields:

- `id`
- `subscriptionId`
- `serviceId`
- `usageDate`
- `usageQuantity`
- `usageAttributesJson`
- `dimensionDefaultsJson`

### 6. `BillableCharge`

Represents a rated charge ready for billing grouping.

Recommended fields:

- `id`
- `billingAccountId`
- `sourceType`
  - `subscription_fixed`
  - `usage_rated`
  - `one_time`
  - `manual_adjustment`
- `sourceRecordId`
- `chargeDate`
- `amount`
- `currencyId`
- `dimensionAssignmentsJson`
- `invoiceGroupingKeyJson`

### 7. `RevenueArrangement`

Represents the revenue-side container for billed or contracted obligations.

Recommended fields:

- `id`
- `customerId`
- `sourceTransactionType`
- `sourceTransactionId`
- `billingAccountId`
- `subsidiaryId`
- `currencyId`
- `dimensionAssignmentsJson`

### 8. `RevenueElement`

Represents the atomic revenue-bearing unit.

Recommended fields:

- `id`
- `revenueArrangementId`
- `sourceInvoiceLineId`
- `subscriptionId`
- `itemId`
- `amount`
- `startDate`
- `endDate`
- `recognitionMethod`
- `dimensionAssignmentsJson`

### 9. `RevenuePlanActual`

Represents the operational posting plan.

### 10. `RevenuePlanForecast`

Represents projected revenue.

Both should preserve dimensional context from the source revenue element unless explicitly overridden by policy.

## End-to-End Propagation Chain

The intended chain is:

1. source dimension providers
   - customer
   - vendor
   - item
   - project
   - subscription plan
   - subscription
   - usage event
   - source transaction
2. operational transaction header and line
3. billable charge / billing schedule grouping
4. invoice header and line
5. revenue arrangement and revenue element
6. actual and forecast plans
7. revenue recognition journals
8. downstream open items, clearing, and reporting

## Current Admin Propagation Status

The current Dimension Manager exposes propagation as a read-only chain map, not as a live runtime engine.

It shows:

- the enabled business flow families
- each intended downstream chain
- header and line source-control readouts
- blocked source dependencies
- planned vs active vs blocked chain status

This is intentionally honest:

- admins can see where a dimension is intended to flow
- the UI does not imply that every downstream runtime carry is already implemented
- `Propagation` should remain marked `Planned` until end-to-end services prove the carry

The admin chain map currently uses these conceptual paths:

- `LTC`
  - `Lead -> Opportunity -> Quote -> Sales Order -> Invoice -> Revenue Arrangement -> Revenue Element -> Revenue Plan -> Rev Rec Journal -> GL`
- `PTP`
  - `Purchase Requisition -> Purchase Order -> Receipt -> Bill -> Bill Credit -> Vendor Refund -> Clearing -> GL`
- `RTR`
  - `Journal -> Intercompany Journal -> Clearing -> Revaluation -> GL Line -> Financial Reporting`
- `Billing / Revenue`
  - `Subscription -> Subscription Plan -> Usage -> Billable Charge -> Invoice -> Revenue Arrangement -> Revenue Element -> Revenue Plan -> Rev Rec Journal -> GL`

Runtime implementation should later replace this policy map with tested propagation services, while keeping the same admin mental model.

## Source Eligibility Rule

The platform should treat source participation as a policy outcome of extension, not as a fixed hardcoded source list.

The general rule should be:

1. if a dimension is extended to a record type
2. and that record has a value for the dimension
3. and policy allows that record type to source the target object
4. then that record is a valid source candidate

This means:

- `Customer`, `Vendor`, and `Item` remain foundational
- `GL Account`, `Subsidiary`, and `Employee / User` can participate when the dimension is extended to them
- `Custom Record` can become a first-class source participant

But generic:

- `Custom Body Field`
- `Custom Line Field`

should not usually be treated as direct dimension host objects.

They may still be referenced in:

- validation logic
- substitution logic
- conditional derivation rules

### Source categories for admin readability

These are useful UI groupings, not architectural limitations:

- `Commercial Sources`
  - customer
  - vendor
  - item
- `Accounting / Control Sources`
  - GL account
  - subsidiary
- `Operational Sources`
  - project
  - subscription
  - employee / user
  - source transaction
  - custom record

## Sourcing Precedence

### A. Transaction Header

Default precedence:

1. explicit user entry
2. upstream source document header
3. project defaults
4. subscription defaults
5. counterparty defaults if policy allows
6. subsidiary defaults if policy allows
7. fail if required and unresolved

### B. Transaction Line

Default precedence:

1. explicit line entry
2. upstream source line
3. item defaults
4. project defaults
5. subscription defaults
6. header inheritance if enabled
7. fail if required and unresolved

### C. Billable Charge

Default precedence:

1. explicit adjustment line
2. usage event
3. subscription
4. subscription plan
5. service or item defaults
6. billing account defaults if policy allows
7. fail if required and unresolved

### D. Revenue Element

Default precedence:

1. invoice line
2. billable charge
3. subscription
4. revenue policy override if explicitly configured
5. fail if required and unresolved

### E. GL Posting Line

Default precedence:

1. source transaction line
2. source transaction header
3. revenue element if the GL line comes from rev rec
4. explicit posting policy override
5. blank only if allowed by policy

## Invoice Consolidation and Billing Grouping

The platform must support multiple billable sources being combined onto one invoice.

Examples:

- fixed monthly subscription fee
- annual support fee
- usage-based service charge
- one-time adjustment

These should be able to land on one invoice to the same customer when grouping rules match.

### Recommended Grouping Keys

- customer
- billing account
- bill-to address
- subsidiary
- currency
- billing date
- tax nexus if needed later

The system should not force one invoice per service when grouping policy allows consolidation.

## Billing Schedule Rules

The billing model must support:

- monthly billing
- annual billing
- billing on a specific date
- billing on anniversary
- billing on calendar year
- prorated year one
- auto-renew
- renewal term

This belongs in billing schedule and subscription plan policy, not on invoices themselves.

## Usage-Based Billing

Usage events should not bypass the billing model.

The expected pattern is:

1. usage event captured
2. usage rated
3. billable charge created
4. grouped under billing account and billing schedule
5. invoice line generated

Dimension sourcing for usage-based billing should support:

- usage attributes
- subscription
- project
- item or service
- manual override where allowed

## Revenue Recognition and Downstream Plans

Dimensions must continue after billing.

That means they must propagate into:

- revenue arrangements
- revenue elements
- actual plans
- forecast plans
- revenue recognition journal lines

The same policy framework should determine:

- whether a dimension is required on revenue elements
- whether it posts to rev rec GL
- whether forecast plans inherit or can diverge from actual plans

## GL Posting Behavior

If a dimension is marked `postToGl = true`, the posting engine must preserve it on journal lines.

### Important Rule

When source lines have different dimension combinations, the GL posting engine should split by dimension combination rather than summarize away the detail.

Otherwise:

- reporting becomes inaccurate
- dimensional revenue analysis breaks
- downstream allocations and pivots become unreliable

## Override Policies

Each dimension should support one of these policy patterns:

- `inherit_only`
- `inherit_with_override`
- `manual_only`
- `system_derived`

Examples:

- `Department` might be inherit with override
- `Class` might be inherit only from item family in some flows
- a regulatory custom dimension might be system derived and locked

## Validation Policies

Each dimension should support:

- optional
- required on header
- required on line
- required for posting only
- required for selected transaction families only

This must be configurable in the same framework that later supports custom dimensions.

## Seeded Initial Implementation Rules

### Seeded Dimension Definitions

The initial seeded dimension definitions should be:

- `Department`
- `Location`
- `Class`

### Project

`Project` should remain a first-class master/operational object, but it should also be allowed to act as a dimension source provider.

### Subscription Plan and Subscription

These should be dimension providers.

They should be able to contribute defaults to:

- billable charges
- invoice headers
- invoice lines
- revenue arrangements
- revenue elements

## Recommended Delivery Order

1. finalize dimension definition, value, applicability, and sourcing policy schema
2. wire seeded dimensions into that framework
3. add billing account, billing schedule, subscription plan, and subscription source participation
4. add billable charge and invoice grouping logic
5. add revenue arrangement and revenue element propagation
6. enforce GL split-by-dimension-combination behavior
7. add future custom dimensions on the same framework

## Summary

The platform should not think about:

- dimensions
- subscriptions
- usage billing
- billing schedules
- revenue arrangements
- revenue recognition

as separate isolated features.

They should be treated as one propagation system with:

- shared definitions
- shared sourcing precedence
- shared enforcement
- shared lineage
- shared downstream posting behavior

That is the only durable way to support:

- seeded dimensions
- future custom dimensions
- combined invoices across services
- usage-based billing
- subscription plans
- revenue arrangements
- actual and forecast plans
- rev rec journals
- dimensional management reporting

For the concrete build sequence and dependency order, see:

- [phase-0-dimension-billing-revenue-implementation-matrix.md](./phase-0-dimension-billing-revenue-implementation-matrix.md)
