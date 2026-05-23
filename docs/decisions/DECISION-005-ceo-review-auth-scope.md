# Decision: DECISION-005-ceo-review-auth-scope

## Phase: INCEPTION
## Sub-phase: ceo-review
## Date: 2026-05-23T13:48:00Z
## Status: PENDING

## Context
- Module B: User Authentication + Permissions for ias-pv
- Building on Module A architecture (Express + BullMQ + Redis + FFmpeg)
- New: SQLite for user storage (per office-hours decision)
- Auth strategy: JWT with Bearer tokens
- Permission model: admin/user roles

## Decision
1. **User registration**: Admin creates users only (CLI seed script, no self-registration)
2. **Token strategy**: Short TTL only (1h), no refresh tokens in Phase B
3. **Password hashing**: bcrypt (via bcryptjs)

## Consequences
- Positive: Admin-only creation is simplest, matches dev-phase ops
- Positive: Short TTL avoids refresh token complexity, acceptable for API-only
- Positive: bcrypt is battle-tested, available as zero-dep native module
- Trade-off: No self-registration means admin must manually create users
- Trade-off: 1h TTL is inconvenient for long-running API clients; mitigable by extending TTL in config

## Scope
- User CRUD (admin-only): create user, list users, delete user
- Auth endpoints: POST /api/auth/login → JWT
- JWT middleware: protect routes with admin/user role checks
- Seed script: create initial admin user via CLI
