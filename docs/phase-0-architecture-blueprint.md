# Phase 0 Architecture Blueprint

## Purpose

This document converts the enterprise build sheet into implementation-grade architecture.

It defines the core platform model families that all future work should reuse:

- operational transaction model
- general ledger posting model
- custom field model
- custom dimension model
- open-item model
- reconciliation model
- clearing document model
- multi-currency and intercompany model
- run / batch / integration model
- AI capability and control model
- reporting metadata and summary model

It also defines the matching frontend contracts so backend and frontend evolve together.

This is the baseline before large-scale new module work begins.

## Guiding Principles

### 1. Separate business transactions from accounting postings

Operational records and accounting entries must be modeled separately.

Use:

- transaction header / transaction line tables for business activity
- GL header / GL line tables for accounting activity

Never collapse the business record and the ledger posting into one table family.

### 2. Model for auditability first

The platform must preserve:

- source transaction lineage
- posting lineage
- application / settlement lineage
- run / batch lineage
- change timestamps and actors
- as-of historical reporting capability

### 3. Design for dimensions and extensibility from day one

All accounting-relevant records should be able to participate in:

- standard dimensions
- custom dimensions
- custom fields
- saved-search exposure
- export and report exposure

### 4. Model immutable events where history matters

For open items, settlement history, remeasurement, and run-based accounting, use event-based or append-oriented patterns where possible.

Do not rely only on mutable “current state” columns when historical reporting is required.

### 5. Optimize schema intentionally

Indexing is part of model design, not a later clean-up pass.

### 6. Treat AI as a controlled platform layer

AI should be architected as an app-wide capability, not a narrow feature of one module.

Where AI is used, the platform should support:

- global enable/disable
- module-level enable/disable
- process-level enable/disable
- step-level enable/disable
- role-aware access where appropriate
- traceability of suggestion vs execution
- human override for controlled accounting and operational actions

### 7. Build for scale and progressive AI-operated close

The platform should be designed so AI can eventually perform a meaningful portion of close operations at scale.

That means the architecture should assume:

- large volumes of period-end tasks, exceptions, and supporting evidence
- orchestration across many subsidiaries, periods, workstreams, and run families
- progressive movement from AI suggestion to AI-assisted execution where controls allow
- strong approval, override, and certification boundaries for regulated accounting actions

Close, reporting, reconciliation, and exception architectures should therefore be designed for:

- high-volume execution
- queue-based processing
- resumable workflows
- clear state machines
- operator and AI collaboration

### 8. Separate detailed ledger storage from reporting-serving summaries

The platform should preserve detailed GL and source lineage as the source of truth while also maintaining indexed summary reporting structures for speed and scale.

Those reporting-serving structures should support:

- financial statements
- management reporting
- dimensional pivots
- roll-forwards
- KPI and dashboard queries
- board and management package generation

### 9. Build native in-app reporting as a first-class platform capability

The platform should provide its own advanced reporting, pivoting, dashboarding, and package-generation capabilities in-app.

External BI tools may be supported as optional integrations, but the core enterprise reporting experience should not depend on third-party BI products in order to deliver:

- financial statements
- management reporting
- dimensional pivot analysis
- KPI dashboards
- SaaS metrics
- board and management decks
- drill-through reporting

## Model Families

## A. Operational Transaction Model

### Purpose

Represents the business event before, during, and after accounting impact.

Examples:

- Invoice
- Bill
- Sales Order
- Purchase Order
- Expense Report
- Deposit
- Check
- Subscription
- Billing Run output

### Standard pattern

- `TransactionHeader`
- `TransactionLine`
- optional application / allocation / schedule link tables

### Required concepts

Every transaction family should define:

- business id / number
- source entity links
- status lifecycle
- transaction date
- posting date if distinct
- subsidiary
- transaction currency
- local currency
- functional currency
- header memo / reference
- actor fields where relevant
- source links and downstream links

For recurring-revenue-capable flows, the architecture should also support downstream reporting for:

- subscription revenue
- non-subscription revenue
- usage-based billing
- monthly MRR
- annual MRR
- MRR roll-forwards
- expansion / contraction / churn / reactivation movement

### Recommended table shape

Use concrete tables per business object, but follow the same pattern:

- `Invoice`
- `InvoiceLine`
- `Bill`
- `BillLine`
- `ExpenseReport`
- `ExpenseReportLine`

Not one giant polymorphic transaction table.

### Recurring revenue and SaaS analytics expectation

The transaction and reporting foundation should support hybrid revenue environments where:

- subscription revenue exists
- non-subscription revenue exists
- usage-based billing exists

and reporting must be able to analyze them both separately and together.

That means downstream reporting should be able to attribute revenue and recurring-revenue movements to:

- subscriptions
- billing schedules
- usages
- invoices
- credit memos
- revenue-recognition outputs

### Indexing baseline

Each transaction family should consider indexes on:

- `id`
- business number
- status
- transaction date
- posting date
- subsidiary
- transaction currency
- source entity keys
- customer / vendor / employee / project / department / class / location where applicable

## B. General Ledger Posting Model

### Purpose

Represents the accounting result of operational activity and accounting runs.

### Standard pattern

- `GlHeader`
- `GlLine`

### Required concepts

`GlHeader` should represent the posting event:

- posting date
- journal number / batch number
- source type
- source id
- source run id where relevant
- posting status
- created / posted / reversed actors

`GlLine` should represent the accounting detail:

- GL header link
- account
- debit / credit
- transaction currency amount if relevant
- local amount
- functional amount
- FX rate references
- activity type
- open-item references where relevant
- dimension values
- source line reference where relevant
- intercompany counterpart context where relevant

### Source lineage rule

Every posted GL line should be traceable to at least one of:

- source transaction header
- source transaction line
- source schedule line
- source run detail row

### Indexing baseline

At minimum:

- GL header id
- posting date
- source type / source id
- subsidiary
- book if multi-book is later added
- GL line account
- dimension keys
- activity type
- open-item keys
- intercompany linkage

## C. Custom Field Model

### Purpose

Support extensible fields without per-page schema hacks.

### Core tables

- `CustomFieldDefinition`
- `CustomFieldAssignment`
- `CustomFieldOption`
- `CustomFieldValue`

### Responsibilities

`CustomFieldDefinition`
- identity
- data type
- label
- source / default / validation metadata

`CustomFieldAssignment`
- where the field can appear
- header vs line applicability
- page/module applicability
- required / visible / editable defaults

`CustomFieldOption`
- list values for select-type custom fields

`CustomFieldValue`
- normalized record-to-field value storage
- support for header or line binding

### Frontend requirement

Custom fields must be renderable through shared components in:

- create/edit
- detail
- customize mode
- list filters
- saved searches
- exports

## D. Custom Dimension Model

### Purpose

Support reporting and posting dimensions separately from generic custom fields.

### Core tables

- `CustomDimensionDefinition`
- `CustomDimensionValue`
- `CustomDimensionAssignment`

### Why separate from custom fields

Dimensions drive:

- GL posting
- roll-forwards
- planning/reporting slices
- consolidation and management views

So they need stricter accounting semantics than generic extension fields.

### Backend requirement

Dimensions must be attachable to:

- transaction headers
- transaction lines
- GL lines
- planning records
- reporting definitions

### Frontend requirement

Dimension selection and display must be shared across:

- transaction forms
- detail pages
- reports
- saved searches
- KPI slices

## E. Open Item Model

### Purpose

Support current and historical open-item reporting.

### Core tables

- `OpenItem`
- `OpenItemEntry`
- `OpenItemApplication`
- optional `OpenItemSnapshot` later for performance only

### Responsibilities

`OpenItem`
- one accountable open item anchor
- source transaction / line references
- party references
- account references
- currency and amount baselines

`OpenItemEntry`
- immutable dated events
- creation
- application
- reversal
- write-off
- adjustment
- reopen

`OpenItemApplication`
- explicit source-target settlement/application relationship

### Historical requirement

The model must answer:

- what was open as of a date?
- what was applied after a date?
- what reopened?
- what was the remaining open balance historically?

### Frontend requirement

Expose through:

- applications sections
- open balance displays
- historical open-item reports
- aging
- drill-through to source and settlement entries

## F. Reconciliation Model

### Purpose

Support in-app reconciliations driven primarily by open-item management, AI assistance, and balance-sheet control processes.

### Core concepts

- reconciliation headers and lines
- source-to-support linkage
- AI-assisted matching and exception triage
- open-item-driven reconciliation logic
- roll-forward integration

### Design intent

Reconciliations should be performed natively in-app and should rely heavily on:

- canonical open-item data
- settlement and clearing lineage
- AI-assisted matching, grouping, and exception identification

They should not depend primarily on external spreadsheets or third-party reconciliation tools.

### Frontend requirement

Users should be able to:

- reconcile balances in-app
- review AI match suggestions
- accept, reject, or override matches
- see unreconciled items and blockers
- drill from reconciliation to roll-forward, GL, open item, and source transaction detail

## G. Clearing Document Model

### Purpose

Represent the accounting settlement event that clears one or more open items and, where applicable, records realized FX.

### Design intent

Clearing documents should be automated by default wherever the source business flow provides enough information to do so safely.

The preferred pattern is:

- business transaction or run occurs
- platform derives the settlement relationship
- platform creates the clearing document automatically
- user intervenes only for exceptions, ambiguous matches, or controlled manual settlements

Manual clearing should remain supported, but it should be the exception path rather than the primary operating model.

This should be modeled separately from:

- the source business transaction
- the open-item anchor
- the GL posting event

because one clearing event may:

- settle multiple open items
- settle items created at different dates and FX rates
- create realized gain/loss postings
- be reversed later without overwriting prior history

### Standard pattern

- `ClearingDocumentHeader`
- `ClearingDocumentLine`

### Example use cases

- customer receipt clears invoice(s)
- bill payment clears bill(s)
- customer refund clears credit balance or unapplied cash
- vendor credit clears bill(s)
- intercompany settlement clears due-to / due-from items
- manual open-item settlement

### Responsibilities

`ClearingDocumentHeader`
- one clearing event identity
- clearing type
- status
- clearing date
- posting date
- subsidiary
- transaction / local / functional currency context
- source settlement transaction reference where applicable
- realized FX summary fields where applicable
- reversal linkage
- actor/audit fields

`ClearingDocumentLine`
- one cleared component of the settlement
- source open-item reference
- target open-item reference where applicable
- cleared transaction/local/functional amounts
- original rate context reference
- settlement rate context reference
- realized FX local/functional amounts where applicable
- linked GL line ids where applicable
- memo / audit metadata

### Automation expectations

The platform should support automatic clearing generation for:

- invoice receipt applications
- bill payment applications
- customer refund consumption of credit / unapplied cash
- vendor credit application
- deposit-linked receipt clearing where appropriate
- bank matching outputs that finalize a settlement relationship
- month-end or run-driven settlement events where rules are deterministic

Automation should still leave behind:

- the clearing document header / line record
- traceable source linkage
- realized FX attribution where applicable
- exception flags when automation confidence is not high enough

### Frontend requirement

Expose through:

- settlement / applications sections
- realized FX drill-through
- related records on both source and clearing transactions
- historical clearing reports
- reversal traceability

## H. Multi-Currency and FX Model

### Purpose

Support enterprise FX behavior across subledgers and ledger.

### Core fields

Currency-aware records should support:

- `transactionCurrencyId`
- `localCurrencyId`
- `functionalCurrencyId`

Amounts where relevant:

- transaction amount
- local amount
- functional amount

### Core supporting tables

- `ExchangeRate`
- `ExchangeRateBatch` or equivalent ingestion/run tracking
- `MonthEndFxProcessRun`
- optional FX adjustment / remeasurement linkage records

### Responsibilities

Support:

- nightly FX pulls
- historical rates
- average/current/closing rates
- realized gain/loss
- unrealized gain/loss
- CTA
- month-end remeasurement runs

### Frontend requirement

Users must be able to see:

- the 3 currency contexts
- applied rates / rate source
- month-end FX runs
- FX reporting outputs

## I. Intercompany Model

### Purpose

Prevent intercompany imbalance and preserve traceability.

### Core concepts

- intercompany counterpart linkage
- paired posting behavior
- balancing validation
- atomic posting of both sides

### Core tables or extensions

Whether separate or embedded, the model must preserve:

- transaction-side relationship
- GL-side relationship
- due-to / due-from logic
- elimination readiness

### Hard rule

One side of an intercompany posting must never be allowed to post independently of its counterpart.

## J. Activity Typing and Roll-Forward Model

### Purpose

Support balance sheet roll-forwards and accounting movement analysis.

### Core concept

Every accounting-relevant posting line should carry an explicit activity type.

Examples:

- opening balance
- operational movement
- settlement / application
- accrual
- deferral
- amortization
- revenue recognition
- reclassification
- FX remeasurement
- transfer
- write-off
- reversal
- carry-forward / close

### Why it matters

Roll-forwards should not be inferred only from account number or transaction label.

### Frontend requirement

Roll-forward reports must drill:

- by activity type
- by account
- by dimension
- to underlying GL and source transactions

## K. Run / Batch / Process Engine Model

### Purpose

Support operational and accounting process runs as first-class records.

### Example run families

- billing runs
- payment runs
- revenue recognition journal runs
- amortization runs
- month-end FX process runs
- integration jobs
- statement import batches

### Shared pattern

- `RunHeader`
- `RunItem` or detail rows
- optional output link tables
- status / exception tracking

### Core fields

- run id / number
- run type
- scope parameters
- initiated by
- started / completed timestamps
- status
- error counts
- generated output links

### Frontend requirement

Runs should have:

- list pages
- detail pages
- exceptions view
- audit trail
- output drill-through

## L. Integration and Automation Platform Model

### Purpose

Treat integrations and automation as platform capabilities.

### Core modules / records

- integration definitions
- connection / credential records
- webhook subscriptions
- inbound/outbound message logs
- scheduled jobs
- retry / dead-letter queues
- API credentials / service accounts

### Frontend requirement

Shared admin surfaces for:

- integration configuration
- execution logs
- failures / retries
- connection status
- job history

## M. AI Capability and Control Model

### Purpose

Treat AI as an app-wide controllable service layer that can participate in workflows, analytics, automation, and user assistance across all modules.

### Scope

This should apply across:

- master data
- transactional entry and review
- saved-search and list experiences
- reporting and analytics
- treasury and bank operations
- AP / AR automation
- close operations
- planning and forecasting
- integrations and exception handling
- administrative/configuration surfaces

### Core expectations

The platform should support:

- feature flags for AI by app area
- process-step controls for AI participation
- task-oriented AI services such as:
  - reconciliations
  - variance analysis
  - anomaly detection
  - narrative generation
  - coding suggestions
  - exception triage
  - workflow guidance
- auditability of prompts, outputs, approvals, and executions where control matters
- clear distinction between:
  - AI suggestion
  - AI draft
  - AI-approved execution

### Frontend requirement

AI-enabled experiences should use shared patterns for:

- AI toggle / status visibility
- suggestion review
- accept / reject / override actions
- exception escalation
- traceability back to source process steps

## Frontend Architecture Contracts

## 1. Shared list engine

All new list pages must use the shared saved-search/list engine.

That includes:

- shared toolbar
- page saved-search selector
- shared column model
- export
- joined-field awareness
- shared criteria/filter behavior

## 2. Shared detail frame

All applicable detail pages should use:

- related records
- related documents
- communications
- system notes
- GL impact

## 3. Shared transactional edit patterns

Use the right shared container for the record type:

- header-only editor
- line section
- allocation/applications section
- schedule line section

## 4. Shared customize contract

Applicable pages should support:

- reference layout
- detail layout
- line columns layout where relevant
- GL impact layout where relevant

## Retrofit Priorities

Current app areas that should move onto the new foundation first:

### Accounting core

- chart of accounts
- journals
- currencies
- exchange rates
- intercompany journals

### Open-item relevant transactions

- invoices
- bills
- invoice receipts
- bill payments
- customer refunds

### Revenue / schedule readiness

- items

### Platform support

- saved-search engine
- customize framework
- exports
- permissions hooks

## Immediate Next Design Tasks

The next architecture work after this blueprint should define:

1. canonical field sets for transaction header / line
2. canonical field sets for GL header / line
3. custom field schema
4. custom dimension schema
5. open-item schema
6. reconciliation schema
7. clearing document schema
8. FX/intercompany schema
9. run/batch schema
10. integration/admin service schema
11. AI capability/control schema

## Non-Negotiables

- use shared components wherever possible
- use dedicated line/allocation/schedule tables where needed
- support backend and frontend together
- design for historical reporting, not only current state
- design for traceability and auditability
- do not allow one-off list/detail paradigms to expand again
