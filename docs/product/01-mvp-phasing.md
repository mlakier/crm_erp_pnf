# MVP and Phasing Plan

## Recommended build sequence

### Phase 0 - Foundation
- Repository structure
- CI/CD baseline
- Environments and secrets strategy
- Authentication and authorization
- Metadata/custom field framework
- Workflow/rules engine foundation
- Document storage and email service foundation
- Core master data model

### Phase 1 - Controlled operational core
- CRM basics: accounts, contacts, opportunities
- Q2C basics: quotes, sales orders, invoice generation, customer documents
- Transaction email send-and-track
- DocuSign quote execution trigger to order
- P2P basics: requisitions, purchase orders, receipts
- AP portal intake, OCR queue, coding review, approval routing
- Basic GL, accounting periods, journals, and financial reports
- BambooHR integration

### Phase 2 - Finance depth and operational expansion
- Advanced AP auto-coding
- 2-way and 3-way matching with tolerance logic
- Expense amortization and allocation engine
- Revenue recognition engine
- Fixed assets
- Inventory
- Projects
- Work orders
- Subscription billing and OCC usage billing
- KPI dashboards and self-service reporting
- Concur integration

### Phase 3 - Planning and advanced accounting
- Forecasting and budgeting
- 3-year operating plan
- Cash forecasting
- Lease accounting
- JIRA expansion
- More advanced workflow orchestration and administration

## What should be built first in code
1. Platform primitives
2. Shared master data
3. Metadata and custom transaction framework
4. Workflow engine
5. Q2C and P2P transaction backbone
6. AP intake and GL posting backbone
7. Reporting shell and dashboard shell

## Suggested MVP definition
The first shippable MVP should prove that the platform can:
- manage customers, vendors, users, and core dimensions
- create quotes, sales orders, purchase orders, and invoices
- send transaction emails and store generated PDFs
- intake AP invoices by email/upload and route them through OCR review and approval
- post basic accounting entries and produce baseline financial reports
- enforce permissions, approvals, and audit trail requirements

## Delivery notes
- Do not begin with advanced planning, lease accounting, or deep inventory flows
- Do not hard-code module-specific custom fields
- Design for multi-entity and future external integrations from the start
- Prefer vertical slices that reach UI + API + DB + audit trail instead of isolated back-end-only work
