import type { ServiceCallPriority } from "@amarok-one/types";
import type { ServiceManagerBucket } from "./service-manager-dashboard";

export interface ServiceCallsListUrlFilters {
  bucket?: ServiceManagerBucket;
  search?: string;
  priority?: ServiceCallPriority | "";
  assigneeId?: string;
}

const BUCKET_VALUES: readonly ServiceManagerBucket[] = [
  "current",
  "waiting_assignment",
  "in_progress",
  "waiting_for_parts",
  "waiting_manager",
  "completed_today",
];

const PRIORITY_VALUES: readonly ServiceCallPriority[] = ["low", "normal", "high", "urgent"];

function isServiceManagerBucket(value: string): value is ServiceManagerBucket {
  return BUCKET_VALUES.includes(value as ServiceManagerBucket);
}

function isServiceCallPriority(value: string): value is ServiceCallPriority {
  return PRIORITY_VALUES.includes(value as ServiceCallPriority);
}

export function buildServiceCallsListUrl(filters: ServiceCallsListUrlFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.bucket) {
    params.set("bucket", filters.bucket);
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.priority) {
    params.set("priority", filters.priority);
  }
  if (filters.assigneeId) {
    params.set("assignee", filters.assigneeId);
  }
  const query = params.toString();
  return `/service-calls${query ? `?${query}` : ""}`;
}

export function parseServiceCallsListSearchParams(
  searchParams: URLSearchParams,
): ServiceCallsListUrlFilters {
  const filters: ServiceCallsListUrlFilters = {};
  const bucket = searchParams.get("bucket");
  if (bucket && isServiceManagerBucket(bucket)) {
    filters.bucket = bucket;
  }
  const search = searchParams.get("search");
  if (search?.trim()) {
    filters.search = search.trim();
  }
  const priority = searchParams.get("priority");
  if (priority && isServiceCallPriority(priority)) {
    filters.priority = priority;
  }
  const assignee = searchParams.get("assignee");
  if (assignee) {
    filters.assigneeId = assignee;
  }
  return filters;
}
