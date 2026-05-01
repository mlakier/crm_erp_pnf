# Phase 0 Extensibility Schema

## Purpose

This document defines the canonical architecture for:

- custom fields
- custom dimensions

It is the next layer after:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)

The goal is to evolve the app from page-specific customization and lightweight custom field storage into a reusable enterprise extensibility layer.

## Design Goals

1. Allow both master data and transaction records to be extended without schema hacks.
2. Distinguish generic custom fields from accounting/reporting dimensions.
3. Support both header-level and line-level extensibility.
4. Expose extensibility consistently in:
   - create/edit
   - detail
   - customize
   - saved search
   - export
   - reporting
5. Preserve future compatibility with posting, open items, roll-forwards, and analytics.

## Part A: Custom Field Architecture

## A1. Role of Custom Fields

Custom fields are generic business extensions.

They can be used for:

- reference data enrichment
- operational transaction enrichment
- integration-specific metadata
- workflow metadata
- search/filter/report attributes

They are **not** the same thing as dimensions.

Custom fields may be:

- informational only
- searchable
- exported
- visible on detail pages
- editable on create/edit forms

But they do not automatically imply accounting classification.

## A2. Canonical Custom Field Tables

### 1. `CustomFieldDefinition`

Defines the field itself.

Recommended canonical fields:

- `id`
- `fieldKey`
- `label`
- `description`
- `dataType`
- `storageType`
- `entityScope`
- `isActive`
- `isCustom`
- `isSystemManaged`
- `helpText`
- `placeholder`
- `defaultValue`
- `validationRule`
- `sourceType`
- `sourceKey`
- `searchable`
- `reportable`
- `exportable`
- `createdAt`
- `updatedAt`
- `createdById`
- `updatedById`

Notes:

- `fieldKey` should be stable and machine-safe
- `dataType` is user-facing semantic type
- `storageType` is how the value is stored / interpreted

Example data types:

- text
- long_text
- integer
- decimal
- boolean
- date
- datetime
- list
- reference
- email
- phone
- url
- json

### 2. `CustomFieldAssignment`

Defines where and how the field is used.

Recommended canonical fields:

- `id`
- `fieldId`
- `targetType`
- `targetKey`
- `appliesToLevel`
- `sectionKey`
- `displayOrder`
- `isRequired`
- `isVisible`
- `isEditable`
- `showInList`
- `showInSavedSearch`
- `showInExport`
- `showInImport`
- `defaultOnCreate`
- `createdAt`
- `updatedAt`

Where:

- `targetType` can represent master data, transaction family, run, report context, etc.
- `targetKey` can be the specific object key such as `invoice`, `bill`, `customer`, `journal`
- `appliesToLevel` distinguishes:
  - header
  - line
  - application
  - schedule line

### 3. `CustomFieldOption`

Used for list-style custom fields.

Recommended canonical fields:

- `id`
- `fieldId`
- `value`
- `label`
- `description`
- `displayOrder`
- `isActive`
- `colorToken` optional
- `createdAt`
- `updatedAt`

### 4. `CustomFieldValue`

Stores actual values.

Recommended canonical fields:

- `id`
- `fieldId`
- `targetType`
- `targetId`
- `targetLevel`
- `targetLineId` where relevant
- typed value columns or canonical flexible columns
- `valueText`
- `valueNumber`
- `valueBoolean`
- `valueDate`
- `valueDateTime`
- `valueJson`
- `valueReferenceId`
- `valueOptionId`
- `createdAt`
- `updatedAt`
- `createdById`
- `updatedById`

### 5. Optional support tables

As needed later:

- `CustomFieldDefaultRule`
- `CustomFieldVisibilityRule`
- `CustomFieldValidationRule`
- `CustomFieldSourceRule`

## A3. Storage Strategy

Prefer normalized value storage over page-specific JSON blobs.

Recommended approach:

- one value row per field per target record
- support typed columns for common data types
- support reference/list linkage cleanly

Avoid:

- storing all custom values for a record in one untyped JSON field as the primary source of truth

## A4. Indexing Strategy

At minimum:

- unique / near-unique lookup on `(fieldId, targetId, targetLineId?)`
- index on `targetType, targetId`
- index on `fieldId`
- index on `valueOptionId`
- index on `valueReferenceId`
- index on commonly filtered value columns when needed

## A5. Frontend Contract for Custom Fields

Custom fields must integrate with shared UI patterns.

### Required frontend surfaces

- create form rendering
- edit form rendering
- detail rendering
- customize mode placement
- list filter exposure where enabled
- saved search criteria exposure where enabled
- export mapping where enabled

### Required behaviors

- correct field control by data type
- list/reference sourcing
- required validation
- default value application
- readonly handling
- visibility handling

## Part B: Custom Dimension Architecture

## B1. Role of Custom Dimensions

Custom dimensions are structured classification axes that affect:

- posting
- reporting
- roll-forwards
- planning
- analytics
- consolidations and management views

They are not just display fields.

Examples:

- market
- region
- product family
- channel
- initiative
- segment

## B2. Canonical Custom Dimension Tables

### 1. `CustomDimensionDefinition`

Defines a dimension.

Recommended canonical fields:

- `id`
- `dimensionKey`
- `label`
- `description`
- `isActive`
- `isBalanceSheetRelevant`
- `isPnlRelevant`
- `isPostingRequired`
- `isLineLevelOnly`
- `isHeaderAllowed`
- `isReportingOnly`
- `isCustom`
- `createdAt`
- `updatedAt`
- `createdById`
- `updatedById`

### 2. `CustomDimensionValue`

Defines the values within a dimension.

Recommended canonical fields:

- `id`
- `dimensionId`
- `valueKey`
- `label`
- `description`
- `parentValueId` for hierarchies
- `displayOrder`
- `isActive`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

### 3. `CustomDimensionAssignment`

Defines where a dimension may be used.

Recommended canonical fields:

- `id`
- `dimensionId`
- `targetType`
- `targetKey`
- `appliesToLevel`
- `isRequired`
- `isVisible`
- `isEditable`
- `showInSavedSearch`
- `showInExport`
- `showInReporting`
- `createdAt`
- `updatedAt`

### 4. `CustomDimensionValueAssignment`

Optional but likely useful to constrain allowed values by context.

Recommended canonical fields:

- `id`
- `dimensionId`
- `valueId`
- `targetType`
- `targetKey`
- `isAllowed`
- `createdAt`
- `updatedAt`

### 5. `CustomDimensionEntry`

Stores the chosen dimension value on operational or GL records.

Recommended canonical fields:

- `id`
- `dimensionId`
- `valueId`
- `targetType`
- `targetId`
- `targetLevel`
- `targetLineId`
- `glLineId`
- `createdAt`
- `updatedAt`

## B3. Why custom dimensions must be separate

Dimensions require stronger guarantees than custom fields:

- they must survive posting
- they must flow to GL
- they must participate in reporting
- they must be indexable for high-volume analytics

So they should have explicit dimension entry tables rather than being hidden inside generic custom field values.

## B4. Indexing Strategy

At minimum:

- index on `dimensionId`
- index on `valueId`
- index on `(targetType, targetId)`
- index on `glLineId`
- compound index on `(dimensionId, valueId, targetType)`

## B5. Frontend Contract for Custom Dimensions

Dimensions must appear in:

- transaction create/edit
- detail pages
- line entry where applicable
- GL drill-through / reports
- planning pages
- saved searches
- export and reporting filters

Dimensions should also be visually distinguishable from generic custom fields where necessary.

## Part C: Relationship to Existing App

## C1. Current lightweight custom field model

The app already has a lightweight custom field model in Prisma:

- `CustomFieldDefinition`
- `CustomFieldValue`

This should be treated as a starting point, not the final architecture.

The likely evolution path is:

1. preserve compatibility where possible
2. add assignment/options/rules structure
3. formalize target scope and typed storage
4. add custom dimensions as a separate family

## C2. Existing customization framework

The current page customization framework already supports:

- form/detail layout
- line-column layout in some pages
- GL impact layout in some pages

The extensibility layer should plug into that system rather than replacing it.

## Part D: Retrofit Priorities

### First-wave retrofit targets

- customers
- vendors
- items
- chart of accounts
- journals
- invoices
- bills
- invoice receipts
- bill payments

### Why this order

These records are the most important combination of:

- operational usage
- accounting impact
- need for search/export
- future reporting relevance

## Part E: Immediate Next Design Tasks

After this document, the next design work should define:

1. canonical open-item tables in detail
2. canonical FX/intercompany tables in detail
3. canonical run/integration tables in detail
4. migration approach from current lightweight custom field model
