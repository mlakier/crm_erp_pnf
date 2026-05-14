# Transaction Required Fields Matrix

## Purpose

This document is the current source of truth for required transaction fields across the app.

It is meant to answer four questions for every transaction family:

- what is required on the header
- what is currently locked in customize/create flows
- whether posting context is enforced
- whether line-level requirements are centrally enforced yet

## Platform Rule

Every transaction document must carry both:

- `subsidiaryId`
- transaction `currencyId`

This is the minimum posting context rule for consolidation-grade accounting.

For accounting objects that do not use the standard header field name, the same rule still applies:

- `Open Item` uses `transactionCurrencyId`
- `Clearing Document` uses `transactionCurrencyId`

## Shared Enforcement Sources

Current shared sources of truth:

- create/edit required fields:
  - [src/lib/form-requirements.ts](c:/Users/mlakier/App/crm_erp_pnf/src/lib/form-requirements.ts)
- posting-context enforcement:
  - [src/lib/transaction-posting-context.ts](c:/Users/mlakier/App/crm_erp_pnf/src/lib/transaction-posting-context.ts)
- shared line requirements:
  - [src/lib/transaction-line-requirements.ts](c:/Users/mlakier/App/crm_erp_pnf/src/lib/transaction-line-requirements.ts)

Current state:

- header requirements are centrally enforced
- line requirements are now centrally defined in the shared line-requirements registry
- line requirements are enforced today on the main line-bearing create/update APIs that accept direct line payloads
- line requirements are still not yet reflected inside the posting-context registry itself

## Matrix

### CRM / Lead to Cash

#### Opportunity

- Header required now:
  - `name`
  - `customerId`
  - `stage`
  - `closeDate`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `name`
  - `customerId`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - root transaction in the chain
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Quote

- Header required now:
  - `opportunity`
  - `status`
  - `validUntil`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `opportunity`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - inherits `subsidiaryId` and `currencyId` from opportunity
  - inherited values must still persist on the quote header
- Shared line requirements:
  - source-derived in current app flow
  - shared registry exists, but the quote create flow currently inherits lines from opportunity instead of accepting direct line input

#### Sales Order

- Header required now:
  - `customerId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
- Locked in shared customize/create:
  - `customerId`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - typically inherits from quote or customer context
  - inherited values must still persist on the sales order header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Fulfillment

- Header required now:
  - `salesOrderId`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `salesOrderId`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - inherits from sales order
  - inherited values must still persist on the fulfillment header
- Shared line requirements:
  - source-derived in current app flow

#### Invoice

- Header required now:
  - `customerId`
  - `status`
  - `dueDate`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `customerId`
  - `status`
  - `dueDate`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - typically inherits from sales order
  - inherited values must still persist on the invoice header
- Shared line requirements:
  - source-derived in current app flow

#### Invoice Receipt

- Header required now:
  - `invoiceId`
  - `amount`
  - `date`
  - `method`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `invoiceId`
  - `amount`
  - `date`
  - `method`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - inherits from invoice
  - inherited values must still persist on the receipt header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Credit Memo

- Header required now:
  - `customerId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
  - `date`
- Locked in shared customize/create:
  - `customerId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
  - `date`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - if created from invoice, inherits from invoice
  - inherited values must still persist on the credit memo header
- Shared line requirements:
  - none yet

#### Customer Refund

- Header required now:
  - `customerId`
  - `amount`
  - `date`
  - `method`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `customerId`
  - `amount`
  - `date`
  - `method`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - typically derives from source receipt / customer credit balance
  - derived values must still persist on the refund header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

### Procure to Pay

#### Purchase Requisition

- Header required now:
  - `status`
  - `title`
  - `neededByDate`
  - `vendorId`
  - `departmentId`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `title`
  - `neededByDate`
  - `vendorId`
  - `departmentId`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - root transaction in the chain
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
    - `expenseAccountId`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Purchase Order

- Header required now:
  - `vendorId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
- Locked in shared customize/create:
  - `vendorId`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - usually inherits from purchase requisition
  - inherited values must still persist on the purchase order header
- Shared line requirements:
  - optional lines
  - if provided, each line must include:
    - `purchaseOrderLineItemId`
    - positive `quantity`

#### Receipt

- Header required now:
  - `purchaseOrderId`
  - `quantity`
  - `date`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `purchaseOrderId`
  - `quantity`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - inherits from purchase order
  - inherited values must still persist on the receipt header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `expenseAccountId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Bill

- Header required now:
  - `vendorId`
  - `subsidiaryId`
  - `currencyId`
  - `date`
  - `status`
- Locked in shared customize/create:
  - `vendorId`
  - `date`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - typically inherits from purchase order or receipt
  - inherited values must still persist on the bill header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Bill Payment

- Header required now:
  - `billId`
  - `amount`
  - `date`
  - `method`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `billId`
  - `amount`
  - `date`
  - `method`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - inherits from bill
  - inherited values must still persist on the payment header
- Shared line requirements:
  - optional lines
  - if provided, each line must include at least one of:
    - `itemId`
    - `description`
  - if provided, each line must include:
    - positive `quantity`
    - non-negative `unitPrice`

#### Bill Credit

- Header required now:
  - `vendorId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
  - `date`
- Locked in shared customize/create:
  - `vendorId`
  - `subsidiaryId`
  - `currencyId`
  - `status`
  - `date`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - if created from bill, inherits from bill
  - inherited values must still persist on the bill credit header
- Shared line requirements:
  - none yet

#### Vendor Refund

- Header required now:
  - `vendorId`
  - `amount`
  - `date`
  - `method`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `vendorId`
  - `amount`
  - `date`
  - `method`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - derives from source bill payment / vendor credit balance
  - derived values must still persist on the refund header
- Shared line requirements:
  - at least one line
  - each line must include:
    - `accountId`
  - debit/credit balance rules are also enforced in the journal API

### Record to Report

#### Journal

- Header required now:
  - `date`
  - `status`
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - `date`
  - `subsidiaryId`
  - `currencyId`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - root accounting transaction unless generated from a source document
- Shared line requirements:
  - at least one line
  - each line must include:
    - `accountId`
  - debit/credit balance rules are also enforced in the journal API

#### Intercompany Journal

- Header required now:
  - `subsidiaryId`
  - `currencyId`
- Locked in shared customize/create:
  - not yet separately documented in `FORM_REQUIREMENTS`
- Posting context enforced:
  - yes
- Source inheritance rule:
  - root accounting transaction
- Shared line requirements:
  - none yet

### Accounting Objects

#### Open Item

- Header required now:
  - `subsidiaryId`
  - `transactionCurrencyId`
- Posting context enforced:
  - yes
- Shared line requirements:
  - none

#### Clearing Document

- Header required now:
  - `subsidiaryId`
  - `transactionCurrencyId`
- Posting context enforced:
  - yes
- Shared line requirements:
  - none

## Current Gap List

These are the remaining structural gaps in the shared required-field platform:

- `Intercompany Journal` does not yet have a dedicated create-form requirement block parallel to `journalCreate`
- some source-derived transaction flows still do not accept direct line payloads, so their line rules are defined but not yet exercised in the same way as manually line-entered transactions

## Next Hardening Step

To finish this properly, the next pass should add dimension-level line rules by transaction family, such as:

- department requirement on lines where applicable
- location requirement on lines where applicable
- project/customer/vendor requirement on journal lines where applicable
- account-type-specific rules for item vs expense vs settlement lines
