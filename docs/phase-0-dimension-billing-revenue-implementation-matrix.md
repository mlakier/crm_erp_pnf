# Phase 0 Dimension, Billing, and Revenue Implementation Matrix

## Purpose

This document turns the propagation architecture into a concrete implementation sequence.

It answers:

- what records to add first
- which existing records become dimension sources
- what the first supported propagation path is
- what each slice unlocks
- what should wait until later
- how ERP-grade control layers should be phased in

It is the execution companion to:

- [phase-0-dimension-billing-revenue-propagation-spec.md](./phase-0-dimension-billing-revenue-propagation-spec.md)
- [phase-0-dimension-policy-admin-ui-spec.md](./phase-0-dimension-policy-admin-ui-spec.md)

## Guiding Rule

Do not build:

- subscriptions
- usage billing
- billing schedules
- revenue arrangements
- revenue recognition

as disconnected modules.

Each slice should advance one coherent propagation path:

`Dimension Source -> Billable Object -> Invoice Line -> Revenue Object -> GL Posting`

And each slice should make one more dimension control layer real:

- definition
- master-data extension
- applicability
- sourcing
- enforcement
- propagation
- posting
- reporting

## Scope Categories

### A. Seeded dimension framework

This is the control plane.

### A1. Dimension admin experience

This is the business-admin policy plane.

### B. Billing and subscription orchestration

This is the commercial and billing plane.

### C. Revenue arrangement and rev rec propagation

This is the accounting and performance obligation plane.

## Existing Records That Become Dimension Sources

These already exist or are conceptually in place and should become upstream dimension providers.

### Current source candidates

- `Customer`
- `Vendor`
- `Item`
- `GL Account`
- `Subsidiary`
- `Employee / User`
- `Project`
- existing transaction headers
- existing transaction lines
- `Custom Record`

### Current source candidates that should be treated as foundational

These should be the first-class master-data dimension sources:

- `Customer`
- `Vendor`
- `Item`

These should be second-tier extension points:

- `Project`
- `GL Account`
- `Subsidiary`
- `Employee / User`
- `Custom Record`
- transaction headers
- transaction lines

### Architectural rule

The platform should use this rule:

- if a dimension is extended to a record type
- and policy allows that record type to source a target
- then that record type becomes a valid source participant

That means:

- the platform should not depend on a tiny hardcoded source taxonomy
- custom records can become real source participants
- generic custom body and line fields are not direct dimension host objects
- fields may still participate in validation, substitution, and conditional derivation

### New source candidates to add

- `SubscriptionPlan`
- `Subscription`
- `UsageEvent`
- `BillableCharge`

## Implementation Order

## Wave 1: Dimension Control Plane

### Goal

Create the metadata and policy layer for seeded and future custom dimensions.

### New records

- `DimensionDefinition`
- `DimensionValue`
- `DimensionApplicability`
- `DimensionSourcingPolicy`
- `DimensionAssignment`

### Seeded records to load

- `Department`
- `Location`
- `Class`

### Required capabilities

- rename label
- active/inactive
- financial vs operational classification
- where it appears
- where it is required
- whether it is header and/or line eligible
- whether it can flow to GL
- whether it is posting-critical or reporting-only
- whether it requires GL split
- whether it can be sourced from:
  - customer
  - vendor
  - project
  - subscription

### Wave 1 close-out status

Implemented in the current app:

- dimension definitions are persisted
- seeded dimensions are loaded as governed definitions
- generic/custom dimension values are persisted
- seeded dimension values read from their current master-data tables
- custom value fields can be added and edited through the dimension detail page
- transaction-family assignments are persisted
- transaction-family source priority is persisted
- manage/detail/setup pages show policy-health signals
- first runtime customize hooks are family-aware for seeded transaction line dimensions
- seeded line-dimension resolver exists for invoice and bill lines
- resolver preview API exists at `/api/config/dimensions/resolve`
- business-admin Dimension Manager is phase-complete as a UI/configuration shell
- `Where It Applies` owns visibility, requiredness, and locked customize behavior
- `Sourcing` is dependency-aware and blocks source selection when the dimension is not extended to the needed record type
- `Enforcement` owns validation, inheritance, override, and unresolved-source behavior
- `Propagation` shows a read-only chain map and remains planned until runtime propagation is implemented
- `Preview` is a live read-only policy review surface

Still planned:

- generic runtime source resolver beyond the first invoice/bill line slice
- automatic defaulting into actual transaction records
- full transaction save/post enforcement
- downstream revenue and GL propagation
- account-range posting enforcement
- reporting assignment layer for arbitrary custom dimensions
- runtime audit lineage across all downstream chains

### Wave 1 regression checklist

Before considering a dimension change complete, verify:

- Manage Dimensions loads and shows health, family coverage, and sourcing coverage.
- Add New creates a dimension through the guided setup.
- Detail page save/reload preserves header definition, applicability, sourcing, posting, and preview state.
- Detail page avoids duplicate ownership:
  - header owns definition/status only
  - Where It Applies owns visible/required/locked
  - Sourcing owns priority
  - Enforcement owns behavior
  - Posting owns GL behavior
  - Propagation and Preview are read-only summaries
- Custom value fields can be added and edited.
- Generic dimension values can be added and edited.
- Seeded dimension values route to the proper seeded master-data table.
- Transaction customize mode reflects family-aware seeded dimension required/locked behavior.
- Sourcing choices are blocked when the source record is not enabled in Where It Applies.
- Propagation shows blocked chains when sourcing dependencies are invalid.
- Build passes.
  - source transaction
  - item
- whether manual override is allowed
- whether the source is a default or hard source

### Existing platform dependencies

- shared customize engine
- shared required-fields matrix
- transaction posting-context framework
- line-requirements framework

### Unlocks

- seeded dimensions stop being hardcoded forever
- custom dimensions can be added later without a second system
- we can define sourcing and enforcement centrally

## Wave 1A: Dimension Policy Admin Experience

### Goal

Expose the control plane as a business-readable admin workspace instead of only low-level metadata.

### Primary sections

- `Catalog`
- `Applicability`
- `Sourcing`
- `Enforcement`
- `Propagation`
- `Posting`
- `Preview`

### Required capabilities

- workflow-family matrix views
- master-data source visibility
- source priority display
- default vs hard-source display
- posting-critical vs reporting-only display
- preview of transaction, workflow, and posting effects

### Unlocks

- admins can reason about dimensions as a platform policy
- future runtime behavior has a stable admin contract

## Wave 1B: Master Data Extension Layer

### Goal

Make dimensions first-class on foundational source records before extending deeper runtime propagation.

### Initial source records

- `Customer`
- `Vendor`
- `Item`

### Required capabilities

- dimension visibility by master-data type
- required/optional policy on master-data records
- source eligibility for downstream transactions
- default vs hard-source designation on each source record type
- override policy when downstream records differ

### Unlocks

- custom dimensions become real governed source data
- transactions can source from master data in a deterministic way

## Wave 1C: ERP-Grade Control Layers

### Goal

Introduce the higher-order control concepts needed for SAP/NetSuite-grade dimension behavior.

### Required capabilities

- account-specific enforcement metadata
- validation vs substitution rule framework
- hierarchy support metadata
- summarization / GL split policy
- security/governance placeholders

### Note

This wave may begin as metadata-only and become executable in later waves.

## Wave 2: Billing Account and Schedule Control Plane

### Goal

Create the operational grouping and timing layer needed before subscriptions and usage can bill properly.

### New records

- `BillingAccount`
- `BillingSchedule`
- `BillingCalendarPolicy`
- `InvoiceGroupingPolicy`

### Required capabilities

- customer billing account
- bill-to management
- billing currency
- billing subsidiary
- monthly billing
- annual billing
- specific-date billing
- anniversary billing
- calendar-year billing
- prorated first-year handling
- auto-renew metadata

### Required rule outputs

- bill date calculation
- grouping key calculation
- eligibility window calculation

### Dimension implications

Billing records must be able to:

- receive dimensions from `Customer`
- receive dimensions from `Subscription`
- receive dimensions from `BillableCharge`
- preserve billing-account and grouping context without losing dimension fidelity

### Unlocks

- multiple services can bill onto one invoice
- we avoid “one invoice per service” as a forced design
- subscriptions and usage later have a real billing target

## Wave 3: Subscription Control Plane

### Goal

Introduce subscriptions and subscription plans as commercial sources and dimension providers.

### New records

- `SubscriptionPlan`
- `Subscription`
- optional `SubscriptionPlanCharge`
- optional `SubscriptionEntitlement`

### Required capabilities

- plan defaults
- subscription-specific overrides
- start/end dates
- status lifecycle
- link to billing account
- link to billing schedule
- default dimension sourcing
- default revenue behavior

### ERP-grade dimension behavior

Subscriptions and plans should support:

- default dimensions
- hard-source dimensions where policy requires
- project-linked overrides
- later custom dimension extension without separate code paths

### Dimension role

Subscriptions and plans should be able to source:

- header dimensions
- line dimensions
- billable-charge dimensions
- invoice-line dimensions
- revenue-element dimensions

### Unlocks

- recurring billing sources become real records
- subscription-driven dimension propagation becomes possible

## Wave 4: Usage and Billable Charge Layer

### Goal

Create the operational staging layer between source activity and invoicing.

### New records

- `UsageEvent`
- `RatedUsageEvent`
- `BillableCharge`
- optional `BillingRun`
- optional `BillingRunCandidate`

### Required capabilities

- usage capture
- usage validation
- usage rating
- usage rerating
- billable-charge creation
- billable-charge grouping key generation
- dimension sourcing from usage event and subscription
- ability to carry custom operational dimensions that may or may not post to GL

### Important rule

Usage should not become invoices directly.

It should become billable charges first.

### Unlocks

- one invoice can combine:
  - fixed subscription charges
  - annual charges
  - usage charges
  - manual adjustments

## Wave 5: Invoice Consolidation and Line Propagation

### Goal

Make invoice generation dimension-aware and grouping-aware.

### Existing records enhanced

- `Invoice`
- `InvoiceLineItem`

### Required behavior

- generate invoice headers by grouping key
- generate invoice lines from billable charges
- preserve dimension lineage to invoice line
- preserve transaction currency and subsidiary
- support consolidated multi-service billing to one customer invoice
- preserve master-data, subscription, and billable-charge source lineage for each dimension

### Line control implications

This is the wave where the platform should begin distinguishing:

- header-owned dimensions
- line-owned dimensions
- dimensions that must survive to GL

### First live propagation path

The first complete supported propagation path should be:

`SubscriptionPlan -> Subscription -> BillableCharge -> InvoiceLine -> OpenItem -> GL Posting`

### Unlocks

- operational subscription and usage billing can produce real accounting docs
- dimensions now survive from source through invoice posting

## Wave 6: Revenue Arrangement and Revenue Element Layer

### Goal

Create the revenue-side structure that sits between invoicing and rev rec.

### New records

- `RevenueArrangement`
- `RevenueElement`

### Required behavior

- arrangement creation from invoice or contract context
- element creation from invoice line and/or subscription source
- preserve dimension assignments from upstream line or source policy
- support start/end dates
- support recognition method

### Dimension rule

Invoice-line dimensions should be the default source for revenue-element dimensions unless policy explicitly overrides them.

### ERP-grade implication

Revenue objects should not invent their own dimension logic.

They should consume:

- invoice-line dimensions
- source policy
- validation / substitution rules where later enabled

### Unlocks

- rev rec can be driven from proper revenue-bearing objects
- actual and forecast plans can remain aligned to the same source dimensions

## Wave 7: Actual and Forecast Revenue Plans

### Goal

Create operational schedules for recognition and forecasting.

### New records

- `RevenuePlanActual`
- `RevenuePlanActualLine`
- `RevenuePlanForecast`
- `RevenuePlanForecastLine`

### Required behavior

- build plan rows from revenue elements
- preserve dimension context
- allow forecast divergence where policy allows
- report by:
  - subsidiary
  - department
  - location
  - class
  - project
  - custom dimensions

### Unlocks

- forecast and actual revenue plans become first-class records
- recurring and non-recurring revenue analytics become more coherent

## Wave 8: Revenue Recognition Journals

### Goal

Make rev rec posting dimension-faithful.

### Existing/new records

- existing `JournalEntry`
- existing `JournalEntryLineItem`
- new rev-rec run records if needed

### Required behavior

- post from actual plan lines
- preserve required dimensions on GL lines
- split by dimension combination where needed
- do not summarize away dimensional detail
- honor posting-critical vs reporting-only distinction
- honor account-specific enforcement where configured

### Unlocks

- downstream GL and reporting remain trustworthy
- rev rec journals support management reporting and pivoting

## Wave 9: Custom Dimension Extension

### Goal

Use the same framework for user-defined dimensions after the seeded three are stable.

### New capability

- create custom dimension definitions
- create custom dimension values
- configure applicability
- configure sourcing and validation
- allow optional GL propagation
- extend to `Customer`, `Vendor`, and `Item`
- classify as financial vs operational
- configure posting-critical vs reporting-only behavior
- configure hierarchy support where needed

### Rule

No new custom dimension should bypass the same control plane used by:

- `Department`
- `Location`
- `Class`

## First Supported Propagation Paths

### Path 1: Fixed subscription charge

`SubscriptionPlan -> Subscription -> BillableCharge -> InvoiceLine -> RevenueElement -> RevenuePlanActual -> RevRecJournalLine`

### Path 2: Usage-based billing

`UsageEvent -> RatedUsageEvent -> BillableCharge -> InvoiceLine -> RevenueElement -> RevenuePlanActual -> RevRecJournalLine`

### Path 3: Manual one-time adjustment

`ManualAdjustment -> BillableCharge -> InvoiceLine -> RevenueElement -> RevenuePlanActual -> RevRecJournalLine`

## Dimension Source Priority by Object

This is the beginning of the runtime sourcing model and should be interpreted alongside the admin UI spec.

### Subscription Plan

May provide:

- default dimensions
- default billing schedule
- default revenue behavior

### Subscription

May override:

- plan dimensions
- billing behavior
- revenue behavior

### Usage Event

May contribute:

- service-specific dimensions
- project-specific dimensions
- usage-attribute dimensions

### Billable Charge

Should store the resolved dimension result before invoice generation.

It should also preserve source lineage so admins can understand whether the dimension came from:

- customer
- vendor
- item
- subscription
- project
- usage
- manual override

### Invoice Line

Should preserve the resolved billable-charge dimensions by default.

### Revenue Element

Should inherit invoice-line dimensions unless policy overrides.

### Rev Rec Journal Line

Should inherit revenue-element dimensions unless posting policy overrides.

## Dependency Matrix

### Before subscriptions

Need:

- dimension framework
- master-data extension layer
- billing account
- billing schedule

### Before usage billing

Need:

- dimension framework
- master-data extension layer
- billing account
- billing schedule
- subscription model if usage is subscription-backed

### Before revenue arrangements

Need:

- invoice line propagation
- dimension assignments on invoice lines

### Before rev rec journals

Need:

- revenue arrangement
- revenue element
- actual plan
- GL dimension propagation rules
- posting-critical and GL split policy
- at least placeholder account-specific enforcement model

## What Should Wait

These should not be first:

- advanced renewal notices
- complex contract modifications
- FMV allocation engine
- sophisticated bundle allocation
- multi-ledger rev rec variants
- advanced dimension hierarchies
- full substitution rule engine
- security-by-dimension enforcement
- alternate reporting trees

Those can sit on top of the core propagation framework after the base path is stable.

## Recommended First Build Slice

If we want the first slice that proves the architecture, it should be:

1. `DimensionDefinition` family
2. master-data extension for:
   - `Customer`
   - `Vendor`
   - `Item`
3. `BillingAccount`
4. `BillingSchedule`
5. `SubscriptionPlan`
6. `Subscription`
7. `BillableCharge`
8. invoice generation from billable charge

This is the first slice because it proves:

- seeded and future custom dimensions share one framework
- custom dimensions are real source data on master records
- subscriptions are real sources
- multiple charge sources can consolidate to one invoice
- invoice lines preserve dimension lineage

## Recommended Second Build Slice

After that:

1. `RevenueArrangement`
2. `RevenueElement`
3. `RevenuePlanActual`
4. rev rec posting from plan
5. posting-critical and GL-split enforcement on rev rec journals

This second slice proves:

- billing dimensions flow to revenue
- revenue dimensions flow to GL
- dimensional integrity survives into accounting

## Summary

The implementation should be staged so that every wave makes one end-to-end path real.

The core proof points are:

- seeded dimensions and future custom dimensions use one framework
- customer, vendor, and item act as governed source layers
- billing groups multiple services to one invoice when policy allows
- subscriptions and usage become invoice lines through billable charges
- invoice-line dimensions survive into revenue objects
- revenue-object dimensions survive into rev rec GL
- posting-critical dimensions survive summarization pressure
- the system is policy-driven, not page-driven

That is the shortest path to a system that is enterprise-capable instead of page-capable.
