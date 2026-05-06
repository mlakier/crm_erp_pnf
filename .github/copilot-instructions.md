# Copilot Code Review Instructions — crm_erp_pnf

## Project
CRM / ERP project repository.

## Stack
- Node.js
- TypeScript
- Next.js
- React
- SQL

## Review Priorities
1. **Security** — XSS, unsafe token/client-storage handling, and missing client/server auth gating
2. **Correctness** — logic errors, null/undefined handling, edge cases, race conditions, and tenant-scope mistakes
3. **Performance** — N+1 queries, missing indexes, inefficient joins, and unbounded background scans
4. **Error handling** — unhandled rejections/exceptions, missing retries/backoff, silent failures, and poor observability on failure paths

## Flag Immediately
- Secrets or credentials committed to code
- Missing input validation / sanitisation
- Auth/permission checks bypassed or missing
- Client-side secrets, insecure token storage, or privileged actions enforced only in the UI
- Unparameterized queries, SSRF/proxy abuse, or unsafe file upload/deserialization paths

## Do Not Comment On
- Code style, formatting, naming (handled by linter/formatter)
- Generated files (`dist/`, `build/`, `node_modules/`, `*.min.js`, auto-generated migrations)
- Trivial WIP markers or commented-out code with obvious intent

## Project Conventions
- Use the existing package scripts for build/test/lint workflows; do not introduce parallel tooling.
- Keep server/client boundaries explicit and preserve existing route contracts, hooks, and shared API clients.
- Patch existing code paths instead of renaming exports, reorganizing modules, or rewriting load-bearing logic.

## Patch, Don't Rewrite
Never suggest rewriting or restructuring existing code. Suggest targeted fixes only. Existing function signatures, exports, and API contracts are load-bearing — do not suggest renaming or reorganising them.
