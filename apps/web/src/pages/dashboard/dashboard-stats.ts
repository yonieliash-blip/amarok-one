import type { DashboardKind } from "@amarok-one/permissions";
import type { TranslationMessages } from "../../i18n/types";

type DashboardMessages = TranslationMessages["dashboard"];
type StatKey =
  | "activeUsers"
  | "openServiceCalls"
  | "organizations"
  | "customers"
  | "revenue"
  | "openCalls"
  | "scheduledToday"
  | "completedWeek"
  | "stockItems"
  | "lowStock"
  | "pendingOrders"
  | "openInvoices"
  | "paymentsDue"
  | "monthlyRevenue"
  | "viewableRecords"
  | "recentUpdates"
  | "availableReports";

type DashboardStatKey = keyof Pick<
  DashboardMessages,
  | "stat_activeUsers_title"
  | "stat_activeUsers_description"
  | "stat_openServiceCalls_title"
  | "stat_openServiceCalls_description"
  | "stat_organizations_title"
  | "stat_organizations_description"
  | "stat_customers_title"
  | "stat_customers_description"
  | "stat_revenue_title"
  | "stat_revenue_description"
  | "stat_openCalls_title"
  | "stat_openCalls_description"
  | "stat_scheduledToday_title"
  | "stat_scheduledToday_description"
  | "stat_completedWeek_title"
  | "stat_completedWeek_description"
  | "stat_stockItems_title"
  | "stat_stockItems_description"
  | "stat_lowStock_title"
  | "stat_lowStock_description"
  | "stat_pendingOrders_title"
  | "stat_pendingOrders_description"
  | "stat_openInvoices_title"
  | "stat_openInvoices_description"
  | "stat_paymentsDue_title"
  | "stat_paymentsDue_description"
  | "stat_monthlyRevenue_title"
  | "stat_monthlyRevenue_description"
  | "stat_viewableRecords_title"
  | "stat_viewableRecords_description"
  | "stat_recentUpdates_title"
  | "stat_recentUpdates_description"
  | "stat_availableReports_title"
  | "stat_availableReports_description"
>;

const STAT_TITLE_KEYS: Record<StatKey, DashboardStatKey> = {
  activeUsers: "stat_activeUsers_title",
  openServiceCalls: "stat_openServiceCalls_title",
  organizations: "stat_organizations_title",
  customers: "stat_customers_title",
  revenue: "stat_revenue_title",
  openCalls: "stat_openCalls_title",
  scheduledToday: "stat_scheduledToday_title",
  completedWeek: "stat_completedWeek_title",
  stockItems: "stat_stockItems_title",
  lowStock: "stat_lowStock_title",
  pendingOrders: "stat_pendingOrders_title",
  openInvoices: "stat_openInvoices_title",
  paymentsDue: "stat_paymentsDue_title",
  monthlyRevenue: "stat_monthlyRevenue_title",
  viewableRecords: "stat_viewableRecords_title",
  recentUpdates: "stat_recentUpdates_title",
  availableReports: "stat_availableReports_title",
};

const STAT_DESCRIPTION_KEYS: Record<StatKey, DashboardStatKey> = {
  activeUsers: "stat_activeUsers_description",
  openServiceCalls: "stat_openServiceCalls_description",
  organizations: "stat_organizations_description",
  customers: "stat_customers_description",
  revenue: "stat_revenue_description",
  openCalls: "stat_openCalls_description",
  scheduledToday: "stat_scheduledToday_description",
  completedWeek: "stat_completedWeek_description",
  stockItems: "stat_stockItems_description",
  lowStock: "stat_lowStock_description",
  pendingOrders: "stat_pendingOrders_description",
  openInvoices: "stat_openInvoices_description",
  paymentsDue: "stat_paymentsDue_description",
  monthlyRevenue: "stat_monthlyRevenue_description",
  viewableRecords: "stat_viewableRecords_description",
  recentUpdates: "stat_recentUpdates_description",
  availableReports: "stat_availableReports_description",
};

export const STAT_CARD_KEYS: Record<DashboardKind, readonly StatKey[]> = {
  management: ["activeUsers", "openServiceCalls", "organizations"],
  executive: ["customers", "openServiceCalls", "revenue"],
  service: ["openCalls", "scheduledToday", "completedWeek"],
  warehouse: ["stockItems", "lowStock", "pendingOrders"],
  accounting: ["openInvoices", "paymentsDue", "monthlyRevenue"],
  "read-only": ["viewableRecords", "recentUpdates", "availableReports"],
};

export function statCardTitleKey(statKey: StatKey): DashboardStatKey {
  return STAT_TITLE_KEYS[statKey];
}

export function statCardDescriptionKey(statKey: StatKey): DashboardStatKey {
  return STAT_DESCRIPTION_KEYS[statKey];
}

export type { StatKey };
