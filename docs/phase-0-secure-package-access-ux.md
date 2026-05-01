# Phase 0 In-App Secure Package Access and Supersession UX

## Purpose

This document defines the canonical user experience for:

- secure in-app package access
- recipient-facing package views
- supersession messaging
- certified vs preliminary package visibility
- acknowledgement and read-state UX

It builds on:

- [phase-0-certified-package-distribution-workflow.md](./phase-0-certified-package-distribution-workflow.md)
- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-package-export-rendering-strategy.md](./phase-0-package-export-rendering-strategy.md)

The goal is to make in-app package consumption secure, clear, and governance-aware.

## Design Goals

1. Provide a primary in-app package access experience.
2. Make certification state obvious.
3. Make superseded and reopened states unmistakable.
4. Preserve access control and acknowledgement tracking without confusing recipients.
5. Support easy comparison between current and prior package versions.

## Core Rule

Recipients should not need to guess whether the package they are viewing is current, certified, preliminary, or superseded.

## UX Principles

## Certified Status Visibility

Every package view should clearly show:

- draft
- preliminary
- certified
- reopened
- superseded

using consistent shared status treatment.

## Supersession Messaging Principle

If a viewed package has been superseded, the user should see:

- that it is no longer current
- which package replaced it
- when it was superseded
- why it was superseded when appropriate

## Secure Access Principle

Package access should be governed by:

- package distribution audience
- role/permission model
- certification/distribution state

and should not rely on uncontrolled file sharing.

## Acknowledgement UX Principle

If acknowledgement is required, the user experience should support:

- view package
- acknowledge receipt/review
- see whether acknowledgement is complete
- see who else has acknowledged where policy allows

## Required Shared Surfaces

- package inbox / list
- package detail / reader view
- version / supersession panel
- acknowledgement panel
- compare prior version action

## Immediate Next Tasks

1. define report/package comparison and diff UX
2. define role-family permission templates
3. define package archival and retention UX

