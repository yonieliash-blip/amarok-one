import type { OrganizationId, ServiceCallId } from "../../domain/identifiers.js";
import type { WorkflowEvent } from "../../domain/workflow-event.js";
import { WorkflowDomainError } from "../../domain/domain-error.js";
import type {
  AppendWorkflowEventsInput,
  WorkflowEventStore,
} from "../../application/ports/workflow-event-store.port.js";

interface StreamKey {
  organizationId: OrganizationId;
  aggregateId: ServiceCallId;
}

function streamKey(input: StreamKey): string {
  return `${input.organizationId}:${input.aggregateId}`;
}

/**
 * Test/dev adapter — not for production multi-instance deployments.
 * Production will use PostgreSQL (Prisma) or dedicated event store table.
 */
export class InMemoryWorkflowEventStore implements WorkflowEventStore {
  private readonly streams = new Map<string, WorkflowEvent[]>();
  private readonly idempotency = new Map<string, WorkflowEvent[]>();

  async loadEvents(
    organizationId: OrganizationId,
    aggregateId: ServiceCallId,
  ): Promise<WorkflowEvent[]> {
    return [...(this.streams.get(streamKey({ organizationId, aggregateId })) ?? [])];
  }

  async appendEvents(input: AppendWorkflowEventsInput): Promise<void> {
    const key = streamKey({
      organizationId: input.organizationId,
      aggregateId: input.aggregateId,
    });
    const existing = this.streams.get(key) ?? [];

    if (input.expectedVersion !== null && existing.length !== input.expectedVersion) {
      throw new WorkflowDomainError("AGGREGATE_VERSION_CONFLICT", "Concurrent write detected", {
        expectedVersion: input.expectedVersion,
        actualVersion: existing.length,
      });
    }

    const next = [...existing, ...input.events];
    this.streams.set(key, next);

    for (const event of input.events) {
      const idempotencyKey = event.correlationId;
      if (!this.idempotency.has(idempotencyKey)) {
        this.idempotency.set(idempotencyKey, [event]);
      }
    }
  }

  async findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<readonly WorkflowEvent[] | null> {
    void organizationId;
    return this.idempotency.get(idempotencyKey) ?? null;
  }
}
