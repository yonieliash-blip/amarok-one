import type { Task, TaskAssignee, TaskPriority, TaskStatus } from "@amarok-one/types";
import { apiRequest } from "./api-client";

function base(organizationId: string): string {
  return `/organizations/${organizationId}/tasks`;
}

export function listTasksRequest(
  organizationId: string,
  accessToken: string,
  filters: {
    status?: TaskStatus;
    assignedToId?: string;
    dueOn?: string;
    includeArchived?: boolean;
  } = {},
): Promise<{ data: Task[] }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assignedToId) params.set("assignedToId", filters.assignedToId);
  if (filters.dueOn) params.set("dueOn", filters.dueOn);
  if (filters.includeArchived) params.set("includeArchived", "true");
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return apiRequest<Task[]>(`${base(organizationId)}${query}`, { accessToken });
}

export async function listTaskAssigneesRequest(
  organizationId: string,
  accessToken: string,
): Promise<TaskAssignee[]> {
  const response = await apiRequest<TaskAssignee[]>(`${base(organizationId)}/assignees`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function createTaskRequest(
  organizationId: string,
  accessToken: string,
  input: {
    title: string;
    description?: string;
    assignedToId: string;
    priority: TaskPriority;
    dueAt?: string;
    linkUrl?: string;
  },
): Promise<Task> {
  const response = await apiRequest<Task>(base(organizationId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateTaskRequest(
  organizationId: string,
  accessToken: string,
  taskId: string,
  input: { status: TaskStatus; completionNote?: string },
): Promise<Task> {
  const response = await apiRequest<Task>(`${base(organizationId)}/${taskId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}
