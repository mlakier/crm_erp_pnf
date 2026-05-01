# Phase 0 Reporting and Close Role-Family Permission Templates

## Purpose

This document defines the recommended role-family templates for the reporting, close, certification, and package-governance layer.

It builds on:

- [phase-0-reporting-operator-permission-model.md](./phase-0-reporting-operator-permission-model.md)
- [phase-0-close-checklist-schema.md](./phase-0-close-checklist-schema.md)
- [phase-0-certified-package-distribution-workflow.md](./phase-0-certified-package-distribution-workflow.md)

The goal is to provide a practical default control model before tenant-specific role tuning begins.

## Design Goals

1. Provide sane default role families.
2. Separate preparation, operation, certification, and distribution responsibilities.
3. Support stronger control for board/close/certified outputs.

## Suggested Role Families

## 1. Reporting Viewer

Can:

- view authorized reports
- view authorized dashboards
- view authorized packages

Cannot:

- refresh
- certify
- reopen
- distribute

## 2. Reporting Operator

Can:

- view refresh status
- run refresh
- rerun refresh
- resolve non-certified refresh exceptions
- generate snapshots where permitted

Cannot:

- certify official outputs by default
- reopen certified artifacts by default

## 3. Package Preparer

Can:

- prepare package compositions
- preview package outputs
- stage package release requests

Cannot:

- certify by default
- final-release by default

## 4. Certifier

Can:

- review
- approve/reject certification
- certify close/report/package outputs

Should have stronger control boundaries than ordinary operators.

## 5. Reopen Authority

Can:

- reopen certified outputs
- supersede prior certified outputs
- revoke governed distributions where policy allows

This should usually be limited and auditable.

## 6. Distribution Manager

Can:

- release certified packages
- distribute packages
- monitor acknowledgements
- handle distribution exceptions

## 7. Close Operator

Can:

- execute close tasks
- attach evidence
- resolve assigned close exceptions

## 8. Close Reviewer / Close Certifier

Can:

- approve close tasks
- certify close instances
- review blocker resolution

## 9. AI Governance Operator

Can:

- view AI suggestions and execution history
- approve governed AI execution where allowed
- override or disable AI in permitted scopes

## Template Principles

- viewers should not become operators by accident
- preparers should not automatically be certifiers
- certifiers should not automatically be reopen authorities
- distribution should remain separable from preparation and certification

## Immediate Next Tasks

1. decide whether a separate operator action audit log doc is needed
2. define package archival/retention model if still needed in Phase 0
