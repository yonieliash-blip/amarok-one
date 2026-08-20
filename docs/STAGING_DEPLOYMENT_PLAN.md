# AMAROK ONE staging deployment plan

Status: proposed — no AWS resources have been created.

## Goal

Provide a stable HTTPS API and management web app for TestFlight field testing while keeping the
staging account within its USD 20 monthly budget. This environment is for controlled testing with
non-production data. It is not the production architecture.

## Recommended staging architecture

Use one Amazon Lightsail Linux instance in `eu-central-1`:

- 2 vCPU, 2 GB RAM, 60 GB SSD, public IPv4 bundle
- Docker Compose services: PostgreSQL 16, API, web and Caddy
- PostgreSQL available only on the private Docker network; port 5432 is not public
- Caddy is the only internet-facing service and terminates HTTPS
- API and web containers are reachable only through Caddy
- static IP attached to the instance
- DNS names proposed:
  - `staging-api.amarok-ce.com`
  - `staging.amarok-ce.com`

The mobile build receives `EXPO_PUBLIC_API_URL=https://staging-api.amarok-ce.com`.

## Why this differs from production

The production design in `docs/DEPLOYMENT.md` uses ECS Fargate, RDS and an Application Load
Balancer. That provides stronger isolation, managed database operations and high availability, but
it is unnecessarily expensive for the first staging phase.

The single-instance staging design accepts these limitations:

- a server failure temporarily stops both the API and database;
- deployment restarts may cause a short interruption;
- scaling and high availability are intentionally deferred;
- staging data must never be treated as the only copy of business-critical data.

Production must retain a separate database and managed, redundant infrastructure. Staging is not
to be promoted in place to production.

## Expected monthly cost

The current AWS Lightsail bundle price for a 2 GB Linux instance with public IPv4 is USD 12 per
month. The bundle includes 60 GB SSD and 3 TB data transfer. Optional snapshots and DNS/domain
provider costs are additional. The target is to keep the normal staging total below USD 20 per
month, with the existing AWS Budget alert remaining active.

Before provisioning, confirm the displayed price in the AWS console because AWS pricing can
change.

## Security controls

- generate unique database and JWT secrets; never commit them to Git;
- store the runtime environment file with owner-only permissions;
- expose only TCP 80 and 443 publicly;
- restrict SSH to an explicit administrative path and disable password login;
- do not publish PostgreSQL or API container ports directly;
- use HTTPS for every mobile and browser request;
- configure the API CORS allowlist with the exact staging web origin;
- use staging-only users and data;
- redact secrets and authentication tokens from logs;
- take a snapshot before database migrations that may alter existing staging data.

## Provisioning sequence

No step below may be executed until the owner approves the resource plan.

1. Verify AWS SSO access to account `518951787039` using profile `amarok-staging`.
2. Reconfirm the Lightsail bundle price and availability in `eu-central-1`.
3. Create one 2 GB Linux Lightsail instance and attach a static IP.
4. Apply the firewall rules and harden administrative access.
5. Point the two staging DNS records to the static IP.
6. Install Docker and deploy the pinned AMAROK ONE revision.
7. Generate staging secrets on the server and start PostgreSQL, API, web and Caddy.
8. Run Prisma migrations, then create controlled staging test accounts.
9. Verify API health, database health, HTTPS, CORS, login and role restrictions.
10. Set the EAS staging API environment value and run the iOS release readiness check.
11. Only after QA passes, create the signed TestFlight build.

## Acceptance checks

- `https://staging-api.amarok-ce.com/health` reports API and database healthy;
- `https://staging.amarok-ce.com/health` reports the web container healthy;
- TLS certificate is valid and renews automatically;
- no database or API container port is reachable directly from the internet;
- owner and technician staging accounts can log in with the expected permissions;
- technician current task, visit timeline, attendance and GPS queue flows work;
- service restarts preserve PostgreSQL data;
- the iOS staging release check passes with the public HTTPS API URL.

## Rollback and removal

If deployment fails, stop the Compose stack and restore the previous pinned application revision.
If a migration damages staging data, restore the pre-migration snapshot. To stop recurring charges,
delete the Lightsail instance, its static IP and retained snapshots after confirming that no needed
staging data remains.

## Approval boundary

Approval of this document authorizes only the single staging environment described above. It does
not authorize production resources, TestFlight upload, App Store submission, new paid services, or
resources that would raise the expected staging total above USD 20 per month.
