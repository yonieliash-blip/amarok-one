# AMAROK ONE — Security

Security requirements and secure defaults for AMAROK ONE. Every agent and contributor must treat these as mandatory, not optional.

## Core principles

1. **Fail closed** — if authentication, authorization, or tenant resolution fails, deny access
2. **Least privilege** — users and services receive only the permissions they need
3. **Defense in depth** — validate at the edge (DTO), in services, and at the database layer
4. **No secrets in Git** — credentials live in environment variables or a secrets manager
5. **Audit everything critical** — security-relevant actions produce immutable audit records

## Authentication and authorization

- All protected API routes require valid authentication (JWT or session — implementation TBD)
- Authorization checks happen in **NestJS guards** before controller logic executes
- Role-based access control (RBAC) scoped per tenant: `admin`, `manager`, `technician`, `viewer`
- Never trust client-provided `tenantId`, `userId`, or `role` without server-side verification against the authenticated session
- Tokens must have expiration; refresh token rotation when session-based auth is used
- Passwords hashed with **bcrypt** or **argon2** — never store or log plain-text passwords

## Multi-tenant isolation

Tenant isolation is a **security boundary**, not just a data convention:

- Every query on tenant-scoped data **must** include `WHERE tenantId = :currentTenantId`
- Use Prisma middleware or a repository base class to enforce scoping — do not rely on developer discipline alone
- Integration tests must verify cross-tenant access is impossible
- Platform-admin operations that cross tenants require a separate guard and explicit audit logging

## Input validation

- Validate all request input via DTOs with `class-validator` or equivalent before it reaches services
- Reject unknown fields on write endpoints (whitelist approach)
- Sanitize string inputs destined for logs or exports
- Enforce maximum payload sizes and pagination limits
- Validate UUID format on all ID parameters

## API security

- **HTTPS only** in production — no plain HTTP except local development
- Configure **CORS** explicitly — never use `origin: *` with credentials
- Rate limiting on authentication and public endpoints
- Return generic error messages to clients; log details server-side only
- Set security headers (Helmet or equivalent in NestJS)

## Data protection

| Data type         | Rule                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| Passwords         | Hashed; never logged or returned in API responses                       |
| Tokens / API keys | Environment variables only; never committed                             |
| PII (email, name) | Minimize collection; protect in transit and at rest                     |
| Audit logs        | Append-only; include actor, tenant, action, timestamp, entity reference |

## Secrets management

### Never commit

- `.env` files (except `.env.example` with placeholder values)
- Private keys, certificates, connection strings with credentials
- API keys, JWT secrets, encryption keys
- Database passwords

### Environment variables

All required variables are documented in [`.env.example`](../.env.example) at the repository root. When adding a new secret:

1. Add the variable to the application code
2. Document it in `.env.example` with a safe placeholder
3. Never use real values in documentation or examples

### Example placeholders

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/amarok_one
JWT_SECRET=change-me-use-a-long-random-string
```

## Audit trail

Security-relevant and business-critical mutations must write to an immutable audit log:

| Field        | Description                                    |
| ------------ | ---------------------------------------------- |
| `id`         | UUID                                           |
| `tenantId`   | Tenant scope                                   |
| `actorId`    | User who performed the action                  |
| `action`     | e.g., `equipment.created`, `user.role_changed` |
| `entityType` | Target entity type                             |
| `entityId`   | Target entity UUID                             |
| `metadata`   | JSON snapshot of relevant changes (no secrets) |
| `createdAt`  | Timestamp (never updated)                      |

Audit records are **never updated or deleted**.

## Soft delete

Use soft delete (`deletedAt`) for entities where:

- Recovery may be needed
- Audit history references the record
- Hard delete would violate referential integrity expectations

Soft-deleted records must not appear in default queries and must not be accessible via standard API endpoints.

## Dependency security

- Keep dependencies updated; review Dependabot or equivalent alerts
- Do not install unverified packages for convenience
- Run `pnpm audit` periodically; address high/critical findings before release

## Client security (web and mobile)

- No secrets in client-side code — Vite `VITE_*` variables are public by design
- Store tokens in httpOnly cookies or secure storage (mobile Keychain/Keystore) — not localStorage for sensitive tokens when avoidable
- Content Security Policy on web production builds
- Do not disable TypeScript strict checks or ESLint security rules to "make it work"

### Employee location data

- Accept location samples only for the authenticated employee's active work day
- Tenant-scope every stored point and every manager read
- Keep attendance usable if location permission is denied, while showing that tracking is unavailable
- Sample by time/distance instead of continuously to reduce battery use and unnecessary collection
- Do not collect shift locations before clock-in or after clock-out
- A production retention period and employee privacy notice are required before background tracking is enabled

## Infrastructure

- Docker images run as non-root where possible
- Production database not exposed to public networks
- Separate credentials per environment (dev, staging, production)
- Backups encrypted at rest — see [BACKUP.md](BACKUP.md)

## Incident response

If a secret is accidentally committed:

1. Rotate the secret immediately
2. Remove it from Git history if necessary (requires explicit human approval)
3. Document the incident and remediation

## Agent-specific rules

Automated agents must **not**:

- Push, merge, or delete branches
- Commit `.env` files or credentials
- Disable security guards, lint rules, or tests to pass CI
- Bypass tenant isolation for convenience
- Modify legacy code unless explicitly instructed

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
- [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)
- [BACKUP.md](BACKUP.md)
