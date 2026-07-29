import type { WorkflowCommand } from "../domain/workflow-command.js";
import type { WorkflowEvent } from "../domain/workflow-event.js";
import { WorkflowEngine } from "../domain/workflow-engine.js";
import { applyWorkflowEvent } from "../domain/service-call.rehydration.js";
import type {
  WorkflowModuleDependencies,
  WorkflowEventStore,
} from "./ports/workflow-event-store.port.js";

export interface DispatchCommandResult {
  events: readonly WorkflowEvent[];
}

/**
 * Application facade for the workflow bounded context.
 * Not registered in apps/api yet — consumers inject a WorkflowEventStore adapter.
 */
export class WorkflowModule {
  private readonly engine = new WorkflowEngine();
  private readonly eventStore: WorkflowEventStore;
  private readonly clock: WorkflowModuleDependencies["clock"];
  private readonly ids: WorkflowModuleDependencies["ids"];

  constructor(deps: WorkflowModuleDependencies) {
    this.eventStore = deps.eventStore;
    this.clock = deps.clock;
    this.ids = deps.ids;
  }

  async dispatch(command: WorkflowCommand): Promise<DispatchCommandResult> {
    if (command.idempotencyKey && this.eventStore.findByIdempotencyKey) {
      const existing = await this.eventStore.findByIdempotencyKey(
        command.organizationId,
        command.idempotencyKey,
      );
      if (existing && existing.length > 0) {
        return { events: existing };
      }
    }

    const history = await this.eventStore.loadEvents(command.organizationId, command.aggregateId);
    const current = history.length > 0 ? applyWorkflowEvent.rehydrate(history) : null;

    if (command.expectedVersion !== undefined && current) {
      current.assertVersion(command.expectedVersion);
    }

    const { events } = this.engine.execute(current, command, this.clock, this.ids);

    await this.eventStore.appendEvents({
      organizationId: command.organizationId,
      aggregateId: command.aggregateId,
      events,
      expectedVersion: current?.version ?? null,
    });

    return { events };
  }
}
