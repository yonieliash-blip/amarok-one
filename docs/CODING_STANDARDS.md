# AMAROK ONE — Coding Standards

Mandatory conventions for all code in this repository. Agents and contributors must follow these rules without exception unless a documented architectural decision overrides them.

## TypeScript

- **Strict mode is required** — `strict`, `noUncheckedIndexedAccess`, and related flags stay enabled
- **No `any`** — use `unknown` and narrow, or define a proper type. If `any` is unavoidable, add a comment explaining why
- **No non-null assertions (`!`)** unless preceded by a guard or validated invariant
- Prefer **`interface`** for object shapes; use **`type`** for unions, intersections, and mapped types
- Use **`verbatimModuleSyntax`** — type-only imports must use `import type`
- Shared types belong in `@amarok-one/types`; do not duplicate domain types across apps

## Formatting and linting

- **Prettier** is the formatter — run `pnpm format` before committing
- **ESLint** must pass — run `pnpm lint` before declaring work complete
- Extend presets from `@amarok-one/config` in each package; do not invent one-off rule sets
- Maximum line length: **100 characters** (Prettier default for this project)

## Naming conventions

| Element                  | Convention                 | Example                           |
| ------------------------ | -------------------------- | --------------------------------- |
| Files (components)       | PascalCase                 | `EquipmentCard.tsx`               |
| Files (modules/services) | kebab-case or dot notation | `equipment.service.ts`            |
| Variables / functions    | camelCase                  | `createWorkOrder`                 |
| Constants                | UPPER_SNAKE_CASE           | `MAX_PAGE_SIZE`                   |
| Types / interfaces       | PascalCase                 | `Equipment`, `CreateWorkOrderDto` |
| Enums                    | PascalCase members         | `EquipmentCategory.Forklift`      |
| Database columns         | camelCase in Prisma        | `tenantId`, `deletedAt`           |
| API routes               | kebab-case, plural nouns   | `/work-orders`, `/equipment`      |

## Package boundaries

### `apps/web` and `apps/mobile`

Allowed:

- UI rendering, routing, layout
- API client calls (fetch/axios/tanstack-query)
- Client-side form UX validation (mirrors server rules)
- Local UI state

**Forbidden:**

- Business rules (pricing, eligibility, workflow state transitions)
- Direct database access
- Tenant resolution logic

### `apps/api` (NestJS)

Allowed:

- Controllers, guards, interceptors, pipes
- Domain services with business logic
- Prisma queries scoped by `tenantId`
- Event emission and handling
- DTO validation

**Forbidden:**

- Returning raw Prisma entities without mapping (use response DTOs)
- Bypassing tenant scoping "just for admin scripts"
- Hard-deleting records that require soft delete

### `packages/types`

- Type definitions, enums, and constants only
- No runtime imports from NestJS, React, or Prisma

### `packages/utils`

- Pure functions with no side effects
- Must be testable in isolation
- No framework-specific dependencies

### `packages/ui`

- Presentational React components
- Props-driven; no data fetching
- No business logic

## API design

- **RESTful** resource naming with consistent plural nouns
- All responses use the shared envelope from `@amarok-one/types`:

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}
```

- Errors use a consistent shape: `{ code: string; message: string; details?: object }`
- Paginate list endpoints; never return unbounded collections
- Version breaking changes explicitly (URL prefix or header strategy TBD)

## Database and Prisma

- Primary keys: **UUID** (`@default(uuid())`)
- Tenant-scoped tables: **`tenantId` required**, indexed
- Soft delete: **`deletedAt DateTime?`** — filter `deletedAt IS NULL` in default queries
- Audit: append-only **`AuditLog`** records for create/update/delete on protected entities
- Migrations: one logical change per migration file; descriptive names
- Never store secrets, passwords in plain text, or PII without justification

## Testing

| Layer                            | Requirement                                              |
| -------------------------------- | -------------------------------------------------------- |
| Business logic (services, utils) | **Unit tests required**                                  |
| API endpoints                    | Integration tests for critical paths                     |
| UI components                    | Tests for complex interactive behavior (when introduced) |
| Types / DTOs                     | No tests needed unless runtime validation helpers exist  |

- Use **Vitest** for unit tests (project default)
- Tests live alongside source (`*.spec.ts` or `__tests__/`)
- Tests must be deterministic — no reliance on external services without mocks
- Run `pnpm test` before declaring completion when test scripts exist

## Comments and documentation

- Code should be **self-explanatory** — prefer clear naming over comments
- Comment **why**, not **what**, for non-obvious decisions
- Update `docs/` when changing architecture, security posture, or workflow
- Public API methods and shared package exports should have JSDoc where behavior is not obvious

## Error handling

- Never swallow errors silently
- Log server errors with context (request ID, tenant ID) but **never log secrets or tokens**
- Return safe, generic messages to clients; log detailed errors server-side
- Use typed error classes or NestJS HTTP exceptions consistently

## Dependencies

- Add dependencies deliberately — prefer workspace packages over new npm packages
- Pin versions in `package.json`; lockfile is committed
- Do not add dependencies to the root unless they are dev tooling for the whole monorepo

## Legacy code

Do not modify `frontend/` or `backend/` unless explicitly instructed. All new code goes in `apps/` and `packages/`.

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SECURITY.md](SECURITY.md)
- [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)
