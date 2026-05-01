# Phase 0 Summary Refresh and Orchestration Rules

## Purpose

This document defines the canonical orchestration rules for:

- summary GL refreshes
- non-GL reporting summary refreshes
- recurring-revenue summary generation
- report snapshot generation
- dashboard/package refresh timing
- close-aware reporting refresh dependencies

It builds on:

- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-recurring-revenue-movement-taxonomy.md](./phase-0-recurring-revenue-movement-taxonomy.md)
- [phase-0-close-checklist-schema.md](./phase-0-close-checklist-schema.md)

The goal is to make reporting refreshes deterministic, auditable, performant, and compatible with close governance.

## Design Goals

1. Define a governed refresh model for summary/reporting-serving structures.
2. Support both GL-based and non-GL-based summary pipelines.
3. Support incremental and full refresh strategies.
4. Support close-aware sequencing so users know when summaries are final enough for reporting/certification.
5. Support scalable refresh orchestration across entities, periods, and summary families.
6. Preserve full lineage from reporting-serving outputs back to detail/run sources.

## Core Rule

Summary reporting structures must be refreshed through governed runs, not ad hoc hidden background updates.

Every material reporting-serving refresh should be traceable to:

- what was refreshed
- for which scope and period
- with which source data boundary
- by which run
- with what resulting status

## Summary Families in Scope

This orchestration model should support at least:

- summary GL refreshes
- roll-forward summary refreshes
- open-item summary refreshes
- recurring-revenue summary refreshes
- KPI / semantic metric refreshes
- dashboard snapshot refreshes
- report/package snapshot refreshes

## Canonical Concepts

## 1. Refresh Definitions

The platform should define governed refresh families such as:

- `summary_gl_refresh`
- `rollforward_refresh`
- `open_item_summary_refresh`
- `recurring_revenue_refresh`
- `metric_refresh`
- `dashboard_snapshot_refresh`
- `report_snapshot_refresh`
- `package_snapshot_refresh`

These can map onto `RunHeader` / `RunItem` families from the run schema rather than requiring brand-new execution tables.

## 2. Refresh Scope

Every refresh should define scope explicitly.

Typical scope dimensions:

- accounting period
- as-of date
- subsidiary or entity set
- book if multi-book is later enabled
- summary definition id
- report definition id
- package/dashboard definition id
- recurring-revenue cohort or business segment where relevant

## 3. Refresh Boundaries

The platform should preserve which data boundary a refresh used.

Examples:

- up to posting date/time
- up to accounting period lock state
- up to a specific run completion state
- based on posted data only
- based on posted plus approved-but-not-posted operational data where policy allows

## GL Summary Refresh Principle

Summary GL structures should be refreshed from governed source data boundaries tied to detailed GL.

### Expectations

- detailed GL remains the source of truth
- summary GL is a governed reporting-serving layer
- refreshes should preserve period and dimensional scope
- refreshes should support drill-back to detailed GL and source transactions

### Supported strategies

- full rebuild by period/scope
- incremental refresh by changed source window
- selective repair refresh for corrected scope

## Non-GL Summary Refresh Principle

Not all reporting summaries should be sourced directly from GL.

Examples:

- recurring-revenue movement summaries
- usage analytics summaries
- subscription cohort summaries
- close task summaries

These should still be refreshed through governed runs with clear lineage and scope.

## Recurring Revenue Refresh Principle

Recurring-revenue reporting should support its own governed refresh process.

### Expectations

Refreshes should support:

- monthly MRR summaries
- annual ARR summaries
- recurring-revenue movement bridges
- subscription vs non-subscription revenue splits
- usage-based recurring movement summaries
- FX-neutral and FX-inclusive recurring-revenue variants

### Rule

Recurring-revenue refreshes should use the governed movement taxonomy, not ad hoc point-in-time spreadsheet logic.

## Close-Aware Orchestration Principle

Reporting refreshes should integrate with close status and close checkpoints.

### Examples

- preliminary summary refresh before close completion
- post-run refresh after FX remeasurement
- post-run refresh after rev rec and amortization
- certified refresh after close signoff

### Expectation

Users should be able to distinguish:

- preliminary
- in-progress
- close-complete
- certified / package-ready

reporting outputs.

## Refresh Status Vocabulary

Recommended status vocabulary for material summary refreshes:

- queued
- running
- completed
- completed_with_warnings
- failed
- stale
- superseded
- certified

## Staleness Principle

The reporting layer should know when a summary or snapshot is stale.

### Examples

A reporting-serving structure may become stale when:

- new GL was posted after the last refresh
- open-item settlement changed
- recurring-revenue source data changed
- FX or translation runs completed after the last summary build
- close reopened a previously certified period

### Expectation

The platform should expose staleness visibly to users and dependent workflows.

## Dependency Principle

Refreshes should support explicit upstream dependencies.

Examples:

- roll-forward refresh depends on summary GL refresh
- recurring-revenue package snapshot depends on recurring-revenue refresh
- board package depends on financial statement refresh + KPI refresh + narrative snapshot generation
- close certification may depend on designated refreshes completing successfully

## Snapshot Principle

Reports and packages should be able to persist snapshot versions.

### Expectations

- a snapshot should preserve which refresh/run it was built from
- package snapshots should remain reproducible
- management and board decks should be comparable across periods and reruns

## Performance Principle

Refresh orchestration should be designed for scale.

### Expectations

- large entities and multi-entity scopes should be partitionable
- refreshes should support resumable item processing
- recomputation should be minimized where incremental logic is safe
- heavy aggregations should target indexed summary structures

## Relationship to AI

AI can assist analysis, variance commentary, and exception triage around refreshes, but not replace governed refresh mechanics.

### Examples

- explain why a refresh produced unusual movements
- summarize stale dependencies
- draft variance commentary after a certified refresh

AI should complement refresh orchestration, not become the refresh engine itself.

## Frontend Contract

The platform should expose:

- refresh-run detail
- refresh status and staleness indicators
- dependency visibility
- certified vs preliminary reporting labels
- snapshot history
- rerun / repair refresh actions where permitted

These should be visible in:

- report detail
- dashboard detail
- package/deck views
- close checklist dependencies

## Reporting Governance Principle

Material reporting outputs should not silently recompute without traceability when governance matters.

Examples where governance matters:

- board package
- management financial package
- certified month-end statements
- close-support reports
- recurring-revenue investor-style metrics

## Recommended First-Wave Orchestration Sequence

For period-end reporting, the platform should support an ordered sequence such as:

1. detailed posting complete enough for refresh boundary
2. FX remeasurement and translation runs complete
3. rev rec and amortization runs complete
4. summary GL refresh
5. roll-forward refresh
6. open-item summary refresh
7. recurring-revenue refresh
8. KPI/metric refresh
9. report/dashboard/package snapshots
10. close review/certification

The exact sequence can vary by process, but the architecture should support it cleanly.

## Integration with Summary Structures

Summary-serving structures should be linked back to refresh runs through:

- summary definition id
- refresh run id
- snapshot batch id
- source period/as-of date

This applies to:

- `SummaryGlRow`
- recurring-revenue summary rows
- report snapshots
- package snapshots

## Immediate Next Tasks

1. define recurring-revenue policy and movement-record schema
2. define package export/rendering strategy for board and management outputs
3. define certified-reporting lock and reopen rules
4. define summary refresh monitoring and operator exception surfaces
