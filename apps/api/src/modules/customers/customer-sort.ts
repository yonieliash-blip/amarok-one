import type { Prisma } from "@prisma/client";

export const CUSTOMER_SORT_FIELDS = [
  "name",
  "customerNumber",
  "status",
  "city",
  "createdAt",
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];
export type CustomerSortOrder = "asc" | "desc";

export const DEFAULT_CUSTOMER_SORT_FIELD: CustomerSortField = "createdAt";
export const DEFAULT_CUSTOMER_SORT_ORDER: CustomerSortOrder = "desc";

export function buildCustomerListOrderBy(
  sortBy?: CustomerSortField,
  sortOrder?: CustomerSortOrder,
): Prisma.CustomerOrderByWithRelationInput[] {
  const field = sortBy ?? DEFAULT_CUSTOMER_SORT_FIELD;
  const order =
    sortOrder ?? (field === DEFAULT_CUSTOMER_SORT_FIELD ? DEFAULT_CUSTOMER_SORT_ORDER : "asc");

  return [{ [field]: order }];
}
