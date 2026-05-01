# Phase 0 Reporting Metadata and Summary Schema

## Purpose

This document defines the canonical architecture for:

- native in-app reporting metadata
- indexed summary GL structures
- semantic metrics and KPI definitions
- advanced pivot-style dimensional reporting
- financial package and management deck composition
- snapshot and versioned reporting
- drill-through from summaries to GL and source records

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)

The goal is to make reporting a first-class in-app platform capability rather than a thin export layer or a dependency on third-party BI tools.

## Design Goals

1. Support enterprise-grade reporting natively in-app.
2. Support fast and scalable reporting through indexed summary structures while preserving GL/detail lineage.
3. Support advanced pivot-style dimensional reporting across financial and management dimensions.
4. Support professional presentation-quality outputs such as financial packages and management decks.
5. Support KPI, SaaS, recurring-revenue, roll-forward, and close reporting through one governed semantic layer.
6. Support snapshot/versioned reporting and drill-through to underlying detail.

## Scope

This model applies to:

- financial statements
- management reports
- trial balance and supporting schedules
- roll-forward reports
- open-item and aging reports
- KPI dashboards
- SaaS and recurring-revenue analytics
- board and management packages
- close reporting
- dimensional pivot analysis

## Core Rule

Core enterprise reporting should be delivered natively in-app.

External BI tools may be supported as optional integrations, but they should not be required for:

- standard financial reporting
- management reporting
- dimensional pivots
- package generation
- KPI dashboards
- drill-through analytics

## Canonical Table Families

## 1. `ReportDefinition`

### Purpose

Defines one reusable report or analytic artifact.

Examples:

- balance_sheet
- income_statement
- cash_flow
- ar_aging
- mrr_rollforward
- board_package

### Recommended canonical fields

- `id`
- `code`
- `name`
- `reportType`
- `status`
- `description`
- `baseDataSetKey`
- `layoutTemplateId`
- `settingsJson`
- `createdAt`
- `updatedAt`

### Suggested report types

- financial_statement
- schedule
- pivot
- dashboard
- kpi
- package
- close
- SaaS

## 2. `ReportDataSetDefinition`

### Purpose

Defines the governed data set or query subject area a report uses.

Examples:

- gl_detail
- gl_summary_period
- open_item_detail
- recurring_revenue_summary
- subscription_usage_summary

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `dataSetType`
- `sourceModelJson`
- `grainDescription`
- `createdAt`
- `updatedAt`

### Suggested dataset types

- detail
- summary
- pivot_source
- snapshot
- semantic_metric

## 3. `ReportColumnDefinition`

### Purpose

Defines one reusable report field/column exposed through the reporting engine.

### Recommended canonical fields

- `id`
- `reportDataSetDefinitionId`
- `fieldKey`
- `label`
- `fieldType`
- `sourcePath`
- `formatRule`
- `isDimension`
- `isMeasure`
- `isDrillable`
- `isPivotEligible`
- `createdAt`
- `updatedAt`

## 4. `ReportFilterDefinition`

### Purpose

Defines one reusable report filter or slicer.

### Recommended canonical fields

- `id`
- `reportDataSetDefinitionId`
- `fieldKey`
- `label`
- `filterType`
- `operatorSetJson`
- `defaultValueJson`
- `isRequired`
- `createdAt`
- `updatedAt`

## 5. `PivotDefinition`

### Purpose

Defines a pivot-style report configuration.

### Recommended canonical fields

- `id`
- `reportDefinitionId`
- `rowAxisJson`
- `columnAxisJson`
- `measureAxisJson`
- `filterAxisJson`
- `sortJson`
- `displaySettingsJson`
- `createdAt`
- `updatedAt`

### Notes

This is where dimensional reporting can express views such as:

- subsidiary by month
- department by account
- project by class
- customer cohort by MRR movement type

## 6. `MetricDefinition`

### Purpose

Defines one governed KPI or semantic metric.

### Examples

- revenue
- gross_profit
- dso
- mrr
- arr
- nrr
- grr
- expansion_mrr
- churned_mrr

### Recommended canonical fields

- `id`
- `code`
- `name`
- `metricCategory`
- `status`
- `formulaJson`
- `sourceDataSetId`
- `formatRule`
- `createdAt`
- `updatedAt`

### Suggested metric categories

- financial
- operational
- treasury
- SaaS
- close

## 7. `SummaryGlDefinition`

### Purpose

Defines one governed indexed summary GL structure.

This is a key performance requirement for large-scale reporting.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `summaryType`
- `grainJson`
- `status`
- `sourceLogicJson`
- `refreshMode`
- `createdAt`
- `updatedAt`

### Suggested summary types

- period_account
- period_account_dimension
- rollforward
- recurring_revenue
- open_item_summary
- management_package_source

## 8. `SummaryGlRow`

### Purpose

Represents one aggregated reporting row inside a governed summary structure.

### Recommended canonical fields

- `id`
- `summaryGlDefinitionId`
- `accountingPeriodId`
- `asOfDate`
- `subsidiaryId`
- `accountId`
- `dimensionKeyJson`
- `activityTypeId`
- `transactionCurrencyAmount`
- `localAmount`
- `functionalAmount`
- `sourceRowCount`
- `snapshotBatchId`
- `createdAt`
- `updatedAt`

### Rule

Summary rows are reporting-serving structures, not the accounting source of truth.

They must always remain drillable back to detailed GL and source lineage.

## 9. `ReportSnapshot`

### Purpose

Represents a versioned snapshot of a report, package, or dashboard output.

### Recommended canonical fields

- `id`
- `reportDefinitionId`
- `snapshotNumber`
- `asOfDate`
- `accountingPeriodId`
- `scopeJson`
- `status`
- `outputReference`
- `createdById`
- `createdAt`

## 10. `ReportPackageDefinition`

### Purpose

Defines one reusable financial package or management deck template.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `packageType`
- `status`
- `layoutSettingsJson`
- `createdAt`
- `updatedAt`

### Suggested package types

- financial_package
- board_package
- management_deck
- close_package
- SaaS_package

## 11. `ReportPackageSection`

### Purpose

Defines one section inside a package template.

### Recommended canonical fields

- `id`
- `reportPackageDefinitionId`
- `sectionCode`
- `sectionName`
- `sectionType`
- `sequenceNumber`
- `sourceReportDefinitionId`
- `layoutJson`
- `createdAt`
- `updatedAt`

### Suggested section types

- statement
- schedule
- pivot
- kpi_panel
- narrative
- chart
- appendix

## 12. `DashboardDefinition`

### Purpose

Defines one reusable dashboard layout.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `dashboardType`
- `layoutJson`
- `createdAt`
- `updatedAt`

## 13. `DashboardWidgetDefinition`

### Purpose

Defines one widget inside a dashboard.

### Recommended canonical fields

- `id`
- `dashboardDefinitionId`
- `widgetCode`
- `widgetType`
- `sourceReportDefinitionId`
- `sourceMetricDefinitionId`
- `layoutJson`
- `settingsJson`
- `createdAt`
- `updatedAt`

## Indexed Summary GL Principle

The reporting platform should use governed indexed summary GL structures to make reporting fast and efficient at scale.

### Expectations

Summary GL structures should support:

- period-based financial statements
- dimensional financial and management reporting
- roll-forwards
- KPI dashboards
- SaaS and recurring-revenue analytics where summary GL is part of the logic
- package generation

### Rule

Summary GL structures are not a replacement for detailed ledger storage.

They are a reporting-serving layer that must remain:

- governed
- refreshable
- reconcilable to detail
- drillable to detail

## Professional Presentation Principle

The reporting layer should support professional in-app layout generation for:

- financial statements
- management decks
- board packages
- close packages
- dimensional pivot reports

### Expectations

The native reporting layer should support:

- reusable templates
- controlled layout sections
- presentable typography and spacing
- charts and KPI panels
- narrative sections
- exportable package outputs

## Dimensional Pivot Principle

The reporting platform should support advanced pivot-style dimensional reporting natively in-app.

### Examples

- subsidiary by month by account
- department by quarter by gross margin
- project by class by cost type
- customer segment by MRR movement type
- usage cohort by billed expansion

### Supported dimensions

Examples should include:

- subsidiary
- department
- location
- class
- project
- customer
- vendor
- item
- custom dimensions
- recurring-revenue movement dimensions

## SaaS and Recurring Revenue Reporting Principle

The reporting model should explicitly support:

- monthly MRR
- annual MRR
- MRR roll-forward
- ARR roll-forward where relevant
- new / expansion / contraction / churn / reactivation MRR
- subscription vs non-subscription revenue analysis
- usage-based billing analytics
- cohort-based recurring revenue analysis

These should be modeled as governed report and metric definitions, not spreadsheet-only calculations.

## Relationship to GL and Activity Types

### Rule

Reports and summaries should be able to group and filter by:

- account
- activity type
- period
- subsidiary
- dimensions

This is especially important for:

- roll-forwards
- FX reporting
- intercompany reporting
- close reporting

## Relationship to AI

### Rule

AI can assist the reporting layer, but only through the governed AI capability model.

Examples:

- KPI commentary
- variance narrative
- package summary drafts
- outlier explanation assistance

AI should enhance the in-app reporting platform, not replace the need for a governed reporting data model.

## Reporting Performance Expectations

The architecture should support:

- large-volume summary queries
- low-latency dashboard loads
- reusable cached/snapshotted outputs where appropriate
- scalable dimensional pivots
- fast drill-through from summary to detail

## Indexing Guidance

### `SummaryGlRow`

Consider indexes on:

- `id`
- `summaryGlDefinitionId`
- `accountingPeriodId`
- `asOfDate`
- `subsidiaryId`
- `accountId`
- `activityTypeId`
- composite dimension keys used for common pivot paths
- `snapshotBatchId`

### `MetricDefinition`

Consider indexes on:

- `id`
- `code`
- `metricCategory`
- `status`

### `ReportSnapshot`

Consider indexes on:

- `id`
- `reportDefinitionId`
- `snapshotNumber`
- `asOfDate`
- `accountingPeriodId`
- `createdAt`

## Frontend Contract

The shared frontend should expose:

- self-service report builder
- native pivot-style reporting surfaces
- dashboard builder and dashboard views
- financial package / deck builder
- snapshot history and comparison views
- drill-through from dashboard/report/package to detail

These should be implemented as shared in-app platform surfaces, not delegated to an external BI dependency.

## Retrofit Guidance

The first-wave reporting layer should prioritize:

- financial statements
- trial balance
- roll-forwards
- open-item reports
- KPI dashboards
- SaaS / recurring-revenue reporting
- management package generation

This gives the app a native reporting backbone before more specialized report families expand.

## Immediate Next Tasks

1. define canonical reconciliation schema
2. define recurring-revenue movement taxonomy aligned to MRR reporting
3. define summary GL refresh/orchestration rules
4. define package export/rendering strategy for board and management outputs
