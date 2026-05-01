# Phase 0 Recurring Revenue Movement Taxonomy

## Purpose

This document defines the canonical movement taxonomy for:

- recurring revenue analytics
- monthly MRR reporting
- annual MRR reporting
- MRR roll-forwards
- ARR reporting
- subscription vs non-subscription revenue analysis
- usage-based billing expansion and contraction analytics

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)

The goal is to ensure recurring-revenue reporting is driven by a governed movement model rather than inconsistent spreadsheet logic.

## Design Goals

1. Define a stable movement vocabulary for MRR and ARR reporting.
2. Support hybrid revenue environments with subscriptions, non-subscription revenue, and usage-based billing.
3. Distinguish recurring revenue movement from GAAP revenue recognition while preserving drill-through.
4. Support period-over-period recurring revenue roll-forwards with auditable movement categories.
5. Support customer-level, subscription-level, cohort-level, and segment-level recurring revenue analytics.

## Core Rule

Recurring-revenue reporting should classify movement explicitly.

Do not infer recurring-revenue movement only from invoice totals or general ledger account changes.

The reporting layer should be able to explain why recurring revenue changed using governed movement categories.

## Canonical Movement Families

The recurring-revenue taxonomy should distinguish at least these movement families:

- opening recurring revenue
- new recurring revenue
- expansion
- contraction
- churn
- reactivation
- pricing change
- usage-driven recurring movement
- non-recurring revenue
- FX-only movement
- reclassification / administrative movement
- closing recurring revenue

## Recommended Canonical Movement Types

## Opening and Closing

- `opening_mrr`
  opening monthly recurring revenue balance for the reporting period

- `closing_mrr`
  closing monthly recurring revenue balance for the reporting period

- `opening_arr`
  opening annual recurring revenue balance

- `closing_arr`
  closing annual recurring revenue balance

## New and Reactivated

- `new_mrr`
  recurring revenue from a newly acquired customer or newly recurring contract

- `new_arr`
  annualized version of newly acquired recurring revenue

- `reactivation_mrr`
  recurring revenue restored after a previously churned or inactive recurring relationship becomes active again

- `reactivation_arr`
  annualized reactivation movement

## Expansion and Contraction

- `expansion_mrr`
  recurring revenue increase from upsell, cross-sell, seat growth, tier change, or committed scope increase

- `expansion_arr`
  annualized expansion movement

- `contraction_mrr`
  recurring revenue decrease from downsell, seat reduction, tier downgrade, committed scope decrease, or lower committed volume

- `contraction_arr`
  annualized contraction movement

## Churn

- `churned_mrr`
  recurring revenue lost because a recurring relationship ended or was canceled

- `churned_arr`
  annualized churn movement

## Price and Usage Effects

- `price_uplift_mrr`
  recurring revenue movement caused primarily by a pricing change rather than scope or customer count change

- `price_uplift_arr`
  annualized pricing movement

- `usage_expansion_mrr`
  recurring-like monthly movement caused by usage-based billing growth where the reporting policy treats the pattern as part of recurring analytics

- `usage_contraction_mrr`
  recurring-like monthly movement caused by lower usage-based billing where the reporting policy treats the pattern as part of recurring analytics

- `usage_true_up_nonrecurring`
  usage or true-up revenue that should be reported but not treated as recurring movement

## Mixed and Administrative

- `non_subscription_recurring_mrr`
  recurring revenue not driven by a subscription object but still classified as recurring under business policy

- `non_recurring_revenue`
  revenue that should remain outside recurring-revenue balances

- `fx_only_mrr_movement`
  recurring revenue movement caused only by currency translation / FX presentation effects

- `reclassification_mrr`
  movement caused by classification changes, cleanup, or reporting-model adjustments rather than commercial activity

## Why the Taxonomy Matters

Without this taxonomy, recurring-revenue reporting becomes inconsistent across:

- subscriptions
- usage-based billings
- recurring service contracts
- non-subscription recurring arrangements
- FX-impacted environments

The taxonomy provides a common explanatory language for:

- board reporting
- management reporting
- SaaS dashboards
- investor metrics
- operational revenue analytics

## Relationship to GAAP Revenue Recognition

Recurring-revenue movement is not the same thing as revenue-recognition posting.

### Rule

MRR / ARR movement taxonomy should coexist with, but remain distinct from:

- invoices
- billing schedules
- usage events
- revenue-recognition schedules
- GL revenue lines

### Expectation

The platform should support drill-through between:

- recurring-revenue movement
- operational billing objects
- invoicing
- revenue recognition outputs

but should not collapse them into one concept.

## Relationship to Usage-Based Billing

Usage-based billing must be handled explicitly.

### Design expectation

The platform should support reporting policies that distinguish:

- usage that behaves like recurring expansion/contraction
- usage that is truly non-recurring

This should be governed through reporting metadata and movement logic, not left to ad hoc manual interpretation.

## Relationship to Subscription vs Non-Subscription Revenue

Recurring-revenue analytics should support hybrid environments.

### Expectation

Reports should be able to analyze:

- subscription recurring revenue
- non-subscription recurring revenue
- non-recurring revenue
- usage-based billed revenue

both separately and together.

## Suggested Canonical Supporting Structures

This taxonomy will likely require one or more supporting structures later, such as:

- `RecurringRevenueMovementDefinition`
- `RecurringRevenueMovementRecord`
- `RecurringRevenuePolicyDefinition`

These do not need to be implemented before the taxonomy is agreed, but the reporting engine should assume a governed movement model will exist.

## Reporting Expectations

The platform should support:

- monthly MRR roll-forward
- annual MRR / ARR reporting
- customer-level movement reporting
- cohort-level movement reporting
- segment and dimension-based recurring revenue analysis
- expansion / contraction / churn bridges
- subscription vs non-subscription recurring revenue splits
- usage-based recurring movement analysis
- FX-neutral and FX-inclusive recurring revenue views

## Dashboard and Package Expectations

The KPI and reporting layer should use this taxonomy for:

- MRR bridge charts
- ARR bridge charts
- NRR / GRR analytics
- board package recurring revenue commentary
- management package recurring revenue sections
- AI-generated SaaS narratives and variance commentary

## Governance Principle

Recurring-revenue movement classification should be centrally governed.

That means:

- movement codes should be stable
- policy changes should be auditable
- reporting definitions should reference the governed taxonomy
- manual spreadsheet-only reclassification logic should be avoided

## Frontend Contract

The shared reporting layer should expose recurring-revenue movement through:

- pivot-style movement reports
- MRR / ARR roll-forward reports
- customer and cohort analytics
- package-ready bridge visuals
- drill-through to subscriptions, billings, usages, invoices, and rev rec outputs

## Immediate Next Tasks

1. define recurring-revenue policy and movement-record schema
2. define summary GL and non-GL refresh/orchestration rules for recurring-revenue analytics
3. define FX-neutral recurring-revenue presentation rules
4. define package/deck section templates for SaaS reporting
