## Surfaces

- `./CLAUDE.md` — MIGRATE (root instruction file; content is a single `@AGENTS.md` import line)
- `./AGENTS.md` — MIGRATE (delegated-to instruction surface; contains real content: Next.js agent-rules block)
- `.claude/settings.json` — none
- `.claude/settings.local.json` — none
- `.claude/commands` — none (directory does not exist)
- `.claude/agents` — none (directory does not exist)
- `.claude/skills` — none (directory does not exist)
- `docs/guardrails/` — none pre-existing (directory created fresh for this migration)
- No hooks found (no settings files exist to contain them).
- `@AGENTS.md` grep hit in CLAUDE.md line 1 — this import line MIGRATES with its containing file (CLAUDE.md) per M6b; AGENTS.md itself is a separate instruction surface carrying real content, not just an import target, so its content is inventoried in Phase 3 too.
- No nested CLAUDE.md files found elsewhere in the repo tree (excluding node_modules).
- User-global `~/.claude/CLAUDE.md` — read-only context per procedure; not touched, not copied from.

## Snapshot

- `CLAUDE.md.pre-migration-20260705-2025` — 1 line, hash `43c994c2d3617f947bcb5adf1933e21dabe46bb5`
- `AGENTS.md.pre-migration-20260705-2025` — 5 lines, hash `8bd0e39085d5260e7f8faffcad2fdc45e10aef33`
- Committed as `088ff99 chore: pre-migration snapshot (CLAUDE.md, AGENTS.md)` (repo tree was clean pre-migration; only migration artifacts are new).
- AGENTS.md is treated as an imported instruction surface (same handling the procedure gives nested CLAUDE.md files): it stays in place, is never edited, and only gets the Phase 4 token scan. Its content is therefore NOT numbered into the Phase 3 disposition table below — only the CLAUDE.md snapshot's own lines are, since AGENTS.md's content remains reachable unchanged via the `@AGENTS.md` import line that is carried forward verbatim.

## Phase 3 — disposition table

Numbered original lines (CLAUDE.md snapshot only, per the AGENTS.md handling above): 1
Table rows: 1
Equal: YES

| # | original text (verbatim) | disposition | destination | note |
|---|---|---|---|---|
| 001 | @AGENTS.md | KEPT-VERBATIM | CLAUDE.md ## Project | import line; imports processed only inside CLAUDE.md per M6b, never moved to docs/guardrails/* |

## CONFLICTS

None found. Token scan run against both the CLAUDE.md snapshot and AGENTS.md (treated as an imported/nested surface per the note above):

```
$ grep -inE "\b(must|never|always|don'?t|do not|only|forbidden|not)\b" CLAUDE.md.pre-migration-20260705-2025
(no output)

$ grep -inE "\b(must|never|always|don'?t|do not|only|forbidden|not)\b" AGENTS.md.pre-migration-20260705-2025
2:# This is NOT the Next.js you know
```

The one AGENTS.md hit ("This is NOT the Next.js you know") is a project FACT about framework version drift, not a behavioral/process rule — checked against every kit doc (`grep -rin "next.js\|breaking change\|deprecat"` across kit CLAUDE.md + docs/guardrails/*.md) and found no overlapping process rule. No conflict, no FLAG-to-user needed. AGENTS.md is left completely untouched.

## Phase 5 — checkpoint (self-review, autonomous dispatch)

Dispatched directly by the repo owner with standing commit+push autonomy for this rollout; no interactive user is present to reply to a chat checkpoint, so this phase is a documented self-review instead of a wait-for-reply gate, per the task's explicit instruction to "self-review Phase 3's disposition log critically before Phase 6."

- Disposition counts: KEPT-VERBATIM: 1. MOVED: 0. MERGED: 0. SUPERSEDED-BY: 0. UNSORTED: 0. DROPPED: 0. CONFLICT-PENDING: 0.
- DROPPED lines: none.
- CONFLICTS: none found (see above).
- Kit-doc name collisions: none (`docs/guardrails/` was empty before this migration — see Surfaces).
- Proposed `## Project` content for the composed CLAUDE.md: the single carried line `@AGENTS.md`, plus the workspace-wide push-authority override required by this task's Phase 4 instructions (documented separately below since it doesn't originate from the old CLAUDE.md — it's a standing ruling this rollout applies uniformly).
- Self-review conclusion: nothing ambiguous or risky was found to flag. This is a genuinely thin prototype instruction surface (1 real content line total across both files); proceeding to Phase 6.

## Kit-doc collisions

All 8 kit docs installed fresh (docs/guardrails/ was empty pre-migration):
- CODE.md: installed
- DEBUG.md: installed
- EFFICIENCY.md: installed
- PLAN.md: installed
- SESSION.md: installed
- TRAPS.md: installed
- VERIFY.md: installed
- _FORMAT.md: installed

Hash verification (repo copy vs kit source, `git hash-object --no-filters`):
```
CODE.md: 65c2542895a9c9b13175985702cbd2a53df38b22 65c2542895a9c9b13175985702cbd2a53df38b22 MATCH
DEBUG.md: e3edc7baba5eefe0e73f4f08a6d6840e1ec38a33 e3edc7baba5eefe0e73f4f08a6d6840e1ec38a33 MATCH
EFFICIENCY.md: ca31f598e5b4d2b2925f059d7b58e256a7021a38 ca31f598e5b4d2b2925f059d7b58e256a7021a38 MATCH
PLAN.md: ae17b8e12e047d890a4d3ea7205d5a74801e2047 ae17b8e12e047d890a4d3ea7205d5a74801e2047 MATCH
SESSION.md: 9feacdfadfbf24b20c57c612bccdd07c4f6bc65b 9feacdfadfbf24b20c57c612bccdd07c4f6bc65b MATCH
TRAPS.md: 6ac22082de76ba5d51a8c36a7041f6d8809d14d7 6ac22082de76ba5d51a8c36a7041f6d8809d14d7 MATCH
VERIFY.md: d13f688ec24f4e2d3f563783388d8a4b1e60d591 d13f688ec24f4e2d3f563783388d8a4b1e60d591 MATCH
_FORMAT.md: 831d91e4f7adfea1ee574f5abd9a880c463b6672 831d91e4f7adfea1ee574f5abd9a880c463b6672 MATCH
```

## Deliberate kit-marker exception (task-directed, not a self-authored deviation)

M6b normally forbids inserting/deleting/rewording any line inside the `<!-- BEGIN/END KIT FOOTER -->` markers. The dispatching task explicitly required one documented exception: a standing workspace-wide ruling (Jon, 2026-07-05) that supersedes the kit's `git push` hard stop for every repo in this rollout, inserted directly beneath the `## Hard stops` heading inside the KIT FOOTER zone, per the task's explicit instruction. This is the one line inside kit markers that is not a byte-identical copy of the kit source — flagged here so a future kit upgrade (U2, wholesale block swap) knows to re-add it after swapping in the new FOOTER block.
