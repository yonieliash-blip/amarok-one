# Staging runtime

This directory contains the approved runtime layout for the budget-controlled AMAROK ONE staging
environment. Creating or changing AWS resources remains a separate, audited operation.

## Services

- Caddy: the only public container; HTTPS on ports 80 and 443
- web: management SPA, reachable only through Caddy
- API: application service, reachable only through Caddy
- PostgreSQL: reachable only from the private Docker backend network

No database or application port is published directly to the host.

## Server preparation

From the repository root on the staging server:

```sh
cp infrastructure/staging/staging.env.example infrastructure/staging/staging.env
chmod 600 infrastructure/staging/staging.env
```

Replace every placeholder with a generated staging-only value. The PostgreSQL password must be
URL-safe because the Compose file embeds it in `DATABASE_URL`. Do not reuse production, Apple,
GitHub or employee passwords.

## Validate before starting

```sh
docker compose \
  --env-file infrastructure/staging/staging.env \
  -f infrastructure/staging/docker-compose.yml \
  config --quiet
```

Confirm that both DNS records point to the instance before starting Caddy, otherwise certificate
issuance will fail.

## Start

```sh
docker compose \
  --env-file infrastructure/staging/staging.env \
  -f infrastructure/staging/docker-compose.yml \
  up -d --build --wait
```

The API container runs Prisma migrations before it starts. Do not run a demo seed automatically.
Create staging users only through the controlled staging procedure.

## Verify

```sh
curl --fail --show-error https://staging-api.amarok-ce.com/health
curl --fail --show-error https://staging.amarok-ce.com/health
docker compose \
  --env-file infrastructure/staging/staging.env \
  -f infrastructure/staging/docker-compose.yml \
  ps
```

Also verify from outside AWS that ports 3000 and 5432 are not reachable.

## Stop without deleting data

```sh
docker compose \
  --env-file infrastructure/staging/staging.env \
  -f infrastructure/staging/docker-compose.yml \
  down
```

Do not add `--volumes` unless staging data has been backed up and deletion is explicitly approved.
