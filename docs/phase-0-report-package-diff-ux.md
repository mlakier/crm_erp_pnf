# Phase 0 Report and Package Comparison / Diff UX

## Purpose

This document defines the canonical comparison and diff experience for:

- report snapshots
- package versions
- certified vs reopened outputs
- preliminary vs certified outputs

It builds on:

- [phase-0-certified-reporting-lock-reopen-rules.md](./phase-0-certified-reporting-lock-reopen-rules.md)
- [phase-0-package-export-rendering-strategy.md](./phase-0-package-export-rendering-strategy.md)
- [phase-0-reporting-metadata-schema.md](./phase-0-reporting-metadata-schema.md)

The goal is to make changes between reporting outputs understandable, auditable, and easy to review.

## Design Goals

1. Support clear comparison between two governed outputs.
2. Highlight numeric, structural, and narrative differences.
3. Support certification/reopen review workflows.
4. Support both report-level and package-level comparison.

## Core Rule

When a report or package changes after prior review or certification, the platform should make the difference visible without forcing users to reconstruct it manually.

## Comparison Modes

The platform should support:

- period vs prior period
- preliminary vs certified
- certified vs superseded
- current vs reopened
- package version A vs package version B

## Diff Principles

## Numeric Diff

Show:

- absolute change
- percentage change
- materiality-aware highlighting where policy allows

## Structural Diff

Show when:

- a section was added or removed
- a KPI/widget changed
- a package section order changed

## Narrative Diff

Show when:

- commentary changed
- AI-assisted narrative changed
- signoff/certification notes changed

## Required Shared Surfaces

- compare action from report/package view
- side-by-side compare mode
- focused change summary panel
- drill-through from changed number to supporting detail

## Immediate Next Tasks

1. define role-family permission templates
2. define operator action audit log family if needed separately

