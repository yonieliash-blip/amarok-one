/** Shared domain identifiers */
export type EntityId = string;

/** ISO 8601 timestamp string */
export type ISODateString = string;

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
}

/** Standard API error shape */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Health check response */
export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  service: string;
  timestamp: ISODateString;
}

/** Equipment operational status */
export type EquipmentStatus = "active" | "in_service" | "out_of_service" | "retired";

/** Tenant-scoped equipment category */
export interface EquipmentType {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  description?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Equipment asset record */
export interface Equipment {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  internalNumber: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  equipmentTypeId: EntityId;
  equipmentType?: Pick<EquipmentType, "id" | "name" | "code">;
  customerId?: EntityId;
  customer?: Pick<Customer, "id" | "name" | "customerNumber">;
  branchId?: EntityId;
  branch?: Pick<Branch, "id" | "name" | "code">;
  status: EquipmentStatus;
  engineHours?: number;
  mileage?: number;
  registrationNumber?: string;
  warrantyEndDate?: ISODateString;
  location?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Equipment with related entities */
export type EquipmentDetail = Equipment;

/** User role within the system */
export type UserRole = "admin" | "manager" | "technician" | "viewer";

/** Organization (tenant root) */
export interface Organization {
  id: EntityId;
  name: string;
  slug: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Company within an organization */
export interface Company {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  legalName?: string;
  taxId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Branch belonging to a company */
export interface Branch {
  id: EntityId;
  organizationId: EntityId;
  companyId: EntityId;
  name: string;
  code: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Customer account status */
export type CustomerStatus = "active" | "inactive" | "prospect";

/** Tenant-scoped customer */
export interface Customer {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  customerNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  status: CustomerStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Contact person for a customer */
export interface CustomerContact {
  id: EntityId;
  organizationId: EntityId;
  customerId: EntityId;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Customer with nested contacts */
export interface CustomerDetail extends Customer {
  contacts: CustomerContact[];
}

/** Service call lifecycle status */
export type ServiceCallStatus =
  "open" | "scheduled" | "in_progress" | "waiting_for_parts" | "completed" | "cancelled";

/** Control-center lifecycle (Sprint 4). */
export type ServiceCallLifecycleState =
  | "new"
  | "waiting_assignment"
  | "assigned"
  | "driving"
  | "working"
  | "waiting_for_parts"
  | "waiting_customer"
  | "waiting_specialist"
  | "waiting_manager_closure"
  | "closed";

export type ServiceCallVisitStatus =
  | "planned"
  | "assigned"
  | "driving"
  | "working"
  | "finished"
  | "cancelled"
  | "checked_in"
  | "in_progress"
  | "completed";

/** Technician visit on a service call. */
export interface ServiceCallVisit {
  id: EntityId;
  organizationId: EntityId;
  serviceCallId: EntityId;
  technicianId: EntityId;
  technician?: Pick<OrganizationMember, "id" | "email" | "displayName">;
  sequence: number;
  status: ServiceCallVisitStatus;
  scheduledStart?: ISODateString;
  scheduledEnd?: ISODateString;
  drivingStartedAt?: ISODateString;
  workingStartedAt?: ISODateString;
  finishedAt?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Workflow timeline entry (immutable transition fact). */
export interface ServiceCallTimelineEvent {
  id: EntityId;
  type: string;
  sequence: number;
  occurredAt: ISODateString;
  actorId?: EntityId;
  payload: Record<string, unknown>;
}

/** Lifecycle view returned by dedicated endpoints. */
export interface ServiceCallLifecycleView {
  serviceCallId: EntityId;
  lifecycleState: ServiceCallLifecycleState;
  availableTransitions: ServiceCallLifecycleState[];
  visits: ServiceCallVisit[];
  timeline: ServiceCallTimelineEvent[];
}

/** Single-call projection used by a technician's current-task screen. */
export interface TechnicianCurrentTask {
  serviceCall: ServiceCall;
  visit: ServiceCallVisit;
}

/** Service call urgency */
export type ServiceCallPriority = "low" | "normal" | "high" | "urgent";

/** Organization member available for assignment */
export interface OrganizationMember {
  id: EntityId;
  email: string;
  displayName: string;
  role: {
    id: EntityId;
    slug: string;
    name: string;
  };
}

/** Field service work order */
export interface ServiceCall {
  id: EntityId;
  organizationId: EntityId;
  serviceCallNumber: string;
  title: string;
  description?: string;
  status: ServiceCallStatus;
  lifecycleState: ServiceCallLifecycleState;
  priority: ServiceCallPriority;
  openedAt: ISODateString;
  scheduledAt?: ISODateString;
  completedAt?: ISODateString;
  customerId: EntityId;
  customer?: Pick<Customer, "id" | "name" | "customerNumber">;
  equipmentId: EntityId;
  equipment?: Pick<Equipment, "id" | "name" | "internalNumber" | "manufacturer" | "model">;
  branchId?: EntityId;
  branch?: Pick<Branch, "id" | "name" | "code">;
  assignedUserId?: EntityId;
  assignedUser?: Pick<OrganizationMember, "id" | "email" | "displayName">;
  contactName?: string;
  contactPhone?: string;
  location?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Permission definition */
export interface Permission {
  id: EntityId;
  slug: string;
  name: string;
  description?: string;
}

/** Role summary attached to an authenticated user */
export interface AuthRole {
  id: EntityId;
  slug: string;
  name: string;
}

/** Module key granted to an organization member */
export type MemberModuleKey = "core" | "service" | "inventory" | "finance" | "administration";

/** Authenticated user profile with tenant context */
export interface AuthUser {
  id: EntityId;
  email: string;
  displayName: string;
  lastLoginAt?: ISODateString;
  organization: {
    id: EntityId;
    slug: string;
    name: string;
  };
  /** Primary business role template */
  role: AuthRole;
  /** All roles assigned to the user within the current organization */
  roles: AuthRole[];
  permissions: Permission[];
  /** Effective enabled modules for modular access */
  enabledModules?: MemberModuleKey[];
  /** Increments when module access changes (silent refresh) */
  permissionsVersion?: number;
  isOrganizationOwner?: boolean;
  /** Organization membership id for access administration */
  memberId?: EntityId;
}

/** Login / refresh token response */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: AuthUser;
}

/** Minimal user record */
export interface User {
  id: EntityId;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: ISODateString;
}

export type InventoryLocationType = "service_van" | "central_warehouse";

export interface PartCategory {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PartSubcategory {
  id: EntityId;
  organizationId: EntityId;
  categoryId: EntityId;
  name: string;
  category?: Pick<PartCategory, "id" | "name">;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PartCatalogSubcategoryGroup extends PartSubcategory {
  parts: CatalogPart[];
}

export interface PartCatalogCategoryGroup extends PartCategory {
  subcategories: PartCatalogSubcategoryGroup[];
}

export interface CatalogPart {
  id: EntityId;
  organizationId: EntityId;
  categoryId: EntityId;
  subcategoryId: EntityId;
  name: string;
  partNumber?: string;
  category?: Pick<PartCategory, "id" | "name">;
  subcategory?: Pick<PartSubcategory, "id" | "name">;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InventoryLocationSummary {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  type: InventoryLocationType;
  assignedUserId?: EntityId;
  assignedUserName?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InventoryItem {
  id: EntityId;
  organizationId: EntityId;
  locationId: EntityId;
  quantity: number;
  partId: EntityId;
  part: CatalogPart;
  location?: InventoryLocationSummary;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InventoryLocationDetail extends InventoryLocationSummary {
  items: InventoryItem[];
}

export interface InventoryOverview {
  vans: InventoryLocationDetail[];
  warehouses: InventoryLocationDetail[];
}

export interface WorkReportPartUsage {
  id: EntityId;
  inventoryItemId: EntityId;
  catalogPartId: EntityId;
  quantity: number;
  inventoryItem?: InventoryItem;
  catalogPart?: CatalogPart;
}

export interface ServiceCallWorkReport {
  id: EntityId;
  organizationId: EntityId;
  serviceCallId: EntityId;
  visitId: EntityId;
  technicianId: EntityId;
  workPerformed?: string;
  customerName?: string;
  customerSignatureData?: string;
  signedAt?: ISODateString;
  parts: WorkReportPartUsage[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkReportInventoryOption {
  inventoryItemId: EntityId;
  availableQuantity: number;
  inventoryItem: InventoryItem;
}

export interface WorkReportPartGroup {
  category: Pick<PartCategory, "id" | "name">;
  subcategory: Pick<PartSubcategory, "id" | "name">;
  items: WorkReportInventoryOption[];
}

export interface WorkReportEditorData {
  assignedVan: InventoryLocationSummary;
  report?: ServiceCallWorkReport;
  partGroups: WorkReportPartGroup[];
}
