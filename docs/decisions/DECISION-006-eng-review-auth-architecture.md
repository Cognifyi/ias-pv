# Decision: DECISION-006-eng-review-auth-architecture

## Phase: INCEPTION
## Sub-phase: eng-review
## Date: 2026-05-23T13:49:00Z
## Status: PENDING

## Context
- Module B: User Authentication + Permissions for ias-pv
- Existing: Express + BullMQ + Redis + FFmpeg (Module A)
- New: SQLite for persistent user storage

## Decision
1. **SQLite library**: better-sqlite3 (synchronous, fastest Node.js SQLite)
2. **Query approach**: Raw SQL (no ORM — keeps it simple, easy to migrate later)
3. **Auth middleware**: Per-route middleware (`requireAuth`, `requireAdmin`)
4. **User schema**: `id (TEXT UUID), username (TEXT UNIQUE), password_hash (TEXT), role (TEXT), created_at, updated_at`
5. **JWT payload**: `{ sub: userId, role: 'admin'|'user', iat, exp }` signed with HS256
6. **Token expiry**: 1 hour (configurable via env var)

## Consequences
- Positive: better-sqlite3 is zero-infrastructure, synchronous reads simplify code
- Positive: Raw SQL keeps migration path to Postgres straightforward
- Positive: Per-route middleware is explicit, matches Module A pattern
- Trade-off: better-sqlite3 requires native compilation (prebuild binaries available)
- Trade-off: Raw SQL means manual schema management (simple for one table)
