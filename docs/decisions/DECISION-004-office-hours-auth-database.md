# Decision: DECISION-004-office-hours-auth-database

## Phase: INCEPTION
## Sub-phase: office-hours
## Date: 2026-05-23T13:47:00Z
## Status: PENDING

## Context
- Module B: User Authentication + Permissions for ias-pv
- Built on Module A (IPTV Recording Engine) — Express + BullMQ + Redis + FFmpeg
- No frontend yet (HAS_FRONTEND=0)
- Module A used in-memory storage; auth requires persistent user storage
- Key questions: auth strategy, storage backend, permission model

## Decision
1. **Auth strategy**: JWT with Bearer tokens (stateless, no server-side session store)
2. **User storage**: SQLite (zero-infrastructure, file-based, easy upgrade path to Postgres)
3. **Permission model**: admin/user roles (simple two-role RBAC):
   - `admin`: full CRUD on all resources (channels, recordings, users)
   - `user`: read-only access to channels/recordings, can trigger probes, manage own recordings

## Consequences
- Positive: JWT is standard for API auth, middleware pattern is clear
- Positive: SQLite requires no separate server process, matches dev-phase ops simplicity
- Positive: Two-role RBAC covers 80% of use cases without over-engineering
- Trade-off: SQLite means no concurrent write scaling (acceptable for dev/demo)
- Trade-off: JWT revocation requires a blacklist or short TTL (design decision for Eng Review)
- Future: Upgrade SQLite → PostgreSQL when production deployment is needed (Phase D or later)
