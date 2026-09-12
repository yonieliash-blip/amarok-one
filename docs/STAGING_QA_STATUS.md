# AMAROK ONE — Staging QA Status

**Environment:** Staging only  
**Region:** eu-central-1  
**Web:** https://staging.amarok-ce.com  
**API:** https://staging-api.amarok-ce.com  
**Production:** Not touched

## Current staging state

- Staging infrastructure is active behind HTTPS.
- Web and API health checks are reachable and the API reports database connectivity.
- Docker services previously verified healthy: PostgreSQL, API, web, Caddy.
- Demo seed is present.

## Verified end-to-end service-call workflow

The central service-call lifecycle has passed an end-to-end staging check:

1. Owner login.
2. Service-call list loaded.
3. Opened `SC-003`.
4. Assigned Demo Technician.
5. Technician login.
6. Assigned call appeared for technician.
7. Start driving succeeded.
8. Start work succeeded.
9. Finish visit / send for manager closure succeeded.
10. Owner login.
11. Closing `SC-003` succeeded.
12. Timeline showed create, assign, driving, work start, visit finish and service-call close milestones.

## Member module access

A temporary Inventory module grant was used to verify modular access for Demo Technician.

Runtime verification confirmed:

- Inventory navigation appeared while the temporary grant was enabled.
- `/inventory` was reachable while the temporary grant was enabled.
- Inventory is currently still a placeholder module.
- The temporary grant was removed again.
- Final Demo Technician module state was re-opened and verified after save:
  - `core`: enabled
  - `service`: disabled
  - `inventory`: disabled
  - `finance`: disabled
  - `administration`: disabled

## Attendance reporting

The staging `/reports` page was verified as Demo Owner.

Observed state for `2026-09`:

- Monthly Hours Report loads without an access error.
- Month is shown as open for editing.
- No attendance records currently exist for the month.
- Empty state explains that rows will appear after employees start reporting work days.
- Controls are visible for CSV export, PDF generation and month locking.

## Existing automated regression coverage in the repository

The repository already includes scripts/tests covering the critical authorization and tenant boundaries:

- `apps/api/scripts/verify-tenant-context-regression.ts`
  - owner and service-manager service-call access
  - technician assignee denial
  - technician scoped service-call listing
  - cross-tenant service-call request expected to return `403`
  - owner member-access listing
- `apps/api/scripts/verify-modular-auth-acceptance.ts`
  - enabled module expectations
  - finance/inventory route denial for non-entitled roles
  - navigation filtering
  - API permission checks
  - cross-tenant request expected to return `403`
- `apps/api/scripts/verify-member-module-access.ts`
  - owner module changes
  - persistence after add/remove
  - non-owner module-write denial
  - owner invariant
  - audit-log recording
- `apps/api/src/modules/attendance/attendance.service.test.ts`
  - duplicate active day prevention
  - start location + server time
  - end-work-day break completion
  - monthly gross/break/net calculations
  - period locking rules
  - locked-period correction denial
  - tenant-scoped GPS sampling and route reads

## Still pending before pilot sign-off

The following runtime checks are still required on the deployed staging environment:

- Technician login with Core-only state and direct `/inventory` denial/redirect confirmation.
- Runtime cross-tenant request verification against staging.
- Start Work Day / End Work Day runtime verification against staging, followed by confirmation that the resulting row appears in the monthly report.
- Final release-readiness pass before creating the TestFlight build for the first employee pilot.

## Product requirement captured during QA

Technician inventory must not be presented as generic `Inventory` / `מלאי`.

Future implementation must support a real vehicle/van entity and technician-to-van assignment so the technician sees a dedicated mobile-stock context such as:

`מלאי בניידת – ניידת 12`

Requirements:

- no hard-coded van number;
- each van has its own stock;
- technician stock view follows the currently assigned van;
- central/warehouse inventory remains distinct from technician van inventory.
