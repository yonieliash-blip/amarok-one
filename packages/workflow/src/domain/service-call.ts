import type { ISODateString } from "./primitives.js";
import type { OrganizationId, ServiceCallId } from "./identifiers.js";
import { WorkflowDomainError } from "./domain-error.js";
import type { Visit } from "./visit.js";
import { WorkflowState, type WorkflowStateKey } from "./workflow-state.js";
import { ServiceCallLifecycle } from "./service-call-lifecycle.js";

export interface ServiceCallProps {
  id: ServiceCallId;
  organizationId: OrganizationId;
  /** Reference to the operational ServiceCall row in apps/api (same UUID by convention). */
  externalServiceCallId: ServiceCallId;
  state: WorkflowState;
  lifecycle: ServiceCallLifecycle;
  visits: readonly Visit[];
  version: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Service-call workflow aggregate root (workflow bounded context).
 * Distinct from @amarok-one/types ServiceCall API DTO.
 */
export class ServiceCall {
  readonly id: ServiceCallId;
  readonly organizationId: OrganizationId;
  readonly externalServiceCallId: ServiceCallId;
  readonly state: WorkflowState;
  readonly lifecycle: ServiceCallLifecycle;
  readonly visits: readonly Visit[];
  readonly version: number;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;

  private constructor(props: ServiceCallProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.externalServiceCallId = props.externalServiceCallId;
    this.state = props.state;
    this.lifecycle = props.lifecycle;
    this.visits = Object.freeze([...props.visits]);
    this.version = props.version;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ServiceCallProps): ServiceCall {
    if (props.version < 0) {
      throw new WorkflowDomainError("INVARIANT_VIOLATION", "version must be >= 0");
    }
    return new ServiceCall(props);
  }

  withPatch(patch: Partial<ServiceCallProps>): ServiceCall {
    return ServiceCall.create({
      id: this.id,
      organizationId: this.organizationId,
      externalServiceCallId: this.externalServiceCallId,
      state: patch.state ?? this.state,
      lifecycle: patch.lifecycle ?? this.lifecycle,
      visits: patch.visits ?? this.visits,
      version: patch.version ?? this.version,
      createdAt: patch.createdAt ?? this.createdAt,
      updatedAt: patch.updatedAt ?? this.updatedAt,
    });
  }

  findVisit(visitId: string): Visit | undefined {
    return this.visits.find((visit) => visit.id === visitId);
  }

  assertVersion(expected: number | undefined): void {
    if (expected === undefined) {
      return;
    }
    if (expected !== this.version) {
      throw new WorkflowDomainError("AGGREGATE_VERSION_CONFLICT", "Aggregate version mismatch", {
        expected,
        actual: this.version,
      });
    }
  }

  toProps(): ServiceCallProps {
    return {
      id: this.id,
      organizationId: this.organizationId,
      externalServiceCallId: this.externalServiceCallId,
      state: this.state,
      lifecycle: this.lifecycle,
      visits: this.visits,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function isWorkflowStateKey(value: string): value is WorkflowStateKey {
  return (
    value === "draft" ||
    value === "dispatching" ||
    value === "scheduled" ||
    value === "in_field" ||
    value === "waiting" ||
    value === "completed" ||
    value === "cancelled"
  );
}
