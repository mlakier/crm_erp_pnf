# Phase 0 Reporting and Close Operator Permission Model

## Purpose

This document defines the canonical permission and control model for:

- reporting refresh operations
- reporting certification and reopen workflows
- package release and distribution
- close-related operator actions
- AI-assisted review and execution boundaries for reporting/close workflows

It builds on:

- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-certified-package-distribution-workflow.md](./phase-0-certified-package-distribution-workflow.md)
- [phase-0-summary-refresh-monitoring-operator-surfaces.md](./phase-0-summary-refresh-monitoring-operator-surfaces.md)
- [phase-0-close-checklist-schema.md](./phase-0-close-checklist-schema.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)

The goal is to define explicit operator rights and approval boundaries for the reporting and close control layer before those workflows are implemented.

## Design Goals

1. Make operator rights explicit for reporting and close governance actions.
2. Separate read, operate, certify, reopen, and distribute permissions clearly.
3. Support role-based and process-step-based control without relying on broad superuser access.
4. Support stronger controls for certified outputs and close-sensitive workflows.
5. Support AI-assisted workflows without weakening approval and operator boundaries.

## Core Rule

No reporting or close governance action should rely on implicit admin power alone.

The platform should explicitly govern who can:

- run
- rerun
- repair
- certify
- reopen
- release
- distribute
- override

for reporting and close artifacts.

## Permission Domains

The permission model should distinguish at least these domains:

- reporting refresh operations
- reporting certification
- reporting reopen/supersession
- package release
- package distribution
- close task execution
- close approval/certification
- AI-assisted action approval/override

## Canonical Capability Families

## 1. Refresh Operation Permissions

Examples:

- view refresh status
- run refresh
- rerun refresh
- scoped repair refresh
- resume failed refresh
- resolve refresh exception

### Control expectation

The ability to view refresh results should be broader than the ability to rerun or repair them.

## 2. Reporting Certification Permissions

Examples:

- mark report/package as review-ready
- certify reporting artifact
- approve or reject certification
- supersede prior certified artifact
- reopen certified artifact

### Control expectation

Certification and reopen actions should usually require stronger permissions than ordinary reporting access.

## 3. Package Release and Distribution Permissions

Examples:

- prepare package for release
- approve package release
- distribute package
- revoke distribution
- view recipient and acknowledgement status

### Control expectation

Release and distribution should be separable where governance requires it.

## 4. Close Checklist Permissions

Examples:

- execute close task
- approve close task
- certify close instance
- reopen close task / close instance
- attach or review close evidence

### Control expectation

Close workflows should allow granular separation of:

- preparer
- reviewer
- certifier

## 5. AI-Assisted Operator Permissions

Examples:

- view AI suggestions
- accept AI suggestion
- reject AI suggestion
- allow AI execution with approval
- override AI-produced result
- disable AI for a process step where authorized

### Control expectation

Users who can consume AI output should not automatically be able to authorize AI execution.

## Suggested Canonical Permission Matrix

The platform should support operator actions such as:

- `reporting.refresh.view`
- `reporting.refresh.run`
- `reporting.refresh.rerun`
- `reporting.refresh.repair`
- `reporting.refresh.exception.resolve`

- `reporting.certification.view`
- `reporting.certification.approve`
- `reporting.certification.reject`
- `reporting.certification.reopen`
- `reporting.certification.supersede`

- `package.release.prepare`
- `package.release.approve`
- `package.distribution.execute`
- `package.distribution.revoke`
- `package.distribution.audit.view`

- `close.task.execute`
- `close.task.review`
- `close.task.approve`
- `close.instance.certify`
- `close.instance.reopen`

- `ai.suggestion.view`
- `ai.suggestion.accept`
- `ai.suggestion.reject`
- `ai.execution.approve`
- `ai.execution.override`
- `ai.scope.manage`

These do not need to be final permission codes, but the platform should support a comparable level of specificity.

## Separation of Duties Principle

The model should support stronger separation of duties for high-control workflows.

Examples:

- person who prepares a package may not be the person who certifies it
- person who runs a refresh may not be the same person who certifies the resulting package
- person who accepts an AI suggestion may not always be the person allowed to approve AI execution

## Scope Principle

Permissions should be scoping-aware where appropriate.

Examples:

- by subsidiary
- by package family
- by report family
- by accounting period
- by close type
- by environment

This helps avoid overly broad operator access.

## Certified Artifact Principle

Certified outputs should require elevated controls.

Examples:

- reopening a certified board package
- superseding a certified financial package
- revoking a distributed certified package

These actions should be auditable and typically require higher-order permissions or approvals.

## Exception Resolution Principle

Exception visibility and exception resolution should be separately controllable.

Examples:

- user can view refresh exceptions but cannot clear them
- user can review reconciliation exceptions but cannot certify the close

## AI Control Principle

AI operator permissions should align with the AI control model and respect:

- suggestion vs execution distinction
- approval modes
- override tracking
- role and process-step scoping

## Relationship to Distribution

Distribution permissions should align with audience and sensitivity.

### Expectations

- ability to generate a package does not imply ability to distribute it
- ability to view a package does not imply ability to revoke or supersede distribution
- distribution audit visibility may be broader than distribution execution rights

## Relationship to Monitoring Surfaces

Monitoring surfaces should reflect permission boundaries.

### Examples

- some users can view stale status only
- some users can rerun refreshes
- some users can reopen certified outputs
- some users can only view operator audit history

## Governance and Audit Principle

Every protected operator action should be auditable with:

- actor
- action
- target
- timestamp
- reason/note where required
- result status

## Frontend Contract

The shared frontend should support permission-aware behaviors such as:

- enable/disable of action buttons
- approval routing visibility
- protected confirmation flows
- reason capture for reopen/revoke/override actions
- read-only vs operator vs certifier views

These should be implemented consistently across reporting and close surfaces.

## Immediate Next Tasks

1. define monitoring alert/notification strategy
2. define in-app secure package access UX and supersession messaging
3. define reporting/close permission templates by role family
4. define operator action audit log model if not already covered sufficiently elsewhere
