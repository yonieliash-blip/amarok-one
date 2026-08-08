import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  "dashboard-management": LayoutDashboard,
  "dashboard-executive": LayoutDashboard,
  "dashboard-service": LayoutDashboard,
  "dashboard-warehouse": LayoutDashboard,
  "dashboard-accounting": LayoutDashboard,
  "dashboard-read-only": LayoutDashboard,
  "service-calls": ClipboardList,
  "my-service-calls": Wrench,
  customers: Users,
  equipment: Truck,
  "my-equipment": Truck,
  "my-schedule": Calendar,
  technicians: UserCog,
  calendar: Calendar,
  inventory: Package,
  "purchase-orders": ShoppingCart,
  parts: Package,
  accounting: FileText,
  reports: BarChart3,
  "member-access": UserCog,
};

interface NavIconProps {
  itemId: string;
  className?: string;
}

export function NavIcon({ itemId, className }: NavIconProps) {
  const Icon = NAV_ICON_MAP[itemId] ?? ClipboardList;
  return <Icon className={className} size={20} strokeWidth={1.75} aria-hidden="true" />;
}
