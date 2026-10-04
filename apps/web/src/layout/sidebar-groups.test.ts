import { describe, expect, it } from "vitest";
import type { ResolvedNavigationItem } from "@amarok-one/permissions";
import { groupNavigationItems, pickDashboardQuickLinks } from "./sidebar-groups";

function item(id: string, to: string, placeholder = false): ResolvedNavigationItem {
  return {
    id,
    to,
    labelKey: "customers",
    permissions: [],
    enabled: true,
    placeholder,
  };
}

describe("groupNavigationItems", () => {
  it("places dashboard links in overview", () => {
    const items = [
      item("dashboard-service", "/dashboard/service"),
      item("service-calls", "/service-calls"),
    ];
    const sections = groupNavigationItems(items);
    expect(sections[0]?.key).toBe("overview");
    expect(sections[0]?.items.map((entry) => entry.id)).toEqual(["dashboard-service"]);
  });

  it("groups operations modules", () => {
    const items = [item("customers", "/customers"), item("equipment", "/equipment")];
    const sections = groupNavigationItems(items);
    expect(sections.some((section) => section.key === "operations")).toBe(true);
  });

  it("keeps accounting as a category within the office workspace", () => {
    const items = [
      item("dashboard-accounting", "/dashboard/accounting"),
      item("customers", "/customers"),
      item("completed-service-calls", "/service-calls?view=completed"),
      item("office-chat", "/messages"),
      item("tasks", "/tasks"),
      item("green-invoice-queries", "/green-invoice-queries"),
    ];

    const sections = groupNavigationItems(items);

    expect(
      sections.find((section) => section.key === "office")?.items.map((entry) => entry.id),
    ).toEqual(["customers", "completed-service-calls", "office-chat", "tasks"]);
    expect(
      sections
        .find((section) => section.key === "officeAccounting")
        ?.items.map((entry) => entry.id),
    ).toEqual(["green-invoice-queries"]);
  });
});

describe("pickDashboardQuickLinks", () => {
  it("prioritizes service workflow routes", () => {
    const items = [
      item("reports", "/reports"),
      item("service-calls", "/service-calls"),
      item("customers", "/customers"),
    ];
    const links = pickDashboardQuickLinks(items, 2);
    expect(links.map((entry) => entry.id)).toEqual(["service-calls", "customers"]);
  });

  it("skips placeholder and dashboard entries", () => {
    const items = [
      item("dashboard-service", "/dashboard/service"),
      item("technicians", "/technicians", true),
      item("customers", "/customers"),
    ];
    const links = pickDashboardQuickLinks(items);
    expect(links.map((entry) => entry.id)).toEqual(["customers"]);
  });
});
