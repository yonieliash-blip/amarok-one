# AGENTS.md — AMAROK ONE Agent Instructions

This file defines mandatory rules for **every coding agent** (Cursor, Copilot, CI bots, or any automated contributor) working in this repository.

---

## Required reading before any change

**Before writing, editing, or deleting code, read every document in [`docs/`](docs/):**

| Document                                                     | Purpose                                          |
| ------------------------------------------------------------ | ------------------------------------------------ |
| [docs/README.md](docs/README.md)                             | Documentation index                              |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | System design and technical boundaries           |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)         | Code style, patterns, and quality bar            |
| [docs/SECURITY.md](docs/SECURITY.md)                         | Security requirements and secure defaults        |
| [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) | Branching, verification, and completion criteria |
| [docs/MONOREPO.md](docs/MONOREPO.md)                         | Workspace layout and package conventions         |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                     | Deployment procedures                            |
| [docs/BACKUP.md](docs/BACKUP.md)                             | Backup and recovery                              |

If a task conflicts with these documents, **follow the docs** and note the conflict in your summary.

---

## Non-negotiable rules

### Architecture

- **Web**: React + TypeScript + Vite (`apps/web`)
- **API**: NestJS + TypeScript (`apps/api`) — modular monolith
- **Database**: PostgreSQL + Prisma
- **Monorepo**: pnpm workspaces + Turborepo
- **Multi-tenant by design** — every tenant-scoped entity must enforce tenant isolation
- **API-first** — the API is the source of truth; clients consume it
- **Event-driven internally** — domain modules communicate via events where coupling would otherwise grow
- **No business logic in the UI** — presentation only; logic lives in the API or shared packages

### Data and domain

- Use **UUID** identifiers for all primary keys unless a documented exception exists
- Apply **soft delete** (`deletedAt`) where records must be recoverable or auditable
- Maintain an **immutable audit trail** for security-relevant and business-critical mutations
- Scope every tenant-bound query and mutation by `tenantId` — never trust client-supplied tenant context alone

### Code quality

- **Strict TypeScript** — no `any` without documented justification
- **ESLint and Prettier** are required — run and pass before declaring completion
- **Tests are required for business logic** — services, domain rules, utilities with non-trivial behavior
- Prefer the **safest maintainable option** when requirements are ambiguous; document the decision

### Security

- **Secure defaults** — deny by default, validate all input, least privilege
- **Never commit secrets** — use environment variables; document them in `.env.example`
- Do not log passwords, tokens, or personal data

### Legacy code

- **`frontend/` and `backend/` are legacy** — do not modify unless explicitly instructed
- New work belongs under `apps/` and `packages/`

### Git and automation

- **Do not push, merge, or delete branches automatically**
- **Do not create commits** unless the user explicitly requests it
- **Do not force-push** to `main` or `develop`

---

## Verification before declaring completion

Run these commands from the repository root and fix all failures:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test        # when test scripts exist
pnpm build
```

Do not report a task as complete until every applicable command passes.

---

## Decision log

When you make a non-obvious architectural or security choice, record it in:

- The PR description, or
- A short comment in the relevant `docs/` file, or
- An inline code comment where the decision is localized

Default principle: **when ambiguous, choose the safest maintainable option and document why.**
