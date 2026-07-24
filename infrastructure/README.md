# Infrastructure

Deployment and container configuration for AMAROK ONE.

## PostgreSQL (local development)

Dedicated compose file for the database:

```bash
pnpm db:up          # Start PostgreSQL (Docker)
pnpm db:setup       # Start DB + migrate + seed (Docker or embedded fallback)
pnpm db:down        # Stop Docker PostgreSQL
```

| File                                                                     | Purpose                           |
| ------------------------------------------------------------------------ | --------------------------------- |
| [docker/docker-compose.postgres.yml](docker/docker-compose.postgres.yml) | Local PostgreSQL 16               |
| [docker/docker-compose.yml](docker/docker-compose.yml)                   | Full stack (postgres + api + web) |

Default connection (see `.env.example`):

```
postgresql://amarok:amarok@localhost:5432/amarok_one?schema=public
```

When Docker is unavailable, `pnpm db:setup` falls back to **embedded PostgreSQL** (data stored in `.data/postgres/`).

## Docker full stack

```bash
pnpm docker:build
pnpm docker:up
```

| Service    | URL                   |
| ---------- | --------------------- |
| `postgres` | localhost:5432        |
| `web`      | http://localhost:8080 |
| `api`      | http://localhost:3000 |

Environment: copy [`.env.production.example`](../.env.production.example) to `.env` and set JWT secrets before running in any shared environment. Local Docker uses documented fallback secrets when `.env` is absent.

## Docker files

| File                                                 | Purpose                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| [docker/Dockerfile.api](docker/Dockerfile.api)       | API image (Node 20, Prisma migrate on start) |
| [docker/Dockerfile.web](docker/Dockerfile.web)       | Web image (Vite build + nginx)               |
| [docker/entrypoint.api.sh](docker/entrypoint.api.sh) | Runs migrations then starts API              |
| [docker/nginx.web.conf](docker/nginx.web.conf)       | SPA routing + `/health`                      |
| [../.dockerignore](../.dockerignore)                 | Build context exclusions                     |

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for AWS deployment procedures.
