# @amarok-one/api

Hono REST API for AMAROK ONE (migrating to NestJS modular monolith).

## Scripts

| Script           | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `pnpm dev`       | Start dev server with hot reload on http://localhost:3000 |
| `pnpm build`     | Generate Prisma client and compile TypeScript             |
| `pnpm start`     | Run compiled production build                             |
| `pnpm lint`      | Lint source files                                         |
| `pnpm typecheck` | Type-check without emitting                               |

## Database (Prisma + PostgreSQL)

| Script                   | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `pnpm db:generate`       | Generate Prisma client                           |
| `pnpm db:migrate`        | Create and apply migrations (development)        |
| `pnpm db:migrate:deploy` | Apply migrations (CI/production)                 |
| `pnpm db:push`           | Push schema without migration (prototyping only) |
| `pnpm db:studio`         | Open Prisma Studio                               |
| `pnpm db:reset`          | Reset database and re-apply migrations           |

Start local PostgreSQL:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up postgres -d
pnpm db:migrate
```

## Environment

| Variable       | Default                 | Description                             |
| -------------- | ----------------------- | --------------------------------------- |
| `DATABASE_URL` | see `.env.example`      | PostgreSQL connection string for Prisma |
| `PORT`         | `3000`                  | Server port                             |
| `HOST`         | `0.0.0.0`               | Bind address                            |
| `CORS_ORIGIN`  | `http://localhost:5173` | Allowed CORS origin                     |
| `NODE_ENV`     | `development`           | Runtime environment                     |

Copy `.env.example` to `.env` at the repository root.

## Endpoints

| Method | Path      | Description  |
| ------ | --------- | ------------ |
| `GET`  | `/`       | API metadata |
| `GET`  | `/health` | Health check |

## Sprint 1 models

- `Organization` — tenant root
- `User` — global identity
- `Role` — tenant-scoped role definitions
- `Membership` — user ↔ organization ↔ role
- `AuditLog` — append-only audit trail
