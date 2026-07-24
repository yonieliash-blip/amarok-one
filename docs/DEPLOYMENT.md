# AMAROK ONE — Deployment Guide

## Overview

AMAROK ONE deploys as two containerized services plus PostgreSQL:

| Component                            | Image                            | Port | Health check  |
| ------------------------------------ | -------------------------------- | ---- | ------------- |
| **Web** (React + nginx)              | `Dockerfile.web`                 | 80   | `GET /health` |
| **API** (NestJS-style Hono monolith) | `Dockerfile.api`                 | 3000 | `GET /health` |
| **Database**                         | PostgreSQL 16 (RDS or container) | 5432 | `pg_isready`  |

The API runs `prisma migrate deploy` on container start before accepting traffic.

---

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9 (local builds)
- Docker 24+ and Docker Compose v2 (container builds)
- AWS account with ECR, ECS Fargate, RDS, ALB, Secrets Manager (cloud deploy)

---

## Environment variables

| File                                                    | Purpose                   |
| ------------------------------------------------------- | ------------------------- |
| [`.env.example`](../.env.example)                       | Local development         |
| [`.env.production.example`](../.env.production.example) | Production / AWS template |

**Required for production API:**

- `DATABASE_URL` — RDS connection string with `sslmode=require`
- `JWT_SECRET` — ≥ 32 characters (generate with `openssl rand -base64 48`)
- `JWT_REFRESH_SECRET` — ≥ 32 characters, different from `JWT_SECRET`
- `CORS_ORIGIN` — exact public web URL (e.g. `https://app.example.com`)

**Required for production web build (build-time):**

- `VITE_API_URL` — public API URL reachable from browsers (e.g. `https://api.example.com`)

> Never commit `.env` with real secrets. Store production values in AWS Secrets Manager or SSM Parameter Store.

---

## Local verification (clean environment)

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL and apply migrations + seed
pnpm db:up
pnpm db:setup

# 3. Copy environment template and set JWT secrets (≥ 32 chars each)
cp .env.example .env
# Edit JWT_SECRET and JWT_REFRESH_SECRET in .env

# 4. Run quality gates
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# 5. Start development servers
pnpm dev:api          # API → http://localhost:3000
pnpm --filter @amarok-one/web dev   # Web → http://localhost:5173
```

**Demo accounts** (after seed, password `Admin@123456`):

| Email                        | Role landing            |
| ---------------------------- | ----------------------- |
| `admin@demo.amarok.one`      | `/dashboard/executive`  |
| `manager@demo.amarok.one`    | `/dashboard/service`    |
| `tech1@demo.amarok.one`      | `/my/service-calls`     |
| `warehouse@demo.amarok.one`  | `/dashboard/warehouse`  |
| `accounting@demo.amarok.one` | `/dashboard/accounting` |

---

## Docker full stack (production-like)

Build and run postgres + API + web locally:

```bash
# Optional: copy production template and set secrets
cp .env.production.example .env

# Build and start (from repo root)
pnpm docker:build
pnpm docker:up
```

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:8080        |
| API        | http://localhost:3000        |
| API health | http://localhost:3000/health |
| PostgreSQL | localhost:5432               |

Stop the stack:

```bash
pnpm docker:down
```

**First-time database seed** (optional, staging/demo only):

```bash
docker compose -f infrastructure/docker/docker-compose.yml exec api \
  node ../../node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Or run seed locally against the Docker postgres: `pnpm db:seed`.

---

## Production build (without Docker)

```bash
pnpm install --frozen-lockfile

# Set VITE_API_URL before building the web app
export VITE_API_URL=https://api.example.com   # Linux/macOS
# $env:VITE_API_URL="https://api.example.com"  # PowerShell

pnpm build
pnpm db:migrate:deploy   # against production DATABASE_URL
```

Outputs:

- `apps/api/dist/` — Node.js API
- `apps/web/dist/` — static SPA (serve with nginx or S3 + CloudFront)

Start API in production:

```bash
cd apps/api
NODE_ENV=production node dist/index.js
```

---

## AWS deployment architecture (recommended)

```
Internet
    │
    ▼
Application Load Balancer (HTTPS)
    ├── host: app.example.com  →  ECS Service: web (nginx, port 80)
    └── host: api.example.com  →  ECS Service: api (port 3000)
                                        │
                                        ▼
                              RDS PostgreSQL 16 (private subnet)
```

Alternative: single ALB with path-based routing (`/` → web, `/api/*` → api) requires nginx or ALB rule changes; subdomain routing is simpler for the current SPA setup.

### AWS resources to create

1. **VPC** — public subnets (ALB) + private subnets (ECS, RDS)
2. **RDS PostgreSQL 16** — Multi-AZ for production; security group allows port 5432 from ECS tasks only
3. **ECR** — two repositories: `amarok-one-api`, `amarok-one-web`
4. **ECS cluster** — Fargate launch type
5. **ECS task definitions** — one per service (see below)
6. **ECS services** — desired count ≥ 2 for HA (production)
7. **ALB** — HTTPS listener with ACM certificate; target groups for web (80) and api (3000)
8. **Secrets Manager** — `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`
9. **CloudWatch** — log groups for ECS tasks; alarms on `/health` 5xx rate
10. **Route 53** — `app.example.com`, `api.example.com` → ALB

### Build and push images to ECR

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=eu-west-1
export ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# API
docker build -f infrastructure/docker/Dockerfile.api -t amarok-one-api .
docker tag amarok-one-api:latest $ECR_REGISTRY/amarok-one-api:latest
docker push $ECR_REGISTRY/amarok-one-api:latest

# Web — pass the public API URL at build time
docker build -f infrastructure/docker/Dockerfile.web \
  --build-arg VITE_API_URL=https://api.example.com \
  -t amarok-one-web .
docker tag amarok-one-web:latest $ECR_REGISTRY/amarok-one-web:latest
docker push $ECR_REGISTRY/amarok-one-web:latest
```

### ECS task definition — API

| Setting      | Value                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Image        | `$ECR_REGISTRY/amarok-one-api:latest`                                                     |
| Port         | 3000                                                                                      |
| Environment  | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0`, `CORS_ORIGIN=https://app.example.com` |
| Secrets      | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` from Secrets Manager                   |
| Health check | `GET /health` on port 3000, grace period 60s                                              |
| CPU / Memory | 512 CPU / 1024 MiB (adjust per load)                                                      |

Migrations run automatically via the container entrypoint (`prisma migrate deploy`).

### ECS task definition — Web

| Setting      | Value                                 |
| ------------ | ------------------------------------- |
| Image        | `$ECR_REGISTRY/amarok-one-web:latest` |
| Port         | 80                                    |
| Health check | `GET /health` on port 80              |
| CPU / Memory | 256 CPU / 512 MiB                     |

> Rebuild and redeploy the web image whenever `VITE_API_URL` changes.

### Post-deploy checklist

- [ ] `GET https://api.example.com/health` returns `{ "data": { "status": "ok", "database": "connected" } }`
- [ ] `GET https://app.example.com/health` returns `ok`
- [ ] Login with a seeded or real user account
- [ ] Logout, browser refresh, and direct URL access work
- [ ] Role-based navigation and protected routes behave correctly
- [ ] CloudWatch logs show no JWT or database errors

---

## Rollback

1. ECS → service → update to previous task definition revision (or re-deploy previous ECR image tag).
2. Database: Prisma migrations are forward-only; roll back schema only with a tested down migration or RDS snapshot restore.
3. RDS: restore from automated snapshot if a bad migration was applied.

---

## Monitoring

- **API**: `GET /health` (includes database connectivity), `GET /health/db` (table counts)
- **Web**: `GET /health` (nginx static OK)
- Configure ALB target group health checks to match these paths.
- Alert on sustained 503 from `/health` or elevated 5xx rate.

---

## Troubleshooting

| Symptom                            | Likely cause                                | Fix                                                        |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| API exits on start                 | Missing `JWT_SECRET` / `JWT_REFRESH_SECRET` | Set secrets ≥ 32 chars                                     |
| API 503 on `/health`               | RDS unreachable or wrong `DATABASE_URL`     | Check security groups, SSL mode, credentials               |
| CORS errors in browser             | `CORS_ORIGIN` mismatch                      | Set to exact web origin (scheme + host, no trailing slash) |
| Web calls wrong API                | `VITE_API_URL` not set at build time        | Rebuild web image with correct `--build-arg`               |
| Login works locally, not in Docker | JWT secrets differ between builds           | Use consistent secrets via `.env` or Secrets Manager       |
| `prisma migrate deploy` fails      | Pending migration conflict                  | Run against staging first; restore RDS snapshot if needed  |

---

## Git repository readiness

Before first push to a remote:

1. Confirm `.gitignore` excludes `.env`, `node_modules/`, `dist/`, `.data/`
2. Run `pnpm clean` and remove any local build artifacts
3. Verify no secrets: `grep -r "JWT_SECRET=" . --include="*.env*"` should only match example files
4. Initialize and commit:

```bash
git init
git add .
git commit -m "Initial production-ready AMAROK ONE monorepo"
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Related documentation

- [BACKUP.md](BACKUP.md) — database backup and recovery
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design
- [infrastructure/README.md](../infrastructure/README.md) — Docker files reference
