import type { ISODateString } from "./primitives.js";
import type { OrganizationId, ServiceCallId, VisitId } from "./identifiers.js";
import { WorkflowDomainError } from "./domain-error.js";

export type VisitStatus =
  | "assigned"
  | "driving"
  | "working"
  | "finished"
  | "cancelled"
  | "planned"
  | "checked_in"
  | "in_progress"
  | "completed";

export interface VisitProps {
  id: VisitId;
  organizationId: OrganizationId;
  serviceCallId: ServiceCallId;
  sequence: number;
  status: VisitStatus;
  scheduledStart?: ISODateString;
  scheduledEnd?: ISODateString;
  assignedTechnicianId?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Field visit (dispatch / technician execution unit) under a service-call workflow. */
export class Visit {
  readonly id: VisitId;
  readonly organizationId: OrganizationId;
  readonly serviceCallId: ServiceCallId;
  readonly sequence: number;
  readonly status: VisitStatus;
  readonly scheduledStart: ISODateString | undefined;
  readonly scheduledEnd: ISODateString | undefined;
  readonly assignedTechnicianId: string | undefined;
  readonly notes: string | undefined;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;

  private constructor(props: VisitProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.serviceCallId = props.serviceCallId;
    this.sequence = props.sequence;
    this.status = props.status;
    this.scheduledStart = props.scheduledStart;
    this.scheduledEnd = props.scheduledEnd;
    this.assignedTechnicianId = props.assignedTechnicianId;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: VisitProps): Visit {
    if (props.sequence < 1) {
      throw new WorkflowDomainError("INVARIANT_VIOLATION", "Visit sequence must be >= 1", {
        sequence: props.sequence,
      });
    }
    return new Visit(props);
  }

  withStatus(status: VisitStatus, updatedAt: ISODateString): Visit {
    return new Visit({ ...this.toProps(), status, updatedAt });
  }

  toProps(): VisitProps {
    return {
      id: this.id,
      organizationId: this.organizationId,
      serviceCallId: this.serviceCallId,
      sequence: this.sequence,
      status: this.status,
      scheduledStart: this.scheduledStart,
      scheduledEnd: this.scheduledEnd,
      assignedTechnicianId: this.assignedTechnicianId,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
