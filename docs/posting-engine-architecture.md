# Posting Engine Architecture

## Purpose

The ERP posting boundary is the service-layer posting engine. Application routes and business workflows can prepare context, validate user intent, and calculate source-document lines, but they should not create general ledger journals directly unless the flow is a manual journal or a deliberately specialized close process.

## Contract

- Business routes own document-specific intent, such as invoices, bills, receipts, payments, credit documents, bank exceptions, and inventory receipts.
- The posting engine owns ledger guardrails: balanced postings, posting-account eligibility, accounting-period selection, period lock checks, source idempotency, and journal creation.
- PostgreSQL remains the accounting system of record. Prisma is appropriate for app CRUD and orchestration, while posting-critical logic should continue moving toward service-layer transactions and database-enforced constraints where useful.
- Raw SQL, database functions, or materialized reporting views are expected for financial-critical workloads that outgrow ORM ergonomics, especially reporting, remeasurement, translation, close workbenches, and audit-heavy posting.

## Current Engine Responsibilities

- Reject unbalanced source postings.
- Reject lines without a GL account.
- Reject inactive, summary, or non-posting GL accounts.
- Resolve the posting accounting period from posting date and subsidiary, unless a period is explicitly provided.
- Reject closed accounting periods.
- Respect AR, AP, and inventory period locks for module-specific postings.
- Prevent duplicate system journals for the same source type and source id, backed by the `journal_entries(sourceType, sourceId)` unique index.
- Create system journals using the transaction-safe PostgreSQL `system_journal_number_seq` sequence and `SJE-*` display convention.
- Prevent updates and deletes to posted journal headers and lines with database triggers.
- Expose posted ledger activity to financial statements through the `financial_statement_line_facts` SQL view.
- Allow translated layer-only FX lines where the transaction debit/credit column is intentionally zero.

## Allowed Direct Journal Creators

Direct `journalEntry.create` should be rare and visible:

- Manual journal entry API, because it is the user-facing journal creation tool and has extra UX, audit, reversal, intercompany, and open-item behavior.
- FX remeasurement and currency translation, while their specialized run logic is being migrated. These already call shared posting controls before journal creation.
- The posting engine itself.

Any new direct `journalEntry.create` outside those areas should be treated as a design smell and reviewed before merging.

## Next Hardening Steps

- Extend sequence-backed allocation to other accounting-controlled document numbers where concurrency matters.
- Add reversal-only correction flows everywhere a posted journal currently needs operational cleanup.
- Extend the SQL financial reporting layer beyond balance sheet and P&L into cash flow, retained earnings, remeasurement support, and close dashboards.
- Continue moving specialized close processes into engine entry points without diluting their accounting-specific calculation logic.
