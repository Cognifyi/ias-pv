# 002-auth-permissions

## Source
- Branch: main
- Date: 2026-05-23T13:50:00Z
- Version: 1.0

## Related Decisions
- docs/decisions/DECISION-004-office-hours-auth-database.md
- docs/decisions/DECISION-005-ceo-review-auth-scope.md
- docs/decisions/DECISION-006-eng-review-auth-architecture.md

## Related Specs
- docs/specs/SPEC-002-auth-permissions.md

## Problem Statement
The IPTV Recording Engine (Module A) exposes unauthenticated API endpoints. Any client with network access to port 4000 can create, modify, or delete channels and recordings. Before adding more features or a frontend, the API needs authentication (who you are) and authorization (what you can do).

## Solution
Add JWT-based authentication with admin/user role-based access control, backed by SQLite for persistent user storage. Existing routes get protected by `requireAuth` middleware; sensitive routes (user creation, deletion) get `requireAdmin`.

## User Stories
1. As an admin, I want to log in with username/password and receive a JWT, so that I can authenticate API requests
2. As an admin, I want to create new users, so that other people can access the API
3. As an admin, I want to list and delete users, so that I can manage access
4. As an admin user, I want to perform all CRUD operations on channels and recordings
5. As a regular user, I want to view channels and recordings, so that I can monitor the system
6. As a regular user, I want to trigger channel probes and manage my own recordings
7. As any user, I want to receive 401 on invalid/expired tokens, so that unauthorized access is rejected
8. As any user, I want to receive 403 on insufficient permissions, so that role boundaries are enforced

## Implementation Decisions
- **Auth**: JWT (jsonwebtoken) with HS256, 1h expiry (configurable)
- **Database**: better-sqlite3 with raw SQL, single `users` table
- **Password**: bcrypt (bcryptjs) with salt rounds = 10
- **Middleware**: `requireAuth` (any authenticated user) + `requireAdmin` (admin-only), applied per-route
- **User registration**: Admin creates users via API only (no self-registration)
- **Seed script**: CLI script to bootstrap initial admin user
- **Secret**: `JWT_SECRET` env var (required, startup fails if missing)
- **Database path**: `SQLITE_PATH` env var (default: `./data/auth.db`)

## Testing Decisions
- Unit tests for UserService (login, CRUD, bcrypt)
- Unit tests for auth middleware (valid token, expired, missing, admin check)
- Integration tests for auth endpoints with real SQLite
- Existing route tests must still pass (verify middleware doesn't break them — use mock tokens)

## Out of Scope
- Self-registration / signup flow
- Refresh tokens (can defer to Phase C or later)
- Session management (logout blacklist)
- Password reset / email verification
- OAuth / SSO providers
- Frontend login UI (separate Phase D)
