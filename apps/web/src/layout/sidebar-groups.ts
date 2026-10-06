import type { ResolvedNavigationItem } from "@amarok-one/permissions";

export type NavGroupKey =
  "overview" | "operations" | "field" | "backOffice" | "office" | "officeAccounting";

export interface NavGroupDefinition {
  key: NavGroupKey;
  labelKey:
    | "navGroupOverview"
    | "navGroupOperations"
    | "navGroupField"
    | "navGroupBackOffice"
    | "navGroupOfficeManagement"
    | "navGroupAccounting";
  itemIds: readonly string[];
}

const GROUPS: readonly NavGroupDefinition[] = [
  {
    key: "overview",
    labelKey: "navGroupOverview",
    itemIds: [],
  },
  {
    key: "operations",
    labelKey: "navGroupOperations",
    itemIds: [
      "service-calls",
      "completed-service-calls",
      "my-service-calls",
      "customers",
      "equipment",
      "messages",
      "office-chat",
      "tasks",
      "green-invoice-queries",
    ],
  },
  {
    key: "field",
    labelKey: "navGroupField",
    itemIds: ["my-equipment", "my-schedule", "technicians", "calendar"],
  },
  {
    key: "backOffice",
    labelKey: "navGroupBackOffice",
    itemIds: [
      "inventory",
      "purchase-orders",
      "parts",
      "accounting",
      "reports",
      "member-access",
      "inspiration",
    ],
  },
] as const;

/** Office navigation keeps accounting as a work category within office management. */
const OFFICE_GROUPS: readonly NavGroupDefinition[] = [
  {
    key: "overview",
    labelKey: "navGroupOverview",
    itemIds: [],
  },
  {
    key: "office",
    labelKey: "navGroupOfficeManagement",
    itemIds: [
      "customers",
      "completed-service-calls",
      "office-chat",
      "tasks",
      "document-cases",
      "inspiration",
    ],
  },
  {
    key: "officeAccounting",
    labelKey: "navGroupAccounting",
    itemIds: ["green-invoice-queries"],
  },
] as const;

function isDashboardItem(id: string): boolean {
  return id.startsWith("dashboard-");
}

export interface NavGroupSection {
  key: NavGroupKey;
  labelKey: NavGroupDefinition["labelKey"];
  items: ResolvedNavigationItem[];
}

/** Presentation-only grouping for sidebar navigation. */
export function groupNavigationItems(items: ResolvedNavigationItem[]): NavGroupSection[] {
  const groups = items.some((item) => item.id === "office-chat") ? OFFICE_GROUPS : GROUPS;
  const assigned = new Set<string>();
  const sections: NavGroupSection[] = [];

  const dashboardItems = items.filter((item) => isDashboardItem(item.id));
  for (const item of dashboardItems) {
    assigned.add(item.id);
  }
  if (dashboardItems.length > 0) {
    sections.push({
      key: "overview",
      labelKey: "navGroupOverview",
      items: dashboardItems,
    });
  }

  for (const group of groups) {
    if (group.key === "overview") {
      continue;
    }

    const groupItems = items.filter((item) => group.itemIds.includes(item.id));
    for (const item of groupItems) {
      assigned.add(item.id);
    }

    if (groupItems.length > 0) {
      sections.push({
        key: group.key,
        labelKey: group.labelKey,
        items: groupItems,
      });
    }
  }

  const remainder = items.filter((item) => !assigned.has(item.id));
  if (remainder.length > 0) {
    const primarySection = sections.find((section) =>
      groups === OFFICE_GROUPS ? section.key === "office" : section.key === "operations",
    );
    if (primarySection) {
      primarySection.items = [...primarySection.items, ...remainder];
    } else {
      sections.push({
        key: groups === OFFICE_GROUPS ? "office" : "operations",
        labelKey: groups === OFFICE_GROUPS ? "navGroupOfficeManagement" : "navGroupOperations",
        items: remainder,
      });
    }
  }

  return sections;
}

const QUICK_LINK_PRIORITY = [
  "service-calls",
  "my-service-calls",
  "customers",
  "equipment",
  "my-equipment",
  "calendar",
] as const;

/** Enabled, non-placeholder routes for dashboard shortcuts (presentation only). */
export function pickDashboardQuickLinks(
  items: ResolvedNavigationItem[],
  limit = 4,
): ResolvedNavigationItem[] {
  const eligible = items.filter((item) => !item.placeholder && !isDashboardItem(item.id));
  const byPriority = QUICK_LINK_PRIORITY.flatMap((id) => {
    const match = eligible.find((item) => item.id === id);
    return match ? [match] : [];
  });
  const rest = eligible.filter(
    (item) => !QUICK_LINK_PRIORITY.includes(item.id as (typeof QUICK_LINK_PRIORITY)[number]),
  );
  return [...byPriority, ...rest].slice(0, limit);
}
