# Phase 1 Wave 1 Prisma Migration Plan

## Purpose

This document translates the Phase 1 execution plan into the first concrete Prisma migration sequence.

It is grounded in the current `prisma/schema.prisma` and focuses on additive changes that introduce the first canonical support tables without breaking existing application behavior.

It builds on:

- [phase-1-execution-plan.md](./phase-1-execution-plan.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)
- [phase-0-open-item-schema.md](./phase-0-open-item-schema.md)
- [phase-0-clearing-schema.md](./phase-0-clearing-schema.md)
- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)
- [phase-0-activity-type-catalog.md](./phase-0-activity-type-catalog.md)

## Current Schema Anchors

The current schema already contains important stepping stones we should preserve during Wave 1:

- `JournalEntry`
- `JournalEntryLineItem`
- `CashReceipt`
- `CashReceiptApplication`
- `BillPayment`
- `BillPaymentApplication`
- `ExchangeRate`
- `AccountingPeriod`
- existing lightweight custom field tables

Wave 1 should use these as anchors rather than attempting a destructive replacement.

## Wave 1 Objective

Introduce the first canonical accounting support tables and references so the backend can begin dual-writing canonical data while existing pages keep functioning.

## Migration Strategy

### Core rule

Wave 1 should be additive.

That means:

- add new canonical support tables
- add new reference columns to current models only where low-risk and clearly valuable
- avoid renaming or dropping current operational tables in this wave
- avoid forcing current pages to read from the new structures immediately

## Recommended Migration Sequence

## Migration 1: Activity Type Foundation

### Purpose

Introduce the governed activity-type catalog so GL and reporting logic have a stable movement vocabulary.

### New tables

- `ActivityTypeDefinition`

### Minimal starting fields

- `id`
- `code`
- `name`
- `category`
- `status`
- `description`
- `defaultRollForwardGroup`
- `isSystemDefined`
- `isOpenItemRelevant`
- `isClearingRelevant`
- `isFxRelevant`
- `isIntercompanyRelevant`
- `createdAt`
- `updatedAt`

### Optional first-wave augmentations to current tables

Add nullable references or text keys to:

- `JournalEntryLineItem`

Recommended first-wave addition:

- `activityTypeCode` or `activityTypeId`

### Why first

This is low-risk, highly reusable, and immediately useful for later dual-write posting logic and reporting.

## Migration 2: Run / Orchestration Core

### Purpose

Introduce the common execution model needed for later summary refreshes, FX runs, bank imports, and close-linked process runs.

### New tables

- `RunHeader`
- `RunItem`
- `RunOutputLink`
- `RunException`

### Minimal starting fields

`RunHeader`
- `id`
- `runNumber`
- `runType`
- `status`
- `triggerType`
- `scopeType`
- `scopeJson`
- `requestedAt`
- `startedAt`
- `completedAt`
- `asOfDate`
- `accountingPeriodId`
- `subsidiaryScope`
- `message`
- `summaryJson`
- `requestedById`
- `startedById`
- `completedById`
- `createdAt`
- `updatedAt`

`RunItem`
- `id`
- `runHeaderId`
- `itemNumber`
- `itemType`
- `status`
- `sourceRecordType`
- `sourceRecordId`
- `sourceLineId`
- `targetRecordType`
- `targetRecordId`
- `targetLineId`
- `message`
- `requestPayloadJson`
- `resultPayloadJson`
- `startedAt`
- `completedAt`
- `createdAt`
- `updatedAt`

`RunOutputLink`
- `id`
- `runHeaderId`
- `runItemId`
- `outputType`
- `outputRecordType`
- `outputRecordId`
- `outputLineId`
- `glHeaderId`
- `glLineId`
- `createdAt`

`RunException`
- `id`
- `runHeaderId`
- `runItemId`
- `severity`
- `exceptionType`
- `status`
- `sourceRecordType`
- `sourceRecordId`
- `message`
- `detailsJson`
- `assignedToId`
- `resolvedAt`
- `resolvedById`
- `resolutionNote`
- `createdAt`
- `updatedAt`

### Current-schema linkage points

- `AccountingPeriod`
- `User`
- later `JournalEntry`, snapshots, summary refresh outputs

### Why second

Many later canonical families depend on a shared execution/run layer.

## Migration 3: Open Item Core

### Purpose

Introduce the canonical open-item engine without replacing current receipt/payment application behavior.

### New tables

- `OpenItem`
- `OpenItemEntry`
- `OpenItemApplication`

### Minimal starting fields

`OpenItem`
- `id`
- `openItemNumber`
- `openItemType`
- `status`
- `accountType`
- `subsidiaryId`
- `transactionCurrencyId`
- `localCurrencyId`
- `functionalCurrencyId`
- `sourceTransactionType`
- `sourceTransactionId`
- `sourceTransactionLineId`
- `sourceNumber`
- `counterpartyType`
- `counterpartyId`
- `documentDate`
- `postingDate`
- `dueDate`
- `originalTransactionAmount`
- `originalLocalAmount`
- `originalFunctionalAmount`
- `openItemEligible`
- `isOpen`
- `closedAt`
- `closedById`
- `memo`
- `createdAt`
- `updatedAt`

`OpenItemEntry`
- `id`
- `openItemId`
- `entryNumber`
- `entryType`
- `effectiveDate`
- `postingDate`
- `accountingPeriodId`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `sourceTransactionType`
- `sourceTransactionId`
- `sourceTransactionLineId`
- `sourceApplicationId`
- `sourceGlLineId`
- `sourceRunId`
- `memo`
- `createdAt`
- `createdById`

`OpenItemApplication`
- `id`
- `applicationNumber`
- `applicationType`
- `status`
- `fromOpenItemId`
- `toOpenItemId`
- `settlementTransactionType`
- `settlementTransactionId`
- `applicationDate`
- `postingDate`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `exchangeRateContextId`
- `reversesApplicationId`
- `memo`
- `createdAt`
- `updatedAt`
- `createdById`

### Current-schema linkage points

Initial dual-write sources:

- `CashReceipt`
- `CashReceiptApplication`
- `BillPayment`
- `BillPaymentApplication`
- later `JournalEntry` for open-item-relevant journal flows

### Important Wave 1 constraint

Do not remove or repurpose `CashReceiptApplication` or `BillPaymentApplication` yet.

Instead:

- keep them as operational structures
- begin writing canonical `OpenItem*` records in parallel later in service-layer work

## Migration 4: Clearing Core

### Purpose

Introduce explicit clearing records so settlement and realized FX can become first-class accounting events.

### New tables

- `ClearingDocumentHeader`
- `ClearingDocumentLine`

### Minimal starting fields

`ClearingDocumentHeader`
- `id`
- `clearingNumber`
- `clearingType`
- `status`
- `subsidiaryId`
- `transactionCurrencyId`
- `localCurrencyId`
- `functionalCurrencyId`
- `clearingDate`
- `postingDate`
- `accountingPeriodId`
- `sourceTransactionType`
- `sourceTransactionId`
- `sourceRunId`
- `counterpartyType`
- `counterpartyId`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `realizedFxLocalAmount`
- `realizedFxFunctionalAmount`
- `memo`
- `reversesClearingDocumentId`
- `reversedByClearingDocumentId`
- `autoGenerated`
- `automationSource`
- `exceptionStatus`
- `createdAt`
- `updatedAt`
- `createdById`
- `postedById`
- `reversedById`

`ClearingDocumentLine`
- `id`
- `clearingDocumentId`
- `lineNumber`
- `lineRole`
- `fromOpenItemId`
- `toOpenItemId`
- `sourceTransactionType`
- `sourceTransactionId`
- `sourceTransactionLineId`
- `settlementTransactionType`
- `settlementTransactionId`
- `settlementTransactionLineId`
- `originalExchangeRateContextId`
- `settlementExchangeRateContextId`
- `transactionAmount`
- `localAmount`
- `functionalAmount`
- `realizedFxLocalAmount`
- `realizedFxFunctionalAmount`
- `openItemApplicationId`
- `sourceGlLineId`
- `settlementGlLineId`
- `memo`
- `createdAt`
- `updatedAt`

### Current-schema linkage points

Initial sources:

- `CashReceipt`
- `CashReceiptApplication`
- `BillPayment`
- `BillPaymentApplication`
- later `CustomerRefund`
- later bank-matching outputs

## Migration 5: Low-Risk GL and Journal Enhancements

### Purpose

Add a few targeted fields to current journal/GL-adjacent models that improve future compatibility without changing behavior yet.

### Candidate additions

On `JournalEntry`
- `reversesJournalEntryId`
- `reversalReasonCode`
- `isOpenItemRelevant`

On `JournalEntryLineItem`
- `activityTypeCode` or `activityTypeId`
- `reversesJournalEntryLineItemId`
- `reconciliationGroupKey`

### Why defer some richness

Do not overload current `JournalEntry` tables with the entire future canonical GL model in Wave 1.

Wave 1 should add only the fields that:

- clearly improve traceability
- clearly help future service-layer adoption
- do not destabilize current page behavior

## Recommended Prisma Naming and Mapping Strategy

### Rule

Use concrete table names in Prisma that map cleanly to future domain language.

Examples:

- `OpenItem` -> `open_items`
- `OpenItemEntry` -> `open_item_entries`
- `OpenItemApplication` -> `open_item_applications`
- `ClearingDocumentHeader` -> `clearing_document_headers`
- `ClearingDocumentLine` -> `clearing_document_lines`
- `RunHeader` -> `run_headers`
- `RunItem` -> `run_items`
- `RunOutputLink` -> `run_output_links`
- `RunException` -> `run_exceptions`
- `ActivityTypeDefinition` -> `activity_type_definitions`

## Indexing Plan for Wave 1

Wave 1 must ship with indexes, not add them later.

### Required first-wave indexes

`ActivityTypeDefinition`
- unique on `code`
- index on `category`
- index on `status`

`RunHeader`
- unique on `runNumber`
- index on `runType`
- index on `status`
- index on `accountingPeriodId`
- index on `requestedAt`

`RunItem`
- index on `runHeaderId`
- index on `status`
- index on `sourceRecordType, sourceRecordId`
- compound on `(runHeaderId, itemNumber)`

`RunException`
- index on `runHeaderId`
- index on `runItemId`
- index on `status`
- index on `assignedToId`

`OpenItem`
- unique on `openItemNumber`
- index on `status`
- index on `isOpen`
- index on `subsidiaryId`
- index on `sourceTransactionType, sourceTransactionId`
- index on `counterpartyType, counterpartyId`

`OpenItemEntry`
- index on `openItemId`
- compound on `(openItemId, effectiveDate)`
- index on `sourceTransactionType, sourceTransactionId`
- index on `sourceApplicationId`

`OpenItemApplication`
- unique on `applicationNumber`
- index on `fromOpenItemId`
- index on `toOpenItemId`
- index on `settlementTransactionType, settlementTransactionId`
- index on `postingDate`

`ClearingDocumentHeader`
- unique on `clearingNumber`
- index on `status`
- index on `clearingType`
- index on `clearingDate`
- index on `sourceTransactionType, sourceTransactionId`

`ClearingDocumentLine`
- index on `clearingDocumentId`
- compound on `(clearingDocumentId, lineNumber)`
- index on `fromOpenItemId`
- index on `toOpenItemId`
- index on `openItemApplicationId`

## Service Adoption Plan After Migration

Once Wave 1 migrations exist, the next backend step should be:

1. create `OpenItemService`
2. create `ClearingService`
3. create `RunService`
4. seed `ActivityTypeDefinition`
5. add dual-write into:
   - invoice receipt posting
   - bill payment posting
   - journal posting where relevant

## Things Explicitly Out of Scope for Wave 1

Do not attempt all of these in the first migration pass:

- full reconciliation tables
- full reporting/certification tables
- full AI governance tables
- full custom dimension overhaul
- full summary GL serving tables

Those belong in later additive waves after the accounting core support tables are stable.

## Success Criteria

Wave 1 migration planning is complete when:

- new canonical support tables are defined
- table naming and indexes are agreed
- current schema anchor points are identified
- dual-write adoption path is clear
- no destructive changes are required to begin implementation

## Immediate Next Build Artifact

After this plan, the next concrete engineering artifact should be:

- an actual Prisma schema patch draft for:
  - `ActivityTypeDefinition`
  - `RunHeader`
  - `RunItem`
  - `RunOutputLink`
  - `RunException`
  - `OpenItem`
  - `OpenItemEntry`
  - `OpenItemApplication`
  - `ClearingDocumentHeader`
  - `ClearingDocumentLine`
