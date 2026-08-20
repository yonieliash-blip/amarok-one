import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@amarok-one/ui/styles.css";
import { AuthProvider } from "./auth/AuthProvider";
import { PermissionRoute, ProtectedRoute, PublicRoute, RootRedirect } from "./auth/ProtectedRoute";
import { AppLayout } from "./layout/AppLayout";
import {
  AccountingDashboardPage,
  ExecutiveDashboardPage,
  ManagementDashboardPage,
  ReadOnlyDashboardPage,
  ServiceDashboardPage,
  WarehouseDashboardPage,
} from "./pages/dashboard/dashboard-routes";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ModulePlaceholderPage } from "./pages/ModulePlaceholderPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { MyServiceCallsPage } from "./pages/my/MyServiceCallsPage";
import { ServiceCallDetailPage } from "./pages/service-calls/ServiceCallDetailPage";
import { ServiceCallFormPage } from "./pages/service-calls/ServiceCallFormPage";
import { ServiceCallsListPage } from "./pages/service-calls/ServiceCallsListPage";
import { EquipmentDetailPage } from "./pages/equipment/EquipmentDetailPage";
import { EquipmentFormPage } from "./pages/equipment/EquipmentFormPage";
import { EquipmentListPage } from "./pages/equipment/EquipmentListPage";
import { CustomerDetailPage } from "./pages/customers/CustomerDetailPage";
import { CustomerFormPage } from "./pages/customers/CustomerFormPage";
import { CustomersListPage } from "./pages/customers/CustomersListPage";
import { MemberAccessPage } from "./pages/administration/MemberAccessPage";
import { TechniciansListPage } from "./pages/technicians/TechniciansListPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route element={<PermissionRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="dashboard/management" element={<ManagementDashboardPage />} />
                <Route path="dashboard/executive" element={<ExecutiveDashboardPage />} />
                <Route path="dashboard/service" element={<ServiceDashboardPage />} />
                <Route path="dashboard/warehouse" element={<WarehouseDashboardPage />} />
                <Route path="dashboard/accounting" element={<AccountingDashboardPage />} />
                <Route path="dashboard/read-only" element={<ReadOnlyDashboardPage />} />
                <Route path="customers" element={<CustomersListPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="customers/:customerId" element={<CustomerDetailPage />} />
                <Route path="customers/:customerId/edit" element={<CustomerFormPage />} />
                <Route path="equipment" element={<EquipmentListPage />} />
                <Route path="equipment/new" element={<EquipmentFormPage />} />
                <Route path="equipment/:equipmentId" element={<EquipmentDetailPage />} />
                <Route path="equipment/:equipmentId/edit" element={<EquipmentFormPage />} />
                <Route path="service-calls" element={<ServiceCallsListPage />} />
                <Route path="service-calls/new" element={<ServiceCallFormPage />} />
                <Route path="service-calls/:serviceCallId" element={<ServiceCallDetailPage />} />
                <Route path="service-calls/:serviceCallId/edit" element={<ServiceCallFormPage />} />
                <Route path="my/service-calls" element={<MyServiceCallsPage />} />
                <Route
                  path="my/equipment"
                  element={<ModulePlaceholderPage titleKey="myEquipment" />}
                />
                <Route
                  path="my/schedule"
                  element={<ModulePlaceholderPage titleKey="mySchedule" />}
                />
                <Route path="technicians" element={<TechniciansListPage />} />
                <Route path="calendar" element={<ModulePlaceholderPage titleKey="calendar" />} />
                <Route path="inventory" element={<ModulePlaceholderPage titleKey="inventory" />} />
                <Route
                  path="purchase-orders"
                  element={<ModulePlaceholderPage titleKey="purchaseOrders" />}
                />
                <Route path="parts" element={<ModulePlaceholderPage titleKey="parts" />} />
                <Route
                  path="accounting"
                  element={<ModulePlaceholderPage titleKey="accounting" />}
                />
                <Route path="reports" element={<ModulePlaceholderPage titleKey="reports" />} />
                <Route path="administration/member-access" element={<MemberAccessPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
