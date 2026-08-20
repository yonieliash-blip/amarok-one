import type {
  ServiceCall,
  ServiceCallLifecycleState,
  ServiceCallLifecycleView,
  TechnicianCurrentTask,
} from "@amarok-one/types";
import { apiRequest } from "./client";

function base(organizationId: string): string {
  return `/organizations/${organizationId}/service-calls`;
}

export async function listMyServiceCalls(
  organizationId: string,
  accessToken: string,
): Promise<ServiceCall[]> {
  const response = await apiRequest<ServiceCall[]>(`${base(organizationId)}?pageSize=100`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function getServiceCall(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
): Promise<ServiceCall> {
  const response = await apiRequest<ServiceCall>(`${base(organizationId)}/${serviceCallId}`, {
    accessToken,
  });
  return response.data;
}

export async function getServiceCallLifecycle(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${base(organizationId)}/${serviceCallId}/lifecycle`,
    { accessToken },
  );
  return response.data;
}

export async function getTechnicianCurrentTask(
  organizationId: string,
  accessToken: string,
): Promise<TechnicianCurrentTask | null> {
  const response = await apiRequest<TechnicianCurrentTask | null>(
    `${base(organizationId)}/current-task`,
    { accessToken },
  );
  return response.data;
}

export async function patchServiceCallNotes(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
  notes: string,
): Promise<ServiceCall> {
  const response = await apiRequest<ServiceCall>(`${base(organizationId)}/${serviceCallId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ notes }),
  });
  return response.data;
}

export async function startVisitDriving(
  organizationId: string,
  serviceCallId: string,
  visitId: string,
  accessToken: string,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${base(organizationId)}/${serviceCallId}/visits/${visitId}/driving`,
    { method: "POST", accessToken },
  );
  return response.data;
}

export async function startVisitWorking(
  organizationId: string,
  serviceCallId: string,
  visitId: string,
  accessToken: string,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${base(organizationId)}/${serviceCallId}/visits/${visitId}/working`,
    { method: "POST", accessToken },
  );
  return response.data;
}

export type FinishVisitOutcome = "dispatcher" | "waiting_for_parts";

export function nextLifecycleForFinishOutcome(
  outcome: FinishVisitOutcome,
): ServiceCallLifecycleState {
  return outcome === "waiting_for_parts" ? "waiting_for_parts" : "waiting_assignment";
}

export async function finishVisit(
  organizationId: string,
  serviceCallId: string,
  visitId: string,
  accessToken: string,
  outcome: FinishVisitOutcome,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${base(organizationId)}/${serviceCallId}/visits/${visitId}/finish`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        nextLifecycleState: nextLifecycleForFinishOutcome(outcome),
      }),
    },
  );
  return response.data;
}
