# Changelog

## [0.2.0] — 2026-05-23

### Added
- Module B: User Authentication + Permissions
- SQLite database (better-sqlite3, WAL mode) for persistent user storage
- UserService: bcrypt-hashed CRUD with validation, seed script for initial admin
- Login endpoint (POST /api/auth/login) returning JWT Bearer tokens (HS256, 1h expiry)
- requireAuth middleware — verifies JWT, attaches req.user
- requireAdmin middleware — two-role RBAC (admin/user), 403 on insufficient role
- Admin user management API: POST/GET/DELETE /api/auth/users
- Admin-only mutation guards on channel POST/PUT/DELETE/probe and recording POST/DELETE
- Swagger docs updated with auth endpoints + bearerAuth security scheme
- 51 new tests (97 total, 13 files, 100% pass)

### Added
- Module A: IPTV Recording Engine — initial implementation
- Channel CRUD with in-memory storage (REST API)
- Channel probe system (BullMQ ProbeQueue + HTTP HEAD + ffprobe + WebSocket)
- Recording scheduler with state machine (PENDING → RECORDING → DONE/FAILED)
- FFmpeg execution with argument arrays (no shell injection), SIGTERM-based cancel, retry with exponential backoff
- Media pipeline: TS→HLS transcoding, thumbnail extraction, ffprobe metadata
- WebSocket push for real-time status updates (socket.io)
- Health daemon with orphan FFmpeg PID detection + cleanup (30s interval)
- Graceful shutdown (SIGTERM/SIGINT handlers)
- Structured JSON logger with level filtering
- OpenAPI 3.0 spec at /api/docs/ (swagger-ui-express)
- Per-channel output directory support (`metadata.outputPath`)
- Redis on port 6380 for BullMQ queue persistence
- 46 unit tests across 8 test files, 100% pass
