import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  contactIdParamSchema,
  createContactSchema,
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  updateContactSchema,
  updateCustomerSchema,
} from "./customer.schemas.js";
import {
  createContact,
  createCustomer,
  getCustomerDetail,
  listContacts,
  listCustomers,
  softDeleteContact,
  softDeleteCustomer,
  updateContact,
  updateCustomer,
} from "./customer.service.js";

function actorId(context: Parameters<typeof getAuth>[0]): string {
  return getAuth(context).user.sub;
}

export const customerRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("customers:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listCustomersQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const result = await listCustomers(
        organizationId,
        query.page?.toString(),
        query.pageSize?.toString(),
        query.search,
        query.status,
        query.sortBy,
        query.sortOrder,
      );
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePermission("customers:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createCustomerSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      const customer = await createCustomer(organizationId, body, actorId(context));
      return context.json(createApiResponse(customer), 201);
    },
  )
  .get(
    "/:customerId",
    requirePermission("customers:read"),
    zValidator("param", customerIdParamSchema),
    async (context) => {
      const { organizationId, customerId } = context.req.valid("param");
      const customer = await getCustomerDetail(organizationId, customerId);
      return context.json(createApiResponse(customer));
    },
  )
  .patch(
    "/:customerId",
    requirePermission("customers:write"),
    zValidator("param", customerIdParamSchema),
    zValidator("json", updateCustomerSchema),
    async (context) => {
      const { organizationId, customerId } = context.req.valid("param");
      const body = context.req.valid("json");
      const customer = await updateCustomer(organizationId, customerId, body, actorId(context));
      return context.json(createApiResponse(customer));
    },
  )
  .delete(
    "/:customerId",
    requirePermission("customers:write"),
    zValidator("param", customerIdParamSchema),
    async (context) => {
      const { organizationId, customerId } = context.req.valid("param");
      await softDeleteCustomer(organizationId, customerId, actorId(context));
      return context.body(null, 204);
    },
  )
  .get(
    "/:customerId/contacts",
    requirePermission("customers:read"),
    zValidator("param", customerIdParamSchema),
    async (context) => {
      const { organizationId, customerId } = context.req.valid("param");
      const contacts = await listContacts(organizationId, customerId);
      return context.json(createApiResponse(contacts));
    },
  )
  .post(
    "/:customerId/contacts",
    requirePermission("customers:write"),
    zValidator("param", customerIdParamSchema),
    zValidator("json", createContactSchema),
    async (context) => {
      const { organizationId, customerId } = context.req.valid("param");
      const body = context.req.valid("json");
      const contact = await createContact(organizationId, customerId, body, actorId(context));
      return context.json(createApiResponse(contact), 201);
    },
  )
  .patch(
    "/:customerId/contacts/:contactId",
    requirePermission("customers:write"),
    zValidator("param", contactIdParamSchema),
    zValidator("json", updateContactSchema),
    async (context) => {
      const { organizationId, customerId, contactId } = context.req.valid("param");
      const body = context.req.valid("json");
      const contact = await updateContact(
        organizationId,
        customerId,
        contactId,
        body,
        actorId(context),
      );
      return context.json(createApiResponse(contact));
    },
  )
  .delete(
    "/:customerId/contacts/:contactId",
    requirePermission("customers:write"),
    zValidator("param", contactIdParamSchema),
    async (context) => {
      const { organizationId, customerId, contactId } = context.req.valid("param");
      await softDeleteContact(organizationId, customerId, contactId, actorId(context));
      return context.body(null, 204);
    },
  );
