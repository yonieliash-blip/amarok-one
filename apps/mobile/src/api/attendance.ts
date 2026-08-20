import { apiRequest } from "./client";

export interface ClockLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
export interface WorkBreak {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  startedAt: string;
  endedAt: string | null;
}
export interface WorkDay {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  startedAt: string;
  endedAt: string | null;
  breaks: WorkBreak[];
}

function base(organizationId: string): string {
  return `/organizations/${organizationId}/attendance`;
}

export async function getCurrentWorkDay(
  organizationId: string,
  accessToken: string,
): Promise<WorkDay | null> {
  return (await apiRequest<WorkDay | null>(`${base(organizationId)}/current`, { accessToken }))
    .data;
}

async function action(
  organizationId: string,
  accessToken: string,
  path: string,
  location: ClockLocation | null,
): Promise<WorkDay> {
  return (
    await apiRequest<WorkDay>(`${base(organizationId)}${path}`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ location }),
    })
  ).data;
}

export const startWorkDay = (
  organizationId: string,
  token: string,
  location: ClockLocation | null,
) => action(organizationId, token, "/start", location);
export const endWorkDay = (organizationId: string, token: string, location: ClockLocation | null) =>
  action(organizationId, token, "/end", location);
export const startBreak = (organizationId: string, token: string, location: ClockLocation | null) =>
  action(organizationId, token, "/breaks/start", location);
export const endBreak = (organizationId: string, token: string, location: ClockLocation | null) =>
  action(organizationId, token, "/breaks/end", location);
