# Phase 0 Certified Package Distribution Workflow

## Purpose

This document defines the canonical workflow and data model expectations for:

- certified package distribution
- controlled delivery of board, management, close, and recurring-revenue packages
- audience selection and delivery channels
- acknowledgement and access tracking
- distribution audit trail and supersession handling

It builds on:

- [phase-0-package-export-rendering-strategy.md](./phase-0-package-export-rendering-strategy.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-presentation-theme-branding-model.md](./phase-0-presentation-theme-branding-model.md)
- [phase-0-run-integration-schema.md](./phase-0-run-integration-schema.md)

The goal is to make package delivery a governed in-app workflow rather than an informal email/file-sharing process.

## Design Goals

1. Support controlled distribution of certified and preliminary packages.
2. Support multiple delivery channels without losing governance.
3. Preserve a full audit trail of who received what, when, and under which certification state.
4. Support supersession when a previously distributed package is reopened or replaced.
5. Support acknowledgement, access tracking, and distribution exceptions.
6. Keep distribution native to the app, even if external channels are also used.

## Core Rule

Certified package delivery should be governed as part of the reporting lifecycle.

Distributing a package is not just exporting a file. It is:

- selecting a certified or governed output
- choosing the intended audience
- controlling the delivery channel
- preserving distribution lineage and acknowledgements

## Scope

This model applies to:

- board packages
- management packages
- close packages
- recurring-revenue / SaaS packages
- treasury / cash packages
- other governed report-package families

## Canonical Concepts

## 1. Distribution Boundary

The platform should distinguish:

- package generation
- certification
- release for distribution
- actual distribution events
- supersession or revoke/replace events

These are related but not identical lifecycle steps.

## 2. Delivery Modes

The platform should support delivery through one or more governed channels such as:

- in-app secure access
- controlled email delivery
- downloadable package link
- scheduled package distribution
- external system handoff where policy allows

### Rule

Even if external delivery is used, the system of record for distribution history should remain in-app.

## Canonical Table Families

## 1. `PackageDistributionDefinition`

### Purpose

Defines one reusable distribution policy or template.

Examples:

- monthly_board_distribution
- executive_management_distribution
- close_package_distribution

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `distributionType`
- `targetPackageType`
- `defaultChannelJson`
- `defaultAudienceJson`
- `approvalRequired`
- `createdAt`
- `updatedAt`

### Suggested distribution types

- board
- management
- close
- recurring_revenue
- treasury

## 2. `PackageDistributionInstance`

### Purpose

Represents one governed distribution event for a specific package output.

### Recommended canonical fields

- `id`
- `distributionNumber`
- `packageDistributionDefinitionId`
- `status`
- `targetPackageId`
- `targetSnapshotId`
- `targetCertificationId`
- `accountingPeriodId`
- `asOfDate`
- `channelJson`
- `audienceJson`
- `releaseAt`
- `completedAt`
- `supersededByDistributionId`
- `message`
- `createdById`
- `createdAt`
- `updatedAt`

### Suggested statuses

- draft
- pending_approval
- approved
- released
- distributed
- partially_delivered
- failed
- superseded
- revoked

## 3. `PackageRecipient`

### Purpose

Represents one intended recipient or recipient group for a package distribution.

### Recommended canonical fields

- `id`
- `packageDistributionInstanceId`
- `recipientType`
- `recipientKey`
- `deliveryChannel`
- `status`
- `deliveredAt`
- `openedAt`
- `acknowledgedAt`
- `message`
- `createdAt`
- `updatedAt`

### Suggested recipient types

- user
- role
- group
- external_contact

### Suggested statuses

- pending
- delivered
- failed
- opened
- acknowledged
- revoked

## 4. `PackageAcknowledgement`

### Purpose

Represents explicit acknowledgement, review, or certification receipt by a recipient.

### Recommended canonical fields

- `id`
- `packageDistributionInstanceId`
- `packageRecipientId`
- `acknowledgementType`
- `status`
- `actorId`
- `actedAt`
- `note`
- `createdAt`
- `updatedAt`

### Suggested acknowledgement types

- receipt
- review_complete
- board_acknowledgement
- management_acknowledgement
- override

## 5. `PackageDistributionEvent`

### Purpose

Captures the detailed event history of a distribution workflow.

### Recommended canonical fields

- `id`
- `packageDistributionInstanceId`
- `eventType`
- `status`
- `actorId`
- `eventAt`
- `detailsJson`
- `createdAt`

### Suggested event types

- created
- approved
- released
- delivered
- opened
- acknowledged
- failed
- revoked
- superseded

## 6. `PackageDistributionException`

### Purpose

Represents one issue blocking or affecting package delivery.

### Recommended canonical fields

- `id`
- `packageDistributionInstanceId`
- `packageRecipientId`
- `severity`
- `status`
- `exceptionType`
- `message`
- `detailsJson`
- `assignedToId`
- `resolvedAt`
- `resolvedById`
- `resolutionNote`
- `createdAt`
- `updatedAt`

### Suggested exception types

- missing_certification
- missing_snapshot
- delivery_failure
- revoked_output
- stale_package
- recipient_resolution_failure
- approval_missing

## Governance Principles

## Certified Package Release Principle

Certified packages should normally require an explicit release step before distribution.

### Expectations

- certification alone does not automatically imply broad distribution
- release can be controlled by role/policy
- release should preserve certification lineage

## Supersession Principle

If a package is reopened or replaced, previously distributed outputs should not silently remain “current.”

### Expectations

- superseded distributions should remain in history
- recipients should be able to see that a newer package replaced a prior one
- distribution history should preserve the replaced and replacing package lineage

## Audience Governance Principle

Package delivery should be governed by audience definitions, not ad hoc forwarding.

### Expectations

- board audiences
- executive audiences
- close/operator audiences
- finance management audiences

should be definable and auditable through in-app controls.

## In-App Native Access Principle

The app should support secure in-app access to distributed packages as a primary channel.

### Why

This preserves:

- access control
- open/read tracking
- supersession visibility
- certified/preliminary context

External delivery may still exist, but should not be the only authoritative access path.

## Relationship to Certification and Reopen

Distribution should be directly tied to reporting certification.

### Expectations

- distributed certified packages reference the certification record
- reopening or superseding a package should affect distribution state
- preliminary distributions should be clearly marked as such

## Relationship to AI

AI may assist with:

- distribution summaries
- audience recommendations
- acknowledgement/chase prioritization
- exception triage

But AI should not bypass governed release and certification controls.

## Relationship to Runs and Integrations

Distribution can be executed through governed runs and channel integrations.

Examples:

- scheduled monthly package release
- controlled email delivery run
- secure-link generation run

These should tie into the run/integration framework rather than being hidden side effects.

## Reporting Expectations

The platform should support reporting on:

- distribution completion rates
- failed deliveries
- opened vs unopened packages
- acknowledgement completion
- superseded distribution counts
- time from certification to release/distribution

## Frontend Contract

The shared frontend should expose:

- distribution setup and audience selection
- package release actions
- recipient status tracking
- acknowledgement status
- distribution exception queue
- supersession/revocation visibility

These should be native in-app surfaces tied to package lifecycle pages.

## Performance Expectations

The distribution layer should support:

- many recipients
- many package versions
- repeated scheduled distributions
- role/group-based audience expansion
- historical audit lookup without losing performance

## Immediate Next Tasks

1. define operator permission model for reporting refresh, certification, release, and distribution actions
2. define monitoring alert/notification strategy for reporting and package workflows
3. define in-app secure package access UX and supersession messaging
4. define package distribution retention and archival rules
