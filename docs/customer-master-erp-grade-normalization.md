# Customer Master ERP-Grade Normalization

## Direction

Customer should not become one giant table. The long-lived design is:

- `customers`: global commercial identity and compatibility fields.
- `customer_entity_settings`: subsidiary/legal-entity accounting, currency, tax, and billing behavior.
- `customer_addresses`: bill-to, ship-to, legal, tax, statement, and service addresses.
- `contacts`: customer contacts, extended with AP/billing/statement/dunning/legal/tax/support receipt flags.
- `customer_tax_profiles`: VAT/sales tax/resale/exemption/tax engine profile data.
- `customer_credit_profiles`: credit, collections, dunning, and hold controls.
- `customer_payment_instruments`: tokenized ACH/direct debit/payment-method records.
- `customer_dimension_defaults`: effective-dated dimension defaults by customer and optional subsidiary.
- `customer_contracts`: customer contract headers and renewal metadata.
- `customer_audit_log`: structured customer-master audit events.
- `billing_accounts`: billing-account orchestration for consolidated invoices, payment method defaults, schedules, and delivery rules.

## Current Phase

The schema now has the normalized foundation while preserving existing customer UI/API behavior.

Existing customer fields still write to `customers` for compatibility. Create/update also syncs the normalized profile tables so we can move UI sections over gradually without breaking transactions, imports, saved views, or detail-page customization.

## Backfill

The migration backfills:

- Primary subsidiary, currency, AR account, and tax code into `customer_entity_settings`.
- Existing customer billing address into `customer_addresses`.
- Taxable/tax code/resale number into `customer_tax_profiles`.
- Currency/subsidiary/collections-email controls into `customer_credit_profiles`.

## Next UI Move

Move customer detail into tabs/sections backed by the normalized records:

- Identity
- Entity Settings
- Addresses
- Contacts
- Tax
- Credit & Collections
- Billing Accounts
- Payment Methods
- Dimensions
- Contracts
- Audit

The list page can stay mostly identity/classification focused; the detail page should become the controlled ERP-grade customer master workspace.
