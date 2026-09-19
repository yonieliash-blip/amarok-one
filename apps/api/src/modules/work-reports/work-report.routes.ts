import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { activeOnly } from "../../lib/mappers.js";
import { notFound, forbidden, badRequest } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../lib/audit.js";
import { requireAnyPermission, requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

const reportParam = organizationIdParamSchema.extend({ serviceCallId: z.string().uuid(), visitId: z.string().uuid() });
const reportIdParam = organizationIdParamSchema.extend({ reportId: z.string().uuid() });
const catalogSchema = z.object({ name: z.string().trim().min(1).max(120), categoryId: z.string().uuid().optional(), partNumber: z.string().trim().max(120).optional(), unit: z.string().trim().min(1).max(24).optional() });
const reportSchema = z.object({ workDescription: z.string().trim().max(10000), customerRepresentative: z.string().trim().max(160).optional().nullable(), customerRepresentativeRole: z.string().trim().max(160).optional().nullable(), signatureStrokes: z.array(z.array(z.array(z.number().finite()).length(2))).max(300).optional().nullable(), parts: z.array(z.object({ partId: z.string().uuid(), quantity: z.number().positive().max(99999) })).max(100) });
const uploadRoot = "/app/uploads/work-reports";
const include = { parts: { include: { part: true } }, media: { where: activeOnly } } as const;
type WorkReportRow = Prisma.WorkReportGetPayload<{ include: typeof include }>;

function dto(row: WorkReportRow) {
  return { id: row.id, organizationId: row.organizationId, serviceCallId: row.serviceCallId, visitId: row.visitId, reportNumber: row.reportNumber, workDescription: row.workDescription, customerRepresentative: row.customerRepresentative ?? undefined, customerRepresentativeRole: row.customerRepresentativeRole ?? undefined, signatureStrokes: row.signatureStrokes ?? undefined, signedAt: row.signedAt?.toISOString(), technicianId: row.technicianId, lastEditedById: row.lastEditedById ?? undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), parts: row.parts.map(i => ({ partId: i.partId, quantity: Number(i.quantity), part: { id: i.part.id, categoryId: i.part.categoryId, name: i.part.name, partNumber: i.part.partNumber ?? undefined, unit: i.part.unit } })), media: row.media.map(m => ({ id: m.id, mediaType: m.mediaType, fileName: m.fileName, mimeType: m.mimeType, sizeBytes: m.sizeBytes, createdAt: m.createdAt.toISOString(), url: `/organizations/${m.organizationId}/work-reports/${row.id}/media/${m.id}` })) };
}
async function reportForVisit(organizationId: string, serviceCallId: string, visitId: string, actorId: string, allowManager: boolean) {
  const visit = await prisma.serviceCallVisit.findFirst({ where: { id: visitId, serviceCallId, organizationId, ...activeOnly } });
  if (!visit) throw notFound("Visit", visitId);
  if (!allowManager && visit.technicianId !== actorId) throw forbidden("Only the assigned technician can access this report");
  let report = await prisma.workReport.findFirst({ where: { visitId, organizationId, ...activeOnly }, include });
  if (!report) {
    const sequence = await prisma.$queryRaw<Array<{ value: bigint }>>`
      SELECT nextval('work_report_number_seq') AS value
    `;
    const next = sequence[0];
    if (!next) throw new Error("Work report number sequence did not return a value");
    report = await prisma.workReport.create({ data: { organizationId, serviceCallId, visitId, technicianId: visit.technicianId, lastEditedById: actorId, reportNumber: `AM${next.value}` }, include });
  }
  return { visit, report };
}

export function workReportRoutes(): Hono {
  return new Hono().use("*", tenantGuard)
    .get("/work-report-parts", requireAnyPermission("service_calls:read", "my_service_calls:read"), zValidator("param", organizationIdParamSchema), async c => {
      const { organizationId } = c.req.valid("param");
      const categories = await prisma.workReportPartCategory.findMany({ where: { organizationId, ...activeOnly }, include: { parts: { where: activeOnly, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
      return c.json(createApiResponse(categories.map(x => ({ id: x.id, organizationId, name: x.name, parts: x.parts.map(p => ({ id: p.id, categoryId: p.categoryId, name: p.name, partNumber: p.partNumber ?? undefined, unit: p.unit })) }))));
    })
    .post("/work-report-part-categories", requirePermission("service_calls:write"), zValidator("param", organizationIdParamSchema), zValidator("json", catalogSchema.pick({ name: true })), async c => {
      const { organizationId } = c.req.valid("param"); const row = await prisma.workReportPartCategory.create({ data: { organizationId, name: c.req.valid("json").name } }); return c.json(createApiResponse({ id: row.id, organizationId, name: row.name, parts: [] }), 201);
    })
    .post("/work-report-parts", requirePermission("service_calls:write"), zValidator("param", organizationIdParamSchema), zValidator("json", catalogSchema.refine(x => !!x.categoryId, "categoryId is required")), async c => {
      const { organizationId } = c.req.valid("param"); const b = c.req.valid("json"); const row = await prisma.workReportPart.create({ data: { organizationId, categoryId: b.categoryId!, name: b.name, partNumber: b.partNumber, unit: b.unit ?? "יח׳" } }); return c.json(createApiResponse({ id: row.id, categoryId: row.categoryId, name: row.name, partNumber: row.partNumber ?? undefined, unit: row.unit }), 201);
    })
    .get("/service-calls/:serviceCallId/visits/:visitId/work-report", requireAnyPermission("service_calls:read", "my_service_calls:read"), zValidator("param", reportParam), async c => { const p = c.req.valid("param"); const auth = getAuth(c).user; const { report } = await reportForVisit(p.organizationId, p.serviceCallId, p.visitId, auth.sub, auth.permissions.includes("service_calls:read")); return c.json(createApiResponse(dto(report))); })
    .put("/work-reports/:reportId", requireAnyPermission("service_calls:write", "my_service_calls:write"), zValidator("param", reportIdParam), zValidator("json", reportSchema), async c => { const { organizationId, reportId } = c.req.valid("param"); const actorId = getAuth(c).user.sub; const b = c.req.valid("json"); const existing = await prisma.workReport.findFirst({ where: { id: reportId, organizationId, ...activeOnly } }); if (!existing) throw notFound("WorkReport", reportId); const canManager = getAuth(c).user.permissions.includes("service_calls:write"); if (!canManager && existing.technicianId !== actorId) throw forbidden("Only the assigned technician can update this report"); const partIds = b.parts.map(x => x.partId); const count = await prisma.workReportPart.count({ where: { organizationId, id: { in: partIds }, ...activeOnly } }); if (count !== partIds.length) throw badRequest("One or more parts are invalid"); const report = await prisma.workReport.update({ where: { id: reportId }, data: { workDescription: b.workDescription, customerRepresentative: b.customerRepresentative ?? null, customerRepresentativeRole: b.customerRepresentativeRole ?? null, signatureStrokes: b.signatureStrokes ?? undefined, signedAt: b.signatureStrokes?.length ? new Date() : undefined, lastEditedById: actorId, parts: { deleteMany: {}, create: b.parts.map(i => ({ partId: i.partId, quantity: i.quantity })) } }, include }); await writeAuditLog({ organizationId, actorId, action: canManager ? "work_report.manager_updated" : "work_report.technician_updated", entityType: "WorkReport", entityId: report.id, metadata: { reportNumber: report.reportNumber, partsCount: b.parts.length, workDescriptionChanged: existing.workDescription !== b.workDescription, signatureProvided: Boolean(b.signatureStrokes?.length) } }); return c.json(createApiResponse(dto(report))); })
    .post("/work-reports/:reportId/media", requireAnyPermission("service_calls:write", "my_service_calls:write"), zValidator("param", reportIdParam), async c => { const { organizationId, reportId } = c.req.valid("param"); const report = await prisma.workReport.findFirst({ where: { id: reportId, organizationId, ...activeOnly } }); if (!report) throw notFound("WorkReport", reportId); const file = (await c.req.parseBody()).file; if (!(file instanceof File) || file.size > 50 * 1024 * 1024) throw badRequest("A media file up to 50MB is required"); if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw badRequest("Only images and videos are allowed"); const key = `${organizationId}/${reportId}/${crypto.randomUUID()}`; await mkdir(path.join(uploadRoot, path.dirname(key)), { recursive: true }); await writeFile(path.join(uploadRoot, key), Buffer.from(await file.arrayBuffer())); const media = await prisma.workReportMedia.create({ data: { organizationId, reportId, mediaType: file.type.startsWith("video/") ? "video" : "image", fileName: file.name || "media", mimeType: file.type, storageKey: key, sizeBytes: file.size } }); return c.json(createApiResponse({ id: media.id }), 201); })
    .get("/work-reports/:reportId/media/:mediaId", requireAnyPermission("service_calls:read", "my_service_calls:read"), zValidator("param", reportIdParam.extend({ mediaId: z.string().uuid() })), async c => { const p = c.req.valid("param"); const media = await prisma.workReportMedia.findFirst({ where: { id: p.mediaId, reportId: p.reportId, organizationId: p.organizationId, ...activeOnly } }); if (!media) throw notFound("WorkReportMedia", p.mediaId); return c.body(await readFile(path.join(uploadRoot, media.storageKey)), 200, { "Content-Type": media.mimeType }); });
}
