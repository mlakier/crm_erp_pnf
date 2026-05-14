# Phase 0 Dimension Policy Admin UI Spec

## Purpose

This document defines what `Configuration > Dimensions` should become as a business-admin experience.

It is intentionally different from the current low-level control-plane page.

The current page is useful as a technical editor for:

- `DimensionDefinition`
- `DimensionApplicability`
- `DimensionSourcingPolicy`

But it is not yet the business-ready orchestration surface for:

- transaction workflows
- billing and subscription sourcing
- revenue propagation
- GL posting behavior

This spec reshapes the admin experience into the mental model the platform actually needs.

It is the UI companion to:

- [phase-0-dimension-billing-revenue-propagation-spec.md](./phase-0-dimension-billing-revenue-propagation-spec.md)
- [phase-0-dimension-billing-revenue-implementation-matrix.md](./phase-0-dimension-billing-revenue-implementation-matrix.md)

## Core Design Rule

`Department`, `Location`, and `Class` should be treated as the first three preconfigured dimensions in the same framework that will later support custom dimensions.

So `Configuration > Dimensions` should not feel like:

- three hardcoded ERP fields
- plus a separate future custom-dimension system

It should feel like:

- one dimension platform
- with seeded dimensions already loaded
- and future custom dimensions using the same configuration model

## Current Phase 0 Close-Out Model

The business-admin experience is now split into three surfaces:
The old `Configuration > Dimensions` reference workspace has been retired so admins have one clear entry point.

- `Configuration > Manage Dimensions`
  - simple catalog for admins
  - shows active status, seeded/custom status, family coverage, sourcing coverage, posting posture, and policy health
  - opens one editable dimension detail page
- `Configuration > Manage Dimensions > Add New`
  - guided setup workflow for creating a governed dimension
  - walks the admin through definition, values, value fields, application, sourcing, validation, flow, posting, and review
  - intended to become the AI-assisted questionnaire surface

The editable detail page is the long-term maintained record after setup. It is organized around:

- header definition
- values
- value fields
- applicability
- sourcing
- enforcement
- propagation
- posting
- preview

### Final Detail Page Ownership

The current UI should avoid duplicate controls by assigning one clear owner for each policy concept:

- `Header / Define`
  - dimension identity
  - value source
  - value model
  - selection type
  - active status
  - policy-health readout
- `Values`
  - maintained dimension values
  - seeded value visibility
  - import/export of dimension values
- `Fields`
  - value-level custom fields
  - required/default/options metadata for values
- `Where It Applies`
  - master-data extension
  - transaction-family header/line applicability
  - project/subscription/GL/reporting surfaces
  - required flags
  - locked-in-customize flags
- `Sourcing`
  - ordered source priority by business flow
  - source eligibility based on record extension
  - manual override by flow
  - fail-if-unresolved by flow
- `Enforcement`
  - validation mode
  - inheritance mode
  - override mode
  - business-flow fail behavior
  - planned runtime enforcement placeholders
- `Propagation`
  - read-only downstream chain map
  - intended propagation path by business flow
  - blocked source dependency readouts
  - remains planned until runtime propagation services are implemented
- `Posting`
  - GL posting participation
  - GL split behavior
  - direct GL assignment
  - planned account-range enforcement
- `Preview`
  - final read-only policy summary
  - policy-health review
  - no primary editing controls

Important anti-duplication rule:

- `Where It Applies` owns visibility, requiredness, and locked customize state.
- `Sourcing` owns where values come from.
- `Enforcement` owns what happens when values are missing, overridden, or unresolved.
- `Posting` owns accounting preservation behavior.
- `Propagation` and `Preview` summarize intended behavior until deeper runtime services are live.

Status badges must distinguish:

- `Live`
- `Configurable`
- `Planned`

This is important because the current UI intentionally shows the whole policy shell before every runtime layer is fully wired.

## Phase 0 Runtime Hooks Now Live

The first runtime hooks are intentionally narrow but real:

- transaction customize required/locked behavior now reads seeded dimension policy
- transaction line dimension policy now respects transaction-family assignment
- family-aware mapping is used for:
  - `LTC`
  - `PTP`
  - `RTR`
- invoice and bill line create/update now run the seeded line-dimension resolver
- a resolver preview endpoint is available at `/api/config/dimensions/resolve`

This means disabling a seeded dimension for a family can now affect line-dimension customize/requirement behavior instead of relying only on the old generic `transaction_line` applicability target.

The first resolver slice currently supports:

- explicit line entry
- item defaults for seeded `Department` and `Location`
- unresolved-required blocking only when the dimension policy is required and configured to fail unresolved values

The resolver does not yet support customer, vendor, GL account, project, subscription, subscription plan, billable charge, or custom record defaults as live source providers.

## Remaining Planned Runtime Layers

The following layers are not fully live yet and should remain marked as planned/configurable in UI until implemented:

- source resolver that evaluates source priority against actual records
- automatic defaulting from customer, vendor, item, GL account, project, subscription, and custom records
- save/post validation across all transaction families
- propagation from source document to downstream transaction
- propagation into revenue arrangements, elements, actual plans, forecast plans, and revenue recognition journals
- GL posting split and summarization enforcement by dimension combination
- reporting-layer assignment tables beyond seeded fields

## Runtime Gap Checklist

Before changing `Propagation` from planned to live, the platform must prove these paths in runtime code:

- `LTC`
  - opportunity to quote
  - quote to sales order
  - sales order to fulfillment and invoice
  - invoice line to revenue arrangement and revenue element
  - revenue element to actual plan, forecast plan, rev rec journal, and GL
- `PTP`
  - purchase requisition to purchase order
  - purchase order to receipt
  - receipt to bill
  - bill to bill payment, bill credit, vendor refund, clearing, and GL
- `RTR`
  - journal and intercompany journal to GL line
  - clearing document to GL
  - FX revaluation to GL
- `Billing / Revenue`
  - subscription plan to subscription
  - subscription and usage to billable charge
  - billable charge to invoice line
  - invoice line to revenue objects and rev rec GL

Before changing deeper `Enforcement` items from planned to live, the platform must prove:

- save-time blocking
- post-time blocking
- account-range enforcement
- posting-critical vs reporting-only behavior
- GL split by dimension combination
- audit lineage for sourced dimension assignments

## ERP-Grade Design Considerations

To make the dimension framework strong enough for SAP- and NetSuite-grade use cases, the admin experience must also account for several control layers beyond simple field appearance.

These are not optional refinements.

They determine whether dimensions behave as:

- light reporting tags
- or real accounting and operational control fields

### 1. Default vs Hard Source

The platform should distinguish between:

- `Default`
  - suggests a value
  - may be overridden later
- `Hard Source`
  - authoritative source
  - should flow forward unless an explicit exception is allowed

Examples:

- `Customer` may default a dimension onto an invoice header
- `Item` may hard-source a dimension onto an invoice line
- `Project` may override a customer default for a specific transaction

This distinction should be explicit in the policy model.

### 2. Financial vs Operational Dimensions

Not every dimension should behave the same way.

The framework should distinguish between:

- `Financial Dimensions`
  - affect GL or accounting reporting
  - examples:
    - `Department`
    - `Class`
    - cost-center-like future custom dimensions
- `Operational Dimensions`
  - primarily affect workflow or management reporting
  - examples:
    - service channel
    - implementation type
    - product delivery stream

Some dimensions will need to:

- appear on transactions
- flow through revenue
- post to GL

Others may only need:

- operational visibility
- workflow routing
- non-GL reporting

### 3. Header vs Line vs GL Ownership

Dimensions should not be assumed to belong equally at every level.

The framework should model three distinct ownership levels:

- `Header`
- `Line`
- `GL`

Examples:

- organizational context may be meaningful at header and line level
- commercial segmentation often belongs primarily on lines
- GL may need split-by-dimension-combination preservation even if header carries a default

The admin UI should make it obvious which level is authoritative.

### 4. Posting-Critical vs Reporting-Only

Some dimensions are accounting-critical.

Others are primarily analytic.

The framework should distinguish:

- `Posting-Critical`
  - must survive into GL
  - may require split posting
  - may be required before posting
- `Reporting-Only`
  - can exist upstream
  - may not need GL propagation

This is especially important for future custom dimensions.

### 5. Account-Specific Enforcement

Per-transaction applicability is not always enough.

A dimension may be:

- required for revenue lines
- optional for tax lines
- prohibited for certain clearing lines
- required only for specific account ranges

So the long-term design should support:

- `Account-based enforcement`
- `Account category enforcement`
- `Posting type enforcement`

The admin experience does not need to implement the full rule engine immediately, but it should leave room for this layer.

### 6. Validation and Substitution Rules

Enterprise systems often distinguish between:

- `Validation`
  - block save/post when required policy is not met
- `Substitution`
  - automatically derive or replace a value when conditions match

Examples:

- if `Item Category = Subscription`, default dimension from subscription
- if `Customer Group = Enterprise`, substitute channel dimension from customer
- if `Revenue Account` is in a certain range, require a financial dimension before posting

This suggests a future dimension rule layer for:

- conditional sourcing
- conditional requirement
- conditional substitution

### 7. Hierarchies and Reporting Trees

A real dimension framework often needs more than flat values.

The framework should anticipate:

- parent/child values
- rollup nodes
- reporting hierarchies
- alternate reporting trees later

This is important if a custom dimension becomes a real management-reporting axis.

### 8. Security and Governance

Some dimensions may affect:

- who can select a value
- who can see records with certain values
- who can post certain combinations

This is not the first release goal, but the design should not block it.

### 9. Summarization and Dimensional Fidelity

If a dimension posts to GL, the platform must decide whether summarization is allowed.

For some dimensions:

- summarization may be acceptable

For others:

- summarization would destroy the reporting meaning
- GL lines must split by unique dimension combination

The `Posting` policy section should treat this as a first-class decision.

### 10. Source Layer Lifecycle

The dimension lifecycle should be understood as:

1. `Definition`
2. `Master Data Extension`
3. `Operational Extension`
4. `Sourcing`
5. `Propagation`
6. `Posting`
7. `Reporting`

For this platform, the foundational master-data source set should be:

- `Customer`
- `Vendor`
- `Item`

Second-tier dimension participants should include:

- `Project`
- `Subscription`

Then downstream targets should include:

- transactions
- revenue objects
- open items
- clearing
- GL
- reporting

## General Sourcing Rule

The platform should treat sourcing eligibility as a consequence of extension, not as a hardcoded source taxonomy.

The rule should be:

1. if a dimension is extended to a record type
2. and that record carries a value for the dimension
3. and policy allows that record type to source a given target
4. then that record is a valid sourcing participant

This means:

- extension creates source eligibility
- policy determines sourcing role
- sourcing role may be:
  - `Default`
  - `Preferred`
  - `Hard Source`

This is a better long-term model than maintaining a fixed list of “real” vs “secondary” source objects in code.

### Practical implication

The admin experience may still group source objects for readability:

- commercial sources
- accounting/control sources
- operational sources

But those are UX groupings, not architectural limitations.

## Record-First Extension Rule

Dimensions should extend to records, not to generic fields.

Good extension targets include:

- standard records
  - `Customer`
  - `Vendor`
  - `Item`
  - `GL Account`
  - `Subsidiary`
  - `Employee / User`
  - `Project`
  - `Subscription`
  - transaction headers
  - transaction lines
  - revenue and accounting objects
- `Custom Record`

Not recommended as direct dimension hosts:

- `Custom Body Field`
- `Custom Line Field`

Those field types may still participate in:

- validation conditions
- substitution rules
- derivation logic

But they should not usually be treated as first-class dimension host objects.

## Classification Guardrail

The platform should explicitly distinguish between four extension categories:

1. `Dimension`
2. `Custom Field`
3. `Integration Field`
4. `Fact / Measure`

This distinction is critical.

Without it, the system will drift into:

- too many dimensions
- weak reporting semantics
- accidental GL propagation of irrelevant fields
- hard-to-govern integrations

### 1. Dimension

A dimension is a governed classification axis.

It should be used when a value is meant to:

- be reusable across many records
- be sourced from upstream objects
- propagate through transactions
- potentially flow through billing, revenue, and GL
- participate in reporting and slicing
- use controlled values and policy

Examples:

- `Department`
- `Location`
- `Class`
- future:
  - channel
  - service line
  - business unit
  - customer segment

### 2. Custom Field

A custom field is flexible object-specific metadata.

It should be used when a value is:

- specific to one object family
- not necessarily governed across the platform
- not expected to source and propagate downstream automatically
- mainly needed for workflow, display, or local reporting context

Examples:

- special onboarding note
- contract exception flag
- implementation checklist status
- transaction-specific freeform metadata

### 3. Integration Field

An integration field is system-linkage metadata.

It should be used when a value exists primarily to:

- store an external system ID
- store sync state
- store source-system status
- store orchestration or pipeline references

Examples:

- Salesforce object ID
- Jira issue key
- BambooHR employee record ID
- Maestro run ID
- external last-sync timestamp

These fields may be important operationally, but they should not become dimensions by default.

### 4. Fact / Measure

A fact or measure is quantitative or event data used for analytics.

It should be used when a value is something to:

- sum
- count
- average
- trend
- forecast

Examples:

- usage quantity
- hours worked
- billed amount
- recognized revenue
- ticket volume
- SLA duration

Facts are often reported *by* dimensions, but they are not dimensions themselves.

## Practical Test for Classification

When deciding what something should be, ask:

### Is it a Dimension?

Use a dimension if the answer is mostly yes to:

- do we want this as a reusable reporting axis?
- should it be governed with controlled values?
- should it source from upstream records?
- should it propagate through transactions and maybe GL?

### Is it a Custom Field?

Use a custom field if the answer is mostly yes to:

- is this object-specific metadata?
- is it useful for workflow or UI but not necessarily for platform-wide propagation?
- does it not need a governed downstream policy model?

### Is it an Integration Field?

Use an integration field if the answer is mostly yes to:

- does this primarily identify or coordinate with an external system?
- is it more plumbing than business classification?

### Is it a Fact / Measure?

Use a fact or measure if the answer is mostly yes to:

- is this numeric/event data we want to aggregate?
- do we want to report it *by* dimensions rather than treat it as a dimension?

## Implications for Future Apps

This model should scale to later platform areas such as:

- Salesforce-like CRM behavior
- Jira / Maestro delivery and workflow behavior
- BambooHR-style people and organizational data

The rule should be:

- cross-platform classification concepts may become dimensions
- app-specific metadata should usually stay custom or integration fields
- operational and financial reporting should use facts/measures sliced by dimensions

### Example interpretation

Possible dimensions:

- customer segment
- channel
- implementation type
- service category

Likely custom or integration fields:

- Salesforce opportunity ID
- Jira issue key
- Maestro workflow run ID
- BambooHR profile reference

Likely facts/measures:

- usage quantity
- hours
- ticket count
- recognized revenue

## Product Positioning

`Configuration > Dimensions` should become a policy workspace with two levels:

1. `Dimension Catalog`
   - define and maintain dimensions themselves
2. `Dimension Policy`
   - define where they appear, how they source, when they are required, and how they propagate downstream

The first release of this experience should support seeded dimensions:

- `Department`
- `Location`
- `Class`

The model should already be ready for:

- added custom dimensions
- billing and subscription participation
- revenue and GL propagation
- account-specific enforcement
- validation/substitution rules
- hierarchy support

## UX Structure

Recommended top-level navigation inside `Configuration > Dimensions`:

1. `Catalog`
2. `Applicability`
3. `Sourcing`
4. `Enforcement`
5. `Propagation`
6. `Posting`
7. `Preview`

This can be implemented as:

- horizontal tabs
- or a left rail with a detail panel

The important point is the mental grouping, not the widget.

An optional later section may be added for:

8. `Rules`

That section would eventually handle:

- conditional validation
- substitution
- account-based enforcement
- posting-condition rules

## Screen 1: Dimension Catalog

### Purpose

Define the dimension itself.

### Audience

- finance admin
- ERP admin
- implementation admin

### Grid columns

- `Dimension`
- `Code`
- `Type`
  - `Seeded`
  - `Custom`
- `Status`
  - `Active`
  - `Inactive`
- `Value Source`
  - `Native Values`
  - `Custom Value Set`
  - `Mapped Source`
- `Header`
- `Line`
- `GL`
- `Project`
- `Subscription`
- `Last Modified`

### Detail drawer / page

#### Section: Identity

- `Dimension Label`
- `Dimension Code`
- `Description`
- `Seeded vs Custom`
- `Status`

#### Section: Value Model

- `Value Source`
- `Dimension Type`
  - `Financial`
  - `Operational`
- `Hierarchy Enabled`
- `Allow Inactive Values on Existing Transactions`
- `Allow Future Value Creation`

#### Section: Object Eligibility

- `Transaction Header Allowed`
- `Transaction Line Allowed`
- `GL Line Allowed`
- `Project Allowed`
- `Subscription Allowed`
- `Customer Allowed`
- `Vendor Allowed`
- `Item Allowed`
- later:
  - `Usage Event Allowed`

### Notes

This screen should answer:

- what dimension is this
- what kinds of records can carry it
- whether it is fundamentally a financial or operational dimension

It should not yet force the admin to think about transaction-by-transaction sourcing rules.

## Screen 2: Applicability

### Purpose

Show exactly where the dimension appears across the platform.

### Core idea

This is where the admin answers:

- where should users see this dimension
- on which document families
- at header, line, and/or GL level

### Primary layout

Use a matrix:

- rows = transaction or object family
- columns =
  - `Header`
  - `Line`
  - `GL`
  - `Project`
  - `Subscription`

### Suggested row groups

#### CRM chain

- `Opportunity`
- `Quote`
- `Sales Order`
- `Invoice`
- `Invoice Receipt`
- `Credit Memo`
- `Customer Refund`

#### P2P chain

- `Purchase Requisition`
- `Purchase Order`
- `Receipt`
- `Bill`
- `Bill Payment`
- `Bill Credit`
- `Vendor Refund`

#### RTR / accounting

- `Journal`
- `Intercompany Journal`
- `Open Item`
- `Clearing Document`
- `FX Revaluation Journal`
- later:
  - `Revenue Recognition Journal`

#### Revenue / billing plane

- `Customer`
- `Vendor`
- `Item`
- `Billing Account`
- `Billing Schedule`
- `Subscription Plan`
- `Subscription`
- `Usage Event`
- `Billable Charge`
- `Revenue Arrangement`
- `Revenue Element`
- `Actual Plan`
- `Forecast Plan`

### Per-cell options

- `Hidden`
- `Visible`
- `Visible + Locked`

### Why this matters

This screen should answer:

- where does the field even show up

before the admin has to think about:

- whether it is sourced
- whether it is required
- whether it posts to GL

## Screen 3: Sourcing

### Purpose

Define the sourcing hierarchy and override behavior.

### Core question

If this dimension is needed on a target object, where should it come from?

### Recommended layout

Choose dimension first, then target object, then target level:

- `Dimension = Department`
- `Target Object = Invoice`
- `Target Level = Line`

Then show the sourcing policy builder.

### Sourcing policy builder fields

- `Source Priority`
  - ordered list, drag-and-drop
- `Allow Header Inheritance`
- `Allow Source Document Header Inheritance`
- `Allow Source Document Line Inheritance`
- `Allow Project Inheritance`
- `Allow Subscription Inheritance`
- `Allow Item Inheritance`
- `Allow Customer/Vendor Inheritance`
- `Allow Manual Override`
- `Fail If Unresolved`

### Suggested source options

- `Manual Entry`
- `Default from Customer`
- `Default from Vendor`
- `Default from Item`
- `Current Transaction Header`
- `Current Transaction Line`
- `Source Transaction Header`
- `Source Transaction Line`
- `Item`
- `Customer`
- `Vendor`
- `Project`
- `Subscription`
- `Subscription Plan`
- `Usage Event`
- `Billable Charge`
- `Revenue Arrangement`
- `Revenue Element`
- `Default from Subsidiary`

### Sourcing mode options

For each source in the priority list, the admin should be able to classify it as:

- `Default`
- `Preferred`
- `Hard Source`

This will let the platform distinguish:

- "use this if available"
from
- "this is the authoritative value unless a policy exception exists"

### Special design rule

The UI should show the source chain in business language, not internal table language.

Good:

- `Source Quote Line`
- `Subscription`
- `Item`

Bad:

- `sourceTransactionLine`
- `dimensionAssignment`

## Screen 4: Enforcement

### Purpose

Define when the dimension is optional, required, or required only at later lifecycle stages.

### Core question

When is it acceptable for this dimension to be blank?

### Recommended matrix

Rows:

- transaction/object family
- level:
  - `Header`
  - `Line`
  - `GL`

Columns:

- `Not Required`
- `Required on Save`
- `Required on Post`
- `Required on Revenue Create`
- `Required on Billing Create`
- `Locked in Customize`
- `Posting-Critical`
- `Reporting-Only`

### Example behavior

A dimension might be:

- optional on `Opportunity`
- required on `Invoice Line`
- required on `Revenue Element`
- required on `GL Line`
- posting-critical on revenue and GL, but reporting-only upstream

### Important rule

This screen should distinguish:

- visible
- sourced
- required
- posting-critical
- reporting-only

Those are different concepts and should not be merged into one toggle.

## Screen 5: Propagation

### Purpose

Define what downstream objects inherit the dimension once it exists upstream.

### Core question

If the dimension is on this source object, where must it continue to flow?

### Recommended layout

Use a propagation map by chain.

#### CRM chain

`Opportunity -> Quote -> Sales Order -> Invoice -> Invoice Receipt / Credit Memo / Customer Refund`

#### P2P chain

`Purchase Requisition -> Purchase Order -> Receipt -> Bill -> Bill Payment / Bill Credit / Vendor Refund`

#### Billing and revenue chain

`Subscription / Usage Event -> Billable Charge -> Invoice Line -> Revenue Arrangement -> Revenue Element -> Actual Plan / Forecast Plan -> Revenue Recognition Journal`

#### Accounting chain

`Transaction Line -> GL Posting -> Open Item -> Clearing Document`

### Per-link controls

- `Inherit Automatically`
- `Override Allowed`
- `Header to Header`
- `Line to Line`
- `Header to Line Fallback`
- `Drop if Blank`
- `Fail if Missing`

### Master-data-first sourcing rule

The propagation view should make clear that dimensions often begin on:

- `Customer`
- `Vendor`
- `Item`

and are then sourced into:

- projects
- subscriptions
- transactions
- revenue objects
- GL

This upstream-to-downstream chain should be visible in the propagation map.

### Critical downstream objects to support

Do not stop at invoice.

The screen must anticipate:

- `Revenue Arrangement`
- `Actual Plan`
- `Forecast Plan`
- `Revenue Recognition Journal`

because that is where dimension fidelity often gets lost.

## Screen 6: Posting

### Purpose

Control GL behavior.

### Core question

Once this dimension reaches the posting layer, how should accounting preserve it?

### Fields

- `Post to GL`
- `Required on GL Lines`
- `Split GL by Dimension Combination`
- `Allow Summary Posting Without Split`
- `Carry to Open Items`
- `Carry to Clearing Documents`
- `Carry to Revenue Recognition Journals`
- `Carry to FX Revaluation Journals`
- `Account-Specific Enforcement Enabled`
- `Allowed Account Scope`
- `Required Account Scope`

### Important rule

If `Post to GL = true` and `Require GL Split = true`, the posting engine must not summarize away distinct dimension combinations.

That means this page is not cosmetic.

It is defining accounting behavior.

This section should also clearly distinguish:

- dimensions that are merely visible in reporting
- dimensions that are required for accounting integrity

## Screen 7: Preview

### Purpose

Let the admin see the policy result before it causes live transaction surprises.

### Recommended preview modes

1. `Transaction Preview`
   - choose transaction family
   - see header fields, line fields, required fields, sourced fields

2. `Workflow Preview`
   - choose chain:
     - CRM
     - P2P
     - Billing/Revenue
   - see where the dimension will flow next

3. `Posting Preview`
   - see whether the dimension will:
     - hit GL
     - force split
     - carry to open items
     - carry to clearing
     - carry to rev rec

4. `Source Preview`
   - choose source object:
     - customer
     - vendor
     - item
     - project
     - subscription
   - see how the dimension would flow into a target transaction

### Why it matters

Admins should not have to test policy by editing live invoices.

## Recommended Delivery Phases

### Phase A: Restructure current page into business sections

Goal:

- keep existing control-plane data model
- reorganize the admin UI into:
  - `Catalog`
  - `Applicability`
  - `Sourcing`
  - `Enforcement`
  - `Propagation`
  - `Posting`

### Phase B: Add transaction-family matrix views

Goal:

- make applicability, enforcement, and propagation visible by workflow family

### Phase C: Add preview and impact simulation

Goal:

- let admins see consequences before saving policy

### Phase D: Add custom dimension creation

Goal:

- let admins create the fourth and later dimensions using the same framework as `Department`, `Location`, and `Class`

## What the Current Page Already Maps To

The current low-level page can be thought of as this backend mapping:

- `Identity`
  - already partially present
- `Object Eligibility`
  - already present
- `Applicability`
  - already present, but technical
- `Sourcing`
  - already present, but technical
- `Posting`
  - partially present

What is missing is mainly:

- business grouping
- workflow-family views
- propagation views
- preview
- revenue/billing downstream thinking in the UI
- financial vs operational classification
- default vs hard-source behavior
- account-specific enforcement thinking
- validation/substitution thinking
- hierarchy/reporting-tree thinking

So the right move is not to throw away the current control plane.

It is to put the right admin experience on top of it.

## Immediate Product Recommendation

Before extending more runtime logic, the next admin UX build should:

1. keep the existing control-plane schema
2. refactor `Configuration > Dimensions` into the six policy sections above
3. add workflow-family matrix views
4. add explicit master-data source treatment for:
   - `Customer`
   - `Vendor`
   - `Item`
5. add downstream propagation and posting sections
6. add preview

That will make the page match the business problem instead of exposing only the underlying technical model.
