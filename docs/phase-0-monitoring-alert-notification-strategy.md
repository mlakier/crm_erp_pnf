# Phase 0 Monitoring Alert and Notification Strategy

## Purpose

This document defines the canonical alerting and notification strategy for:

- refresh failures and stale reporting states
- close blockers and exceptions
- certification and reopen events
- package distribution issues
- reconciliation exceptions
- AI-assisted operator guidance where policy allows

It builds on:

- [phase-0-summary-refresh-monitoring-operator-surfaces.md](./phase-0-summary-refresh-monitoring-operator-surfaces.md)
- [phase-0-close-checklist-schema.md](./phase-0-close-checklist-schema.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-certified-package-distribution-workflow.md](./phase-0-certified-package-distribution-workflow.md)
- [phase-0-reporting-operator-permission-model.md](./phase-0-reporting-operator-permission-model.md)
- [phase-0-ai-capability-schema.md](./phase-0-ai-capability-schema.md)

The goal is to ensure important reporting, close, and control events are surfaced to the right users at the right time through governed in-app and outbound notifications.

## Design Goals

1. Surface material failures, blockers, stale conditions, and governance events quickly.
2. Distinguish informational, warning, and action-required notifications clearly.
3. Support in-app notification first, with optional external delivery where policy allows.
4. Align alerts with operator permissions and audience governance.
5. Support high-volume operations without overwhelming users with noise.

## Core Rule

Material control events should not rely on users discovering issues manually.

The platform should actively surface important events through governed alerts and notifications.

## Canonical Alert Families

The platform should support at least:

- refresh failure alerts
- stale certified output alerts
- close blocker alerts
- reconciliation exception alerts
- certification pending / overdue alerts
- package distribution failure alerts
- supersession / reopen alerts
- AI exception / review-required alerts

## Canonical Concepts

## 1. `NotificationDefinition`

### Purpose

Defines one governed notification policy or alert type.

### Recommended canonical fields

- `id`
- `code`
- `name`
- `status`
- `notificationType`
- `severity`
- `defaultAudienceJson`
- `channelPolicyJson`
- `createdAt`
- `updatedAt`

## 2. `NotificationInstance`

### Purpose

Represents one raised notification or alert event.

### Recommended canonical fields

- `id`
- `notificationNumber`
- `notificationDefinitionId`
- `status`
- `targetType`
- `targetId`
- `severity`
- `message`
- `detailsJson`
- `raisedAt`
- `resolvedAt`
- `resolvedById`
- `createdAt`
- `updatedAt`

### Suggested statuses

- open
- acknowledged
- resolved
- suppressed
- superseded

## 3. `NotificationRecipient`

### Purpose

Represents one user, role, or audience target for a notification.

### Recommended canonical fields

- `id`
- `notificationInstanceId`
- `recipientType`
- `recipientKey`
- `deliveryChannel`
- `status`
- `deliveredAt`
- `openedAt`
- `acknowledgedAt`
- `createdAt`
- `updatedAt`

## Alerting Principles

## In-App First Principle

The primary alert surface should be in-app so the system of record remains native to the platform.

External channels such as email may supplement, but should not replace, in-app visibility for governed control events.

## Severity Principle

Alerts should be severity-aware.

Suggested tiers:

- info
- warning
- action_required
- blocking

## Noise Control Principle

The platform should support:

- deduplication
- suppression windows
- escalation timing
- digest vs immediate modes

to avoid alert fatigue.

## Permission-Aware Delivery Principle

Alerts should only be delivered to users or groups allowed to act on or review the underlying issue.

## AI Assistance Principle

AI may assist with:

- summarizing large exception sets
- clustering similar alerts
- proposing likely owners
- drafting operator guidance

But AI should not silently suppress material governance alerts without explicit policy.

## Immediate Next Tasks

1. define in-app secure package access UX and supersession messaging
2. define report/package comparison and diff UX
3. define reporting/close role-family permission templates
4. define operator action audit log model if needed as a separate canonical family

