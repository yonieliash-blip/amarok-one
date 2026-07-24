# AMAROK ONE — Development Workflow

Standard process for developing, verifying, and delivering changes in the AMAROK ONE monorepo.

## Before you start

1. Read [AGENTS.md](../AGENTS.md) (agents) or [CONTRIBUTING.md](../CONTRIBUTING.md) (humans)
2. Read **all documents in `docs/`** — see [docs/README.md](README.md) for the index
3. Copy `.env.example` to `.env` and fill in local values
4. Run `pnpm install` from the repository root

## Branching strategy

| Branch      | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `main`      | Production-ready, stable code                    |
| `develop`   | Integration branch for ongoing work              |
| `feature/*` | New features (e.g., `feature/work-order-module`) |
| `fix/*`     | Bug fixes (e.g., `fix/tenant-scope-leak`)        |

### Rules for agents and automation

- **Do not push** to remote repositories automatically
- **Do not merge** pull requests automatically
- **Do not delete** branches automatically
- **Do not create commits** unless the user explicitly requests it

## Local development

```bash
# Install dependencies
pnpm install

# Build all packages (required before first run)
pnpm build

# Start individual apps
pnpm --filter @amarok-one/web dev
pnpm --filter @amarok-one/api dev
pnpm --filter @amarok-one/mobile dev

# Or start all dev servers via Turborepo
pnpm dev
```

### Default local URLs

| App    | URL                                   |
| ------ | ------------------------------------- |
| Web    | http://localhost:5173                 |
| API    | http://localhost:3000                 |
| Mobile | Expo dev server (QR code in terminal) |

## Making changes

### Where code goes

| Change type      | Location              |
| ---------------- | --------------------- |
| Web UI           | `apps/web/src/`       |
| API module       | `apps/api/src/`       |
| Mobile screen    | `apps/mobile/`        |
| Shared types     | `packages/types/src/` |
| Shared utilities | `packages/utils/src/` |
| UI components    | `packages/ui/src/`    |
| Tooling presets  | `packages/config/`    |
| Infrastructure   | `infrastructure/`     |
| Documentation    | `docs/`               |

### Where code does NOT go

- **`frontend/`** — legacy, do not modify unless explicitly instructed
- **`backend/`** — legacy, do not modify unless explicitly instructed

### Change checklist

- [ ] Business logic in API services, not in UI
- [ ] Tenant isolation applied to all tenant-scoped data access
- [ ] UUIDs used for new entity primary keys
- [ ] Soft delete used where appropriate
- [ ] Audit events emitted for critical mutations
- [ ] Types added to `@amarok-one/types` when shared across packages
- [ ] Environment variables documented in `.env.example`
- [ ] Tests added for new business logic
- [ ] Documentation updated if architecture or workflow changed

## Verification — required before completion

Every contributor (human or agent) must run these commands from the repository root and resolve all failures before declaring work complete:

```bash
pnpm format:check    # Prettier formatting
pnpm lint            # ESLint across workspace
pnpm typecheck       # TypeScript strict checks
pnpm test            # Unit/integration tests (when available)
pnpm build           # Full workspace build via Turborepo
```

### Expected outcomes

| Command        | Pass criteria                                           |
| -------------- | ------------------------------------------------------- |
| `format:check` | No formatting differences                               |
| `lint`         | Zero errors                                             |
| `typecheck`    | Zero type errors                                        |
| `test`         | All tests pass (skip only if no test script exists yet) |
| `build`        | All packages build successfully                         |

If a command is not yet configured (e.g., `pnpm test`), note it in your summary and ensure the other commands pass.

## Testing strategy

| What to test                   | How                                  |
| ------------------------------ | ------------------------------------ |
| Business logic in services     | Unit tests (Vitest)                  |
| Utility functions              | Unit tests                           |
| API endpoints (critical paths) | Integration tests with test database |
| UI components (complex)        | Component tests (when introduced)    |

Tests are **required** for business logic. Do not merge logic-heavy services without tests.

## Database workflow (PostgreSQL + Prisma)

When Prisma is configured:

```bash
# Generate client after schema changes
pnpm --filter @amarok-one/api exec prisma generate

# Create migration (development)
pnpm --filter @amarok-one/api exec prisma migrate dev --name describe_change

# Apply migrations (CI/production)
pnpm --filter @amarok-one/api exec prisma migrate deploy
```

Never edit applied migration files. Create a new migration for schema changes.

## Pull requests

When creating a PR (human-driven):

1. Ensure all verification commands pass
2. Write a clear title and description
3. Reference related issues
4. Note any architectural decisions or ambiguities resolved
5. Request review before merging

Agents must not create or merge PRs unless explicitly instructed.

## Handling ambiguity

When requirements are unclear:

1. Choose the **safest maintainable option**
2. Document the decision in the PR, a code comment, or `docs/`
3. Do not silently make irreversible choices (schema, auth model, tenant strategy)

Examples:

- Unsure if data is tenant-scoped? **Scope it to tenant** — opt-out requires explicit approval
- Unsure if a record should be hard-deleted? **Soft delete** — hard delete requires explicit approval
- Unsure if UI should validate? **Validate on server** — client validation is UX only

## Release and deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment. See [BACKUP.md](BACKUP.md) for backup procedures.

## Related documents

- [AGENTS.md](../AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
- [SECURITY.md](SECURITY.md)
- [MONOREPO.md](MONOREPO.md)
