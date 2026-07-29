import type { Prisma, PrismaClient } from "@prisma/client";
import {
  WorkflowDomainError,
  applyWorkflowEvent,
  type AppendWorkflowEventsInput,
  type OrganizationId,
  type ServiceCallId,
  type WorkflowEvent,
  type WorkflowEventStore,
} from "@amarok-one/workflow";

export type WorkflowPrismaClient = PrismaClient | Prisma.TransactionClient;

function isRootPrismaClient(client: WorkflowPrismaClient): client is PrismaClient {
  return typeof (client as PrismaClient).$transaction === "function";
}

function toDomainEvent(row: {
  id: string;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: Prisma.JsonValue;
  occurredAt: Date;
  actorId: string | null;
  correlationId: string;
  causationId: string | null;
  sequence: number;
}): WorkflowEvent {
  const payload =
    row.payload !== null && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};

  return applyWorkflowEvent.eventFromFact({
    id: row.id,
    organizationId: row.organizationId,
    aggregateId: row.aggregateId,
    type: row.type as Parameters<typeof applyWorkflowEvent.eventFromFact>[0]["type"],
    payload,
    occurredAt: row.occurredAt.toISOString(),
    actorId: row.actorId ?? undefined,
    correlationId: row.correlationId,
    causationId: row.causationId ?? undefined,
    sequence: row.sequence,
  });
}

async function appendEventsWithClient(
  client: WorkflowPrismaClient,
  input: AppendWorkflowEventsInput,
): Promise<void> {
  const existingCount = await client.workflowEvent.count({
    where: {
      organizationId: input.organizationId,
      aggregateId: input.aggregateId,
    },
  });

  if (input.expectedVersion !== null && existingCount !== input.expectedVersion) {
    throw new WorkflowDomainError("AGGREGATE_VERSION_CONFLICT", "Concurrent write detected", {
      expectedVersion: input.expectedVersion,
      actualVersion: existingCount,
    });
  }

  for (const event of input.events) {
    await client.workflowEvent.create({
      data: {
        id: event.id,
        organizationId: event.organizationId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
        occurredAt: new Date(event.occurredAt),
        actorId: event.actorId ?? null,
        correlationId: event.correlationId,
        causationId: event.causationId ?? null,
        sequence: event.sequence,
        idempotencyKey: event.correlationId,
      },
    });
  }
}

export class PrismaWorkflowEventStore implements WorkflowEventStore {
  constructor(private readonly client: WorkflowPrismaClient) {}

  async loadEvents(
    organizationId: OrganizationId,
    aggregateId: ServiceCallId,
  ): Promise<WorkflowEvent[]> {
    const rows = await this.client.workflowEvent.findMany({
      where: { organizationId, aggregateId },
      orderBy: { sequence: "asc" },
    });
    return rows.map(toDomainEvent);
  }

  async appendEvents(input: AppendWorkflowEventsInput): Promise<void> {
    if (isRootPrismaClient(this.client)) {
      await this.client.$transaction(async (tx) => appendEventsWithClient(tx, input));
      return;
    }

    await appendEventsWithClient(this.client, input);
  }

  async findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<readonly WorkflowEvent[] | null> {
    const rows = await this.client.workflowEvent.findMany({
      where: { organizationId, idempotencyKey },
      orderBy: { sequence: "asc" },
    });

    if (rows.length === 0) {
      return null;
    }

    return rows.map(toDomainEvent);
  }
}

export function createWorkflowRuntimeIds(): {
  nextEventId: () => string;
  nextStateId: () => string;
  nextVisitId: () => string;
} {
  return {
    nextEventId: () => crypto.randomUUID(),
    nextStateId: () => crypto.randomUUID(),
    nextVisitId: () => crypto.randomUUID(),
  };
}

export function createWorkflowClock(): { now: () => string } {
  return {
    now: () => new Date().toISOString(),
  };
}
