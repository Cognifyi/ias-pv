# SPEC-002-auth-permissions

## Source
- Eng Review: DECISION-006-eng-review-auth-architecture
- Related Decisions: DECISION-004, DECISION-005
- Date: 2026-05-23T13:49:00Z

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Auth Routes │────▶│ JWT Middleware│────▶│  Routes  │
│  /api/auth/  │     │ requireAuth  │     │ (channels│
│  login       │     │ requireAdmin │     │ recordings│
│  users CRUD  │     └──────┬───────┘     │ health)  │
└──────┬───────┘            │              └──────────┘
       │                    │
       ▼                    ▼
  ┌─────────┐       ┌──────────────┐
  │ SQLite  │       │ jsonwebtoken │
  │ (users  │       │ (verify/sign)│
  │  table) │       └──────────────┘
  └─────────┘
```

## Data Flow

### Login flow
```
Client ──POST /api/auth/login──▶ Auth Routes
  { username, password }            │
                                    ▼
                              UserService.authenticate()
                                    │
                              ┌─────┴──────┐
                              │ SQLite lookup│
                              │ by username  │
                              └─────┬──────┘
                                    │
                                    ▼
                              bcrypt.compare()
                                    │
                              ┌─────┴──────┐
                              │ Sign JWT    │
                              │ (1h expiry) │
                              └─────┬──────┘
                                    │
◀──────── { token, user } ──────────┘
```

### Authenticated request flow
```
Client ──GET /api/channels──▶ requireAuth middleware
  Authorization: Bearer <jwt>      │
                                   ▼
                             Verify JWT (jsonwebtoken)
                                   │
                              ┌────┴────┐
                              │ Extract │
                              │ userId  │
                              │ + role  │
                              └────┬────┘
                                   │
                              requireAdmin? (if route)
                                   │
                                   ▼
                              Route handler
                              (req.user = { id, role })
                                   │
                                   ▼
                              Response
```

## Data Model

### users table (SQLite)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID v4
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,    -- bcrypt hash
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username);
```

## API Design

### Auth routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | None | Authenticate, return JWT |
| POST | /api/auth/users | admin | Create a new user |
| GET | /api/auth/users | admin | List all users |
| DELETE | /api/auth/users/:id | admin | Delete a user |

### Login response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### JWT payload
```json
{
  "sub": "user-uuid",
  "role": "admin",
  "iat": 1712345678,
  "exp": 1712349278
}
```

## Middleware

### requireAuth
- Extract `Authorization: Bearer <token>` header
- Verify JWT with HS256 secret (from env var `JWT_SECRET`)
- Attach `req.user = { id, role }` on success
- Return 401 on missing/invalid/expired token

### requireAdmin
- Must run after requireAuth
- Check `req.user.role === 'admin'`
- Return 403 on non-admin

## Seed Script
```bash
node packages/api/src/seed.js --username admin --password <prompt>
```
Creates initial admin user in SQLite database.

## File Layout
```
packages/api/src/
├── auth/
│   ├── auth.routes.ts       # POST /login, user CRUD routes
│   ├── auth.service.ts      # authenticate(), user CRUD logic
│   ├── auth.middleware.ts    # requireAuth, requireAdmin
│   └── db.ts                # SQLite connection singleton
├── seed.ts                  # CLI script to create admin user
└── ... (existing files unchanged)
```

## Test Strategy
- **Auth service tests**: Unit tests with mock SQLite — verify login success, login failure, user CRUD, password hashing
- **Middleware tests**: Unit tests with mock JWT — verify valid token, expired token, missing token, admin check
- **Integration tests**: API tests with real SQLite + JWT — verify login endpoint, authenticated routes, admin-only routes
- **Existing routes unaffected**: All existing channel/recording tests continue to pass

## NFR Considerations
- **Security**: JWT secret from env var, bcrypt for passwords, no plaintext storage
- **Performance**: better-sqlite3 is synchronous and fast (<1ms per query), auth adds ~2ms per request
- **Configurability**: JWT_SECRET, JWT_EXPIRY (default 1h), SQLITE_PATH (default ./data/auth.db) all via env vars
