# Phase 0 Summary Refresh Monitoring and Operator Surfaces

## Purpose

This document defines the canonical operator-facing control layer for:

- summary refresh monitoring
- reporting refresh status visibility
- staleness detection
- refresh exception review
- rerun and repair workflows
- operational observability for reporting-serving structures

It builds on:

- [phase-0-summary-refresh-orchestration-rules.md](./phase-0-summary-refresh-orchestration-rules.md)
- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)

The goal is to ensure the platform has first-class in-app operational surfaces for managing the reporting refresh layer, instead of hiding that behavior behind opaque jobs or admin-only database state.

## Design Goals

1. Give operators clear visibility into refresh health, freshness, dependencies, and failures.
2. Support proactive detection of stale or incomplete reporting states.
3. Support rerun, repair, resume, and exception-resolution workflows.
4. Support close-aware and certification-aware monitoring.
5. Make reporting operations observable at scale across periods, entities, and report families.

## Core Rule

If a governed reporting-serving structure can fail, become stale, block close, or affect certified reporting, it must have a native in-app monitoring and operator surface.

## Scope

This model applies to:

- summary GL refreshes
- roll-forward refreshes
- open-item summary refreshes
- recurring-revenue refreshes
- KPI/metric refreshes
- report snapshots
- dashboard snapshots
- package generation refreshes

## Canonical Concepts

## 1. Refresh Health View

The platform should provide a consolidated health view for summary/reporting refreshes.

This view should answer:

- what refreshes are currently running?
- what refreshes failed?
- what summaries are stale?
- what certified outputs are impacted?
- what close tasks are blocked by refresh state?

## 2. Refresh Dependency View

Operators should be able to see upstream/downstream dependencies between:

- detailed posting state
- FX / rev rec / amort / translation runs
- summary GL refreshes
- report snapshots
- package outputs
- certified reporting outputs

## 3. Staleness View

The platform should identify reporting-serving structures that are stale because source state changed after the last valid refresh.

Examples:

- new GL posted after summary refresh
- reopened period after certification
- recurring-revenue movement changes after package generation
- FX rerun completed after prior dashboard snapshot

## 4. Exception Queue

Refresh-related exceptions should be operator-visible, triageable, and auditable.

Examples:

- refresh failed
- dependency not satisfied
- source boundary mismatch
- snapshot generation partial failure
- stale certified output

## 5. Repair / Rerun Surface

Operators should be able to:

- rerun a failed refresh
- perform a scoped repair refresh
- resume a partial refresh
- supersede stale outputs with refreshed ones

under governed permissions and with auditability.

## Canonical Table Families

These operator surfaces should primarily rely on the existing canonical families from:

- `RunHeader`
- `RunItem`
- `RunException`
- `RetryQueueItem`
- `DeadLetterItem`
- reporting snapshots
- reporting certifications
- lock/reopen events

Additional derived/operator-facing views may be needed, such as:

## 1. `RefreshMonitoringView` (logical / materialized view)

### Purpose

Provides an operator-oriented consolidated view of refresh state.

### Expected fields

- refresh/run id
- refresh type
- status
- scope
- as-of date / accounting period
- started/completed timestamps
- stale indicator
- dependency health indicator
- impacted report/package/dashboard count
- impacted certified output count
- exception count

## 2. `RefreshImpactView` (logical / materialized view)

### Purpose

Shows what outputs and certifications are affected by a given refresh or stale condition.

### Expected fields

- source refresh id
- impacted report id
- impacted package id
- impacted dashboard id
- impacted certification id
- impact type
- stale severity

## 3. `RefreshDependencyView` (logical / materialized view)

### Purpose

Shows dependency chains between runs, refreshes, snapshots, packages, and certifications.

### Expected fields

- source object type/id
- dependent object type/id
- dependency status
- dependency type
- blocked indicator

## Monitoring Principles

## Freshness Principle

Users and operators should be able to tell whether a reporting artifact is:

- fresh
- stale
- rebuilding
- failed
- superseded
- certified

without guessing.

## Impact Principle

Failures or stale states should be evaluated not just technically, but operationally.

The platform should show whether the issue affects:

- dashboards
- close tasks
- board packages
- recurring-revenue reports
- certified outputs

## Close Integration Principle

Refresh monitoring should tie directly into close operations.

### Expectations

- blocked or stale refreshes can block checklist tasks
- close operators can see which refreshes are required for signoff
- stale certified outputs should be visible in close review workflows

## Certification Integration Principle

Certified reporting outputs should have stronger monitoring treatment.

### Expectations

- stale certified outputs should be specially flagged
- rerun/reopen actions should be more controlled
- supersession paths should be visible

## AI Assistance Principle

AI may assist operators with:

- root-cause suggestions
- prioritization of refresh failures
- stale-impact summaries
- dependency-chain explanation
- rerun recommendation guidance

But AI should not replace the governed run and certification controls.

## Frontend Contract

The shared frontend should expose:

- refresh operations dashboard
- stale-output dashboard
- dependency graph/list views
- refresh exception queue
- impacted certification/package views
- rerun/repair/resume actions

These should be implemented as native in-app operational surfaces, not hidden admin utilities.

## Operator Actions

The platform should support governed actions such as:

- rerun refresh
- rerun from checkpoint
- scoped repair refresh
- mark exception resolved
- open impacted artifact
- initiate reopen workflow where policy permits

Every such action should be auditable.

## Reporting Expectations

The monitoring layer should support reporting on:

- refresh success/failure rates
- stale artifact counts
- mean time to resolution
- rerun frequency
- certified-output impact frequency
- close delays caused by refresh issues

## Performance Expectations

Monitoring views themselves should be performant and index-aware.

The platform should be able to support:

- high refresh volume
- many entities/periods
- large numbers of dependent reports/packages
- real-time or near-real-time operational dashboards

## Immediate Next Tasks

1. define presentation-theme and branding model
2. define certified package distribution workflow
3. define operator permission model for rerun/repair/reopen actions
4. define monitoring alert/notification strategy
