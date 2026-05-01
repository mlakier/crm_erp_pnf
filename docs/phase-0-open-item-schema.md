# Phase 0 Open Item Schema

## Purpose

This document defines the canonical architecture for:

- open items
- open-item entries
- open-item applications / settlements
- historical as-of reporting
- aging and open balance reconstruction

It builds on:

- [phase-0-architecture-blueprint.md](./phase-0-architecture-blueprint.md)
- [phase-0-canonical-schema.md](./phase-0-canonical-schema.md)

The goal is to make open-item behavior a true accounting engine capability rather than a collection of transaction-specific application tables.

## Design Goals

1. Support both current and historical open-item reporting.
2. Preserve settlement/application lineage explicitly.
3. Support AR and AP equally.
4. Support partial applications, reversals, reopenings, write-offs, and adjustments.
5. Drive aging, open balance, and drill-through from one canonical model.
6. Evolve the current receipt/payment application patterns into a shared engine.
7. Prefer automatic clearing generation whenever the source workflow is deterministic.

## Scope

This model applies to any open-item-eligible source, including:

- invoices
- bills
- credit memos
- vendor credits
- customer refunds where applicable
- journal entries if flagged as open-item-eligible
- future reimbursement or settlement transactions

It does not require all of those to be implemented immediately, but the model must support them.

Journal adjustments and journal reversals should be able to participate in this model in a way that makes reconciliations easier, not harder.

## Core Rule

An open item is not just a current balance.

An open item is:

- a source obligation or claim
- plus immutable events that change its state over time
- plus explicit application links to counterpart items or settlement transactions

## Canonical Tables

## 1. `OpenItem`

### Purpose

Represents the anchor record for one open accounting item.

Examples:

- one invoice receivable
- one bill payable
- one credit memo available to apply
- one vendor credit available to apply

### Recommended canonical fields

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

### Notes

- `status` is the open-item lifecycle status, not necessarily identical to the source transaction status
- `isOpen` is useful for current-state lookup, but must not replace reconstructable history

### Suggested open item types

- receivable
- payable
- receivable_credit
- payable_credit
- settlement_only if needed later

### Suggested counterparty types

- customer
- vendor
- employee
- intercompany
- none

## 2. `OpenItemEntry`

### Purpose

Stores immutable dated events that affect the open item.

This is the foundation for historical as-of reporting.

### Recommended canonical fields

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

### Suggested entry types

- open
- application
- reversal
- writeoff
- adjustment
- reopen
- reclass
- fx_adjustment if later needed at open-item level

### Rule

Do not overwrite prior entries when applications or reversals happen.

Append a new entry instead.

## 3. `OpenItemApplication`

### Purpose

Represents the explicit settlement relationship between two items or between an item and a settlement transaction.

### Recommended canonical fields

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
- `exchangeRateContextId` if needed later
- `reversesApplicationId`
- `memo`
- `createdAt`
- `updatedAt`
- `createdById`

### Examples

- cash receipt applied to invoice
- bill payment applied to bill
- credit memo applied to invoice
- vendor credit applied to bill

### Rule

Applications must be first-class records, not just side effects on the source item.

## 4. `OpenItemSnapshot` (optional, later)

### Purpose

Performance acceleration only.

This can support:

- current open balance lookups
- faster aging/reporting
- month-end snapshot caching

### Rule

Snapshots must never become the source of truth.

The source of truth remains:

- `OpenItem`
- `OpenItemEntry`
- `OpenItemApplication`

## Lifecycle Rules

### Creation

When an eligible source transaction posts, create:

- one `OpenItem`
- one opening `OpenItemEntry`

### Application

When a settlement occurs:

- create `OpenItemApplication`
- append one or more `OpenItemEntry` rows reflecting the application effect

Where the settlement relationship is known from the operational flow, the platform should generate the corresponding clearing/application records automatically instead of relying on manual user-created settlements.

### Reversal

When an application or source item is reversed:

- do not mutate history in place
- create reversing application / entry records

For journal-based open-item activity, reversals should preserve explicit linkage to the original journal/header/line and should support reconciliation drill-through without requiring users to infer the relationship manually.

### Reopen

If an item becomes open again:

- append a `reopen` entry
- update current-state convenience fields accordingly

### Close

An item is considered closed when reconstructed open balance reaches zero and no active reversals/reopens keep it open.

## Automation Principle

Open-item clearing should be automated wherever practical.

Preferred examples:

- invoice receipt application creates the clearing/application records automatically
- bill payment application creates the clearing/application records automatically
- vendor credit and credit memo application create the clearing/application records automatically
- bank matching can propose or finalize clearing when confidence and controls allow

Manual settlement remains necessary for edge cases, but the canonical design target is:

- automate standard settlements
- surface exceptions
- preserve complete clearing lineage either way

## Historical Reporting Requirements

The engine must answer:

- open items as of a date
- applied after a date
- closed after a date
- reopened after a date
- aging as of a date
- current vs historical remaining balance

## Reporting Strategy

### Current open balance

Can be derived as:

- original open amount
- plus/minus subsequent entries and applications

### As-of balance

Must be derived using only entries/applications effective on or before the as-of date.

### Aging

Should use:

- due date
- posting date
- document date

depending on report design and user choice.

## Canonical Reporting Outputs

The open-item engine should support:

- customer open items
- vendor open items
- AR aging
- AP aging
- unapplied cash
- unapplied vendor payments / credits
- applied-after-date reporting
- settlement audit trail
- journal-driven open-item reconciliations
- original vs reversing journal lineage for open-item adjustments

## Relationship to Current App

The app already has transaction-specific application structures such as:

- `CashReceiptApplication`
- `BillPaymentApplication`

Those should be treated as current-state stepping stones.

Long-term target:

- either evolve them into the canonical open-item application model
- or make them wrappers/adapters to the canonical model

The important thing is to avoid duplicating settlement logic separately per transaction family forever.

## Recommended Evolution Path

### Stage 1

Introduce canonical open-item tables alongside current application tables.

### Stage 2

Begin writing new application activity into canonical open-item records.

### Stage 3

Use canonical open-item data for:

- historical reporting
- aging
- open balance drill-through

### Stage 4

Gradually simplify transaction-specific application models if they become redundant.

## Canonical Indexing Strategy

### `OpenItem`

Recommended indexes:

- unique index on `openItemNumber`
- index on `status`
- index on `isOpen`
- index on `openItemType`
- index on `subsidiaryId`
- index on `counterpartyType, counterpartyId`
- index on `sourceTransactionId`
- compound index on `(subsidiaryId, isOpen, postingDate)`
- compound index on `(counterpartyType, counterpartyId, isOpen)`

### `OpenItemEntry`

Recommended indexes:

- index on `openItemId`
- compound index on `(openItemId, effectiveDate)`
- index on `entryType`
- index on `postingDate`
- index on `sourceApplicationId`
- index on `sourceTransactionId`
- index on `sourceGlLineId`

### `OpenItemApplication`

Recommended indexes:

- unique index on `applicationNumber`
- index on `fromOpenItemId`
- index on `toOpenItemId`
- index on `applicationDate`
- index on `postingDate`
- index on `settlementTransactionId`
- index on `reversesApplicationId`
- compound index on `(fromOpenItemId, applicationDate)`
- compound index on `(toOpenItemId, applicationDate)`

## Frontend Contract

The frontend should expose open-item behavior consistently through shared sections.

### Required UI surfaces

- application/allocation sections on transactions
- open balance summary fields
- related records from source to settlements
- historical open-item reports
- aging reports
- drill-through to settlement/application detail

### Required behaviors

- show current open balance
- show applied amount
- show unapplied amount where relevant
- show settlement history
- support as-of date reporting views

## Integration with GL

Open items should connect cleanly to GL posting:

- source GL lines may establish the item
- settlement GL lines may reduce or clear the item
- source and settlement drill-through should remain intact

Where journals participate in open-item behavior, the model should support:

- manual adjustment journals that intentionally create or adjust open balances
- journals that settle or reclass open-item balances
- journal reversals that preserve full source and reversal lineage
- easy reconciliation back to original and reversing journal lines

Open-item history must never depend solely on parsing the GL after the fact.

Use explicit open-item records and links.

## Immediate Next Tasks

After this document, the next architecture work should define:

1. canonical FX and intercompany tables in detail
2. canonical run/integration tables in detail
3. migration approach from `CashReceiptApplication` and `BillPaymentApplication`
4. current-page retrofit plan for invoice receipts, bill payments, bills, and invoices
