# Phase 0 Presentation Theme and Branding Model

## Purpose

This document defines the canonical architecture for:

- report and package presentation themes
- branding and layout standards
- reusable visual tokens for financial and management outputs
- package-level and section-level styling governance
- native in-app presentation consistency across dashboards, reports, and packages

It builds on:

- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)
- [phase-0-package-export-rendering-strategy.md](./phase-0-package-export-rendering-strategy.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)

The goal is to ensure the in-app reporting layer can produce presentation-quality outputs with governed, reusable styling rather than ad hoc one-off formatting.

## Design Goals

1. Support professional, consistent styling across reports, dashboards, packages, and decks.
2. Support reusable visual themes rather than hand-formatting each output.
3. Support different audience-appropriate presentation styles such as board, management, operational, and close.
4. Support branding, typography, spacing, tables, KPI cards, charts, and narrative blocks through governed theme definitions.
5. Preserve consistency between in-app view and exported output.

## Core Rule

Presentation quality should be a governed platform concern, not a manual formatting exercise after the fact.

## Canonical Concepts

## 1. `PresentationThemeDefinition`

### Purpose

Defines one reusable visual theme for reports, dashboards, or packages.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `themeType`
- `description`
- `tokenSetJson`
- `layoutDefaultsJson`
- `createdAt`
- `updatedAt`

### Suggested theme types

- board
- management
- operational
- close
- investor
- default

## 2. `BrandingProfileDefinition`

### Purpose

Defines one reusable branding profile for logos, color identity, legal footer, and tenant-specific marks.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `logoReference`
- `footerText`
- `brandTokensJson`
- `createdAt`
- `updatedAt`

## 3. `PresentationLayoutTemplate`

### Purpose

Defines a reusable layout template for a report or package section.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `layoutType`
- `themeDefinitionId`
- `brandingProfileId`
- `layoutJson`
- `createdAt`
- `updatedAt`

### Suggested layout types

- report
- dashboard
- package_cover
- package_section
- statement
- schedule
- kpi_panel
- narrative
- chart

## Visual Governance Principles

## Theme Token Principle

Themes should be driven by reusable visual tokens rather than one-off component styling.

### Expected token families

- typography
- colors
- spacing
- borders
- table styles
- chart palette
- KPI card styles
- narrative callout styles
- header/footer styles

## Audience-Appropriate Theme Principle

Different output families may require different presentation emphasis.

Examples:

- board theme emphasizes concise summaries, charts, and narrative highlights
- management theme emphasizes detailed schedules and KPI panels
- close theme emphasizes control status, signoff, and exception visibility
- operational theme emphasizes drill-through and dense tabular detail

## Consistency Principle

The same theme should render consistently across:

- in-app report views
- package previews
- dashboard views
- exported PDF or presentation-like outputs

## Financial Statement Presentation Principle

The theme model should support statement-specific presentation needs such as:

- account hierarchy indentation
- subtotal styling
- variance column emphasis
- negative number formatting
- period comparison readability
- supporting footnote or note sections

## KPI and Chart Presentation Principle

The theme model should support:

- KPI tiles/cards
- bridge charts
- trend lines
- pivot summary visualizations
- commentary callouts

These should be presentation-quality and reusable across dashboard and package layers.

## Branding Principle

Branding should be configurable but governed.

The model should support:

- tenant/app branding
- package-specific branding profiles where policy allows
- official footer/disclaimer text
- logo/header consistency across exports

## Relationship to Reporting and Packages

Themes and layout templates should integrate directly with:

- `ReportDefinition`
- `ReportPackageDefinition`
- `ReportPackageSection`
- `DashboardDefinition`
- `DashboardWidgetDefinition`

### Rule

Presentation should be selected through governed definitions, not ad hoc export-time overrides whenever possible.

## Relationship to Certification

Certified outputs should preserve which theme and branding profile were used.

### Expectations

- certified package output should be reproducible visually
- reopen/supersession should preserve prior presentation context

## Relationship to AI

AI may assist with narrative composition or section drafting, but should not arbitrarily alter governed visual themes or branding.

### Expectation

AI-generated narrative should render inside the governed layout system rather than creating ungoverned visual variance.

## Frontend Contract

The shared frontend should expose:

- theme management
- branding profile management
- layout template management
- theme preview
- package/report preview using selected theme

These should support both admin governance and business-user preview workflows.

## Reporting and Package Use Cases

The theme and branding model should support:

- financial statement presentation
- board packages
- management decks
- recurring-revenue/SaaS packages
- close packages
- KPI dashboards

## Performance Expectations

Theme resolution and rendering should be lightweight enough to support:

- in-app preview
- package rendering at scale
- repeatable exports without visual drift

## Immediate Next Tasks

1. define certified package distribution workflow
2. define operator permission model for reporting refresh and certification actions
3. define report/package comparison and diff UX
4. define native charting and visual grammar standards
