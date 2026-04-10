# Target Architecture Blueprint

## Recommended stack
- **Frontend**: Next.js, TypeScript, Tailwind, component library
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **ORM / schema management**: Prisma
- **Async jobs**: queue-backed workers for OCR, integrations, billing runs, posting, and notifications
- **Search / indexing**: PostgreSQL full text initially; optional dedicated search engine later
- **Document storage**: object storage for PDFs, signed docs, invoice images, attachments
- **Auth**: first-party auth with role-based authorization; SSO/SAML/OIDC later
- **Infra**: Dockerized services, CI/CD, hosted Postgres, background workers

## Monorepo layout
```text
apps/
  web/                # Next.js UI
  api/                # NestJS API
  worker/             # Background jobs and schedulers
packages/
  ui/                 # Shared UI components
  config/             # Shared config and linting
  domain/             # Shared types, enums, domain contracts
  workflow/           # Reusable workflow/rule engine primitives
  reporting/          # Shared reporting query layer/contracts
infra/
  docker/
  db/
  deploy/
docs/
  architecture/
  product/
  engineering/
```

## Core platform services
1. **Identity and access service**
   - users
   - roles
   - permissions
   - entity-based access
   - approval authority rules

2. **Metadata service**
   - custom field definitions
   - custom transaction type definitions
   - layout and form rules
   - sourcing/defaulting rules
   - field validation and security

3. **Workflow service**
   - event triggers
   - approval routing
   - notifications
   - escalation
   - status transitions

4. **Document service**
   - attachments
   - PDF templates
   - outbound email records
   - DocuSign artifacts

5. **Integration service**
   - inbound/outbound API orchestration
   - OCC, BambooHR, Concur, JIRA, DocuSign connectors
   - retry queues and error logging

6. **Reporting service**
   - standard reports
   - KPI widgets
   - configurable report builder metadata
   - export jobs

## Initial bounded domains
- **Platform**: auth, metadata, workflows, notifications, integrations, documents, reporting shell
- **CRM/Q2C**: leads, opportunities, accounts, contacts, quotes, orders, billing plans, invoices, AR support
- **P2P/AP**: requisitions, purchase orders, receipts, AP invoice intake, OCR, coding, approvals, matching
- **R2R**: chart of accounts, periods, journals, postings, close tasks, reconciliations
- **Planning**: budgets, forecasts, long-range plan, cash forecast
- **Operations**: projects, work orders, inventory, assets, leases
- **Accounting engines**: revenue recognition, amortization/allocation, lease engine, fixed asset depreciation

## Data model approach
- Shared master data for customers, vendors, employees, entities, departments, locations, items, projects, and currencies
- Header/line/subrecord pattern for operational transactions
- Event table and audit trail table for immutable history where feasible
- Posting engine separated from transaction capture so one business transaction can map to one or more accounting entries
- Metadata-driven extension tables for custom fields and transaction behaviors

## Delivery guidance
- Build the **platform layer first**
- Build **Q2C + P2P + AP intake + basic GL** next
- Add accounting engines and planning after the core transaction backbone is stable
- Keep OCR, integrations, and heavy posting logic asynchronous from day one
