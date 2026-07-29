import type { ISODateString } from "./primitives.js";
import type { OrganizationId, ServiceCallId, WorkflowCommandId } from "./identifiers.js";
import { WorkflowDomainError } from "./domain-error.js";

export type WorkflowCommandType =
  | "InitializeServiceCallWorkflow"
  | "ChangeWorkflowState"
  | "AlignWorkflowStateToKey"
  | "RecordOperationalStatusChange"
  | "ScheduleVisit"
  | "AssignTechnicianToVisit"
  | "TransitionServiceCallLifecycle"
  | "CloseServiceCall"
  | "StartVisit"
  | "StartVisitDriving"
  | "StartVisitWorking"
  | "CompleteVisit"
  | "FinishVisit"
  | "CancelVisit";

export interface WorkflowCommandProps {
  id: WorkflowCommandId;
  organizationId: OrganizationId;
  aggregateId: ServiceCallId;
  type: WorkflowCommandType;
  payload: Record<string, unknown>;
  issuedAt: ISODateString;
  issuerId?: string;
  idempotencyKey?: string;
  expectedVersion?: number;
}

/** Intent to mutate workflow state; handled by the domain engine (not an event). */
export class WorkflowCommand {
  readonly id: WorkflowCommandId;
  readonly organizationId: OrganizationId;
  readonly aggregateId: ServiceCallId;
  readonly type: WorkflowCommandType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly issuedAt: ISODateString;
  readonly issuerId: string | undefined;
  readonly idempotencyKey: string | undefined;
  readonly expectedVersion: number | undefined;

  private constructor(props: WorkflowCommandProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.aggregateId = props.aggregateId;
    this.type = props.type;
    this.payload = Object.freeze({ ...props.payload });
    this.issuedAt = props.issuedAt;
    this.issuerId = props.issuerId;
    this.idempotencyKey = props.idempotencyKey;
    this.expectedVersion = props.expectedVersion;
  }

  static create(props: WorkflowCommandProps): WorkflowCommand {
    if (!props.organizationId || !props.aggregateId) {
      throw new WorkflowDomainError(
        "INVALID_COMMAND",
        "organizationId and aggregateId are required",
      );
    }
    return new WorkflowCommand(props);
  }
}
