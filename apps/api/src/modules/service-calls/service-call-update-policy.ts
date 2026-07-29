import { badRequest } from "../../lib/errors.js";
import type { CreateServiceCallInput, UpdateServiceCallInput } from "./service-call.schemas.js";

/** Fields that mutate lifecycle — only allowed via workflow lifecycle API. */
export const SERVICE_CALL_LIFECYCLE_PATCH_FIELDS = [
  "status",
  "assignedUserId",
  "completedAt",
] as const satisfies readonly (keyof UpdateServiceCallInput)[];

/** Technician may update only field notes on assigned service calls. */
export const TECHNICIAN_SERVICE_CALL_PATCH_FIELDS = [
  "notes",
  "contactName",
  "contactPhone",
  "location",
] as const satisfies readonly (keyof UpdateServiceCallInput)[];

export const CREATE_LIFECYCLE_FORBIDDEN_FIELDS = [
  "status",
  "assignedUserId",
  "completedAt",
] as const satisfies readonly (keyof CreateServiceCallInput)[];

function keysOf(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => input[key] !== undefined);
}

export function assertCreateServiceCallHasNoLifecycleFields(input: CreateServiceCallInput): void {
  const forbidden = keysOf(input as Record<string, unknown>).filter((key) =>
    (CREATE_LIFECYCLE_FORBIDDEN_FIELDS as readonly string[]).includes(key),
  );
  if (forbidden.length > 0) {
    throw badRequest(
      "Service call lifecycle fields must use the lifecycle API (assign, transition, close)",
      { fields: forbidden },
    );
  }
}

export function assertControlCenterPatchHasNoLifecycleFields(input: UpdateServiceCallInput): void {
  const forbidden = keysOf(input as Record<string, unknown>).filter((key) =>
    (SERVICE_CALL_LIFECYCLE_PATCH_FIELDS as readonly string[]).includes(key),
  );
  if (forbidden.length > 0) {
    throw badRequest(
      "Service call lifecycle changes must use POST /lifecycle/* and visit endpoints",
      { fields: forbidden },
    );
  }
}

export function assertTechnicianPatchAllowed(input: UpdateServiceCallInput): void {
  const provided = keysOf(input as Record<string, unknown>);
  const forbidden = provided.filter(
    (key) => !(TECHNICIAN_SERVICE_CALL_PATCH_FIELDS as readonly string[]).includes(key),
  );
  if (forbidden.length > 0) {
    throw badRequest(
      "Technicians may only update field notes and contact details on service calls",
      {
        fields: forbidden,
      },
    );
  }
}

export function pickTechnicianPatch(input: UpdateServiceCallInput): UpdateServiceCallInput {
  return {
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
    ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
  };
}

export function pickControlCenterPatch(input: UpdateServiceCallInput): UpdateServiceCallInput {
  assertControlCenterPatchHasNoLifecycleFields(input);
  return input;
}
