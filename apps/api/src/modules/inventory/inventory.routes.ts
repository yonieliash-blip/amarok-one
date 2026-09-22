import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createApiResponse } from "@amarok-one/utils";
import { prisma } from "../../lib/prisma.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

const activeOnly = { deletedAt: null } as const;
const kindSchema = z.enum(["vehicle", "warehouse"]);
const locationSchema = z.object({ name: z.string().trim().min(1).max(120), kind: kindSchema });
const itemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  partNumber: z.string().trim().max(120).optional().nullable(),
  quantity: z.number().min(0).max(999999),
  unit: z.string().trim().min(1).max(24).optional(),
});

function locationDto(row: { id: string; name: string; kind: string }) {
  return { id: row.id, name: row.name, kind: row.kind as "vehicle" | "warehouse" };
}

function itemDto(row: {
  id: string;
  stockLocationId: string;
  name: string;
  partNumber: string | null;
  quantity: { toString(): string };
  unit: string;
}) {
  return {
    id: row.id,
    stockLocationId: row.stockLocationId,
    name: row.name,
    partNumber: row.partNumber ?? undefined,
    quantity: Number(row.quantity),
    unit: row.unit,
  };
}

export const inventoryRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/inventory/locations",
    requirePermission("service_calls:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", z.object({ kind: kindSchema.optional() })),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const { kind } = c.req.valid("query");
      const rows = await prisma.stockLocation.findMany({
        where: { organizationId, ...(kind ? { kind } : {}), ...activeOnly },
        orderBy: { name: "asc" },
      });
      return c.json(createApiResponse(rows.map(locationDto)));
    },
  )
  .post(
    "/inventory/locations",
    requirePermission("service_calls:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", locationSchema),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");
      const row = await prisma.stockLocation.upsert({
        where: { organizationId_name: { organizationId, name: input.name } },
        create: { organizationId, ...input },
        update: { kind: input.kind, deletedAt: null },
      });
      return c.json(createApiResponse(locationDto(row)), 201);
    },
  )
  .get(
    "/inventory/locations/:locationId/items",
    requirePermission("service_calls:write"),
    zValidator("param", organizationIdParamSchema.extend({ locationId: z.string().uuid() })),
    async (c) => {
      const { organizationId, locationId } = c.req.valid("param");
      const rows = await prisma.inventoryItem.findMany({
        where: { organizationId, stockLocationId: locationId, ...activeOnly },
        orderBy: { name: "asc" },
      });
      return c.json(createApiResponse(rows.map(itemDto)));
    },
  )
  .post(
    "/inventory/locations/:locationId/items",
    requirePermission("service_calls:write"),
    zValidator("param", organizationIdParamSchema.extend({ locationId: z.string().uuid() })),
    zValidator("json", itemSchema),
    async (c) => {
      const { organizationId, locationId } = c.req.valid("param");
      const input = c.req.valid("json");
      const location = await prisma.stockLocation.findFirst({
        where: { id: locationId, organizationId, ...activeOnly },
      });
      if (!location) return c.json(createApiResponse({ message: "Not found" }), 404);
      const row = await prisma.inventoryItem.create({
        data: {
          organizationId,
          stockLocationId: locationId,
          name: input.name,
          partNumber: input.partNumber ?? null,
          quantity: input.quantity,
          unit: input.unit ?? "יח׳",
        },
      });
      return c.json(createApiResponse(itemDto(row)), 201);
    },
  )
  .patch(
    "/inventory/items/:itemId",
    requirePermission("service_calls:write"),
    zValidator("param", organizationIdParamSchema.extend({ itemId: z.string().uuid() })),
    zValidator(
      "json",
      itemSchema.partial().refine((value) => Object.keys(value).length > 0),
    ),
    async (c) => {
      const { organizationId, itemId } = c.req.valid("param");
      const input = c.req.valid("json");
      const existing = await prisma.inventoryItem.findFirst({
        where: { id: itemId, organizationId, ...activeOnly },
      });
      if (!existing) return c.json(createApiResponse({ message: "Not found" }), 404);
      const row = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          ...input,
          partNumber: input.partNumber === undefined ? undefined : (input.partNumber ?? null),
        },
      });
      return c.json(createApiResponse(itemDto(row)));
    },
  );
