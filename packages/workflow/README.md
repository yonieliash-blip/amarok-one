# @amarok-one/workflow

Workflow Engine foundation (Sprint 1) — **isolated bounded context**.

This package is **not wired** into `apps/api` or `apps/web` yet. It provides domain models, a command/event engine, application ports, and an in-memory event store for tests.

## Layers

| Layer          | Path                  | Role                                      |
| -------------- | --------------------- | ----------------------------------------- |
| Domain         | `src/domain/`         | Entities, value objects, `WorkflowEngine` |
| Application    | `src/application/`    | `WorkflowModule` facade, outbound ports   |
| Infrastructure | `src/infrastructure/` | Adapters (in-memory event store)          |

## Integration (future)

1. Add Prisma `workflow_events` table and `PrismaWorkflowEventStore` implementing `WorkflowEventStore`.
2. On service-call create/update in `apps/api`, dispatch workflow commands via `WorkflowModule` (anti-corruption mapping from API `ServiceCallStatus` to `WorkflowStateKey`).
3. Expose read APIs / projections from replayed events when needed.

See repository architecture report for alignment decisions pending approval.
