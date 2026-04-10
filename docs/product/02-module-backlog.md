# Initial Module Backlog

## Epic 1 - Platform foundation
- User authentication
- Role and permission model
- Legal entity / department / location dimensions
- Custom fields framework
- Custom transaction type framework
- Workflow event bus
- Approval routing engine
- Notification service
- Attachment and document service
- Audit trail service

## Epic 2 - Master data
- Customer master
- Contact master
- Vendor master
- Employee/user master sync
- Item/product/service catalog
- Terms, tax attributes, currencies
- Project master
- Work order types

## Epic 3 - CRM and commercial
- Leads and opportunities
- Activities and notes
- Quote authoring and versioning
- Pricing and discount approvals
- Quote PDF generation
- DocuSign execution status tracking
- Sales order conversion

## Epic 4 - Billing and receivables
- Billing schedule model
- Invoice generation engine
- Subscription billing support
- Usage billing ingestion hooks
- Credit memos and rebills
- Customer statements
- AR aging and collections notes

## Epic 5 - Procurement and AP
- Requisitions
- Purchase orders
- Receipts/service confirmations
- AP email intake
- OCR extraction queue
- Coding review workbench
- Approval queue
- PO matching queue
- Ready-to-pay queue

## Epic 6 - Accounting core
- Chart of accounts
- Accounting periods
- Journal entries
- Posting engine
- Financial statements
- Transaction detail drill-down
- Balance sheet roll-forward engine

## Epic 7 - Specialized accounting
- Expense amortization/allocation engine
- Revenue recognition engine
- Fixed asset accounting
- Lease accounting
- Inventory accounting

## Epic 8 - Operations
- Project records and tasks
- Project costing and budget visibility
- Work order lifecycle
- Labor/material capture
- Billing triggers from project/work order activity

## Epic 9 - Planning and analytics
- Budget and forecast models
- 3-year plan
- Cash forecast
- KPI dashboards
- Self-service report builder
- Visualization builder

## Epic 10 - Integrations
- BambooHR
- Concur
- OCC
- JIRA
- DocuSign

## Recommended first engineering sprint themes
### Sprint 1
- Monorepo bootstrap
- Auth shell
- Database schema baseline
- Core master dimensions
- Audit/logging skeleton

### Sprint 2
- Metadata framework v1
- Workflow engine v1
- Customer/vendor/item masters
- Basic UI shell and navigation

### Sprint 3
- Quotes and sales orders
- Purchase orders and requisitions
- Document generation skeleton
- Email send-and-track skeleton

### Sprint 4
- AP intake and invoice queue
- Basic invoice generation
- Journals and posting engine v1
- Standard reports v1
