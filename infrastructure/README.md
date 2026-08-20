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

Default connection (see `.env.example`; host port defaults to `5433` via `POSTGRES_PORT`):

```
postgresql://amarok:amarok@localhost:5433/amarok_one?schema=public
```

When Docker is unavailable, `pnpm db:setup` falls back to **embedded PostgreSQL** (data stored in `.data/postgres/`).

## Docker full stack

Uses [docker/compose.env](docker/compose.env) for local Compose variables (see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)).

```bash
pnpm docker:build
pnpm docker:up
pnpm docker:down
```

| Service    | URL                           |
| ---------- | ----------------------------- |
| `postgres` | localhost:5432                |
| `web`      | http://localhost:8080         |
| `api`      | http://localhost:3000         |
| Health     | `:8080/health`, `:3000/health |

Migrations run automatically when the API container starts. Demo seed is a separate one-time step — see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

## Docker files

| File                                                 | Purpose                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| [docker/compose.env](docker/compose.env)             | Local Compose env (not for production)       |
| [docker/Dockerfile.api](docker/Dockerfile.api)       | API image (Node 20, Prisma migrate on start) |
| [docker/Dockerfile.web](docker/Dockerfile.web)       | Web image (Vite build + nginx)               |
| [docker/entrypoint.api.sh](docker/entrypoint.api.sh) | Runs migrations then starts API              |
| [docker/nginx.web.conf](docker/nginx.web.conf)       | SPA routing + `/health`                      |
| [../.dockerignore](../.dockerignore)                 | Build context exclusions                     |

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for AWS deployment procedures.

## Budget-controlled staging

The approved single-instance staging runtime is defined in
[staging/README.md](staging/README.md). Its Compose stack keeps PostgreSQL, the API and the web
container off public host ports and exposes them only through the Caddy HTTPS proxy.
