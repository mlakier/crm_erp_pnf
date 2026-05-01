# Phase 0 Package Export and Rendering Strategy

## Purpose

This document defines the canonical strategy for:

- native in-app package composition
- board and management deck rendering
- financial package export generation
- presentation-quality layout control
- reusable report/package sections
- certified and preliminary output rendering

It builds on:

- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-summary-refresh-orchestration-rules.md](./phase-0-summary-refresh-orchestration-rules.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)

The goal is to make the app capable of producing professional financial and management packages natively, without depending on external BI or presentation tooling for core enterprise reporting outputs.

## Design Goals

1. Support professional in-app rendering for financial packages, management decks, and board outputs.
2. Support reusable package templates and section templates.
3. Support both interactive in-app viewing and governed export generation.
4. Support preliminary, certified, and superseded output states.
5. Support narrative, charts, pivots, KPI panels, schedules, and financial statements within the same package.
6. Preserve full lineage back to underlying report definitions, snapshots, and certifications.

## Core Rule

Package rendering is not just export formatting.

A package is a governed reporting artifact made of:

- reusable sections
- governed data sources
- professional layout rules
- snapshot/version/certification context
- controlled export outputs

## Package Output Families

The platform should support at least:

- financial package
- management package
- board package
- close package
- recurring-revenue / SaaS package
- operational review package

## Rendering Modes

The platform should support multiple rendering modes from the same package definition:

- in-app interactive view
- print-optimized view
- PDF export
- spreadsheet export where appropriate
- presentation/deck export where appropriate

### Rule

The in-app rendered package should be the primary source experience, and exports should be consistent derivations of that governed layout.

## Canonical Concepts

## 1. Package Template

Package templates should define:

- package purpose
- audience
- layout structure
- branding/styling rules
- section ordering
- default filters/scope
- certification requirements

These map conceptually to `ReportPackageDefinition`.

## 2. Package Section

Package sections should be reusable and should support different content types.

Examples:

- title / cover
- executive summary
- KPI panel
- financial statement
- roll-forward schedule
- pivot table
- chart section
- variance analysis section
- recurring-revenue bridge
- close certification appendix

These map conceptually to `ReportPackageSection`.

## 3. Rendered Package Instance

Each generated package should preserve:

- the package template used
- the report snapshots used
- the rendering timestamp
- the certification state
- the output references created

This can rely on existing snapshot/certification families plus output references rather than requiring a wholly separate model family immediately.

## Layout and Presentation Principles

## Professional Layout Principle

The package engine should support high-quality presentation suitable for:

- executives
- board members
- finance leadership
- auditors where appropriate
- operating leaders

### Expectations

The rendering layer should support:

- strong typography hierarchy
- consistent spacing and grid alignment
- table styling suitable for financial statements
- KPI cards/panels
- chart sections
- narrative callouts
- headers/footers/page numbering
- section dividers
- appendices

## Reusable Template Principle

Layouts should be reusable and configurable without rebuilding reports from scratch each time.

### Expected reusable elements

- title/branding blocks
- statement layouts
- schedule layouts
- KPI panels
- chart blocks
- commentary blocks
- appendix blocks

## Data and Snapshot Principle

Package rendering should be driven by governed report definitions and snapshots.

### Expectations

Every rendered package should be able to identify:

- which reports/metrics were used
- which snapshots were used
- which refresh runs supplied the data
- whether the package was preliminary or certified

## Certified vs Preliminary Rendering

The rendering layer should visually distinguish:

- draft
- preliminary
- certified
- reopened
- superseded

### Examples

- status badge or header marker
- certified timestamp/user block
- watermark or notice for preliminary versions
- superseded notice when viewing prior versions

## Interactive Package Features

The in-app package experience should support:

- collapsible sections
- drill-through from numbers to underlying reports
- drill-through from reports to GL/source data
- switching between period comparisons
- switching between preliminary and certified versions where allowed
- role-aware visibility

## Export Strategy

The package layer should support controlled output generation to formats such as:

- PDF for board and executive consumption
- spreadsheet export for supporting schedules and detail appendices
- presentation-style export where appropriate

### Rule

Exports should preserve the governed package layout and not require users to rebuild formatting manually outside the app.

## Pivot and Schedule Rendering Principle

Package sections should support both:

- presentation-friendly tables
- detailed financial schedules

This includes advanced pivot-style sections for:

- dimensional management reporting
- recurring-revenue movement bridges
- roll-forward schedules
- departmental or project performance slices

## Narrative and AI Principle

The package layer should support narrative sections that can be:

- manually authored
- AI-assisted
- versioned
- reviewed and approved

### Examples

- executive summary
- variance narrative
- KPI commentary
- recurring-revenue commentary
- close summary

### Rule

AI may assist package narratives, but must remain governed by the AI capability/control model and should not silently replace reviewed content.

## Performance Principle

Rendering should scale to large packages and high-volume reporting environments.

### Expectations

- package composition should use report snapshots and summary-serving structures where appropriate
- rendering should support asynchronous generation for heavy outputs
- users should see progress/status for longer-running package exports
- package generation should integrate with run/orchestration infrastructure

## Relationship to Certification and Reopen

Package rendering should align directly with reporting certification governance.

### Expectations

- certified packages should render from certified snapshots/sections
- reopened packages should visibly indicate reopen state
- superseded packages should retain historical rendering lineage

## Frontend Contract

The shared frontend should expose:

- package template management
- package preview/view mode
- package section editing/configuration
- package status and certification indicators
- package export actions
- version history and comparison

These should be native in-app surfaces and reuse the shared reporting/detail/list framework where appropriate.

## Reporting and Deck Use Cases

The package engine should support:

- board decks
- monthly management reporting packages
- quarterly business reviews
- close packs
- recurring-revenue and SaaS reporting decks
- treasury and cash packages

## Immediate Next Tasks

1. define summary refresh monitoring and operator exception surfaces
2. define certified package export controls and distribution workflows
3. define presentation-theme and branding model
4. define comparison/version-diff UX for package review
