import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  AppendDocumentVersionInput,
  CreateDocumentCaseInput,
  DecideDocumentVersionInput,
  RecordDeliveryInput,
} from "./document-case.schemas.js";

const typeToModel = {
  work_report: "WORK_REPORT",
  quote: "QUOTE",
  purchase_order: "PURCHASE_ORDER",
  invoice: "INVOICE",
} as const;

const statusToDto = {
  DRAFT: "draft",
  QUOTE_REVIEW_REQUIRED: "quote_review_required",
  QUOTE_CORRECTION_REQUIRED: "quote_correction_required",
  QUOTE_SEND_REQUIRED: "quote_send_required",
  WAITING_PURCHASE_ORDER: "waiting_purchase_order",
  INVOICE_REVIEW_REQUIRED: "invoice_review_required",
  INVOICE_CORRECTION_REQUIRED: "invoice_correction_required",
  INVOICE_SEND_REQUIRED: "invoice_send_required",
  ARCHIVED: "archived",
} as const;

const caseInclude = {
  customer: { select: { id: true, name: true, customerNumber: true } },
  manager: { select: { id: true, displayName: true, email: true } },
  secretary: { select: { id: true, displayName: true, email: true } },
  documents: {
    include: {
      versions: {
        include: { approval: { include: { decidedBy: true } } },
        orderBy: { versionNumber: "desc" },
      },
    },
    orderBy: { type: "asc" },
  },
  deliveries: {
    include: {
      items: { include: { documentVersion: { include: { document: true } } } },
      sentBy: true,
    },
    orderBy: { sentAt: "desc" },
  },
} satisfies Prisma.DocumentCaseInclude;

type DocumentCaseRow = Prisma.DocumentCaseGetPayload<{ include: typeof caseInclude }>;

function toDto(row: DocumentCaseRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    repairReportNumber: row.repairReportNumber,
    workflow: row.workflow === "DIRECT_INVOICE" ? "direct_invoice" : "quote_and_purchase_order",
    status: statusToDto[row.status],
    customer: row.customer,
    manager: row.manager,
    secretary: row.secretary,
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    documents: row.documents.map((document) => ({
      id: document.id,
      type: document.type.toLowerCase(),
      versions: document.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        displayName: version.displayName,
        externalDocumentNumber: version.externalDocumentNumber ?? undefined,
        documentDate: version.documentDate?.toISOString().slice(0, 10),
        note: version.note ?? undefined,
        createdAt: version.createdAt.toISOString(),
        approval: version.approval
          ? {
              decision: version.approval.decision.toLowerCase(),
              note: version.approval.note ?? undefined,
              decidedAt: version.approval.decidedAt.toISOString(),
              decidedBy: version.approval.decidedBy.displayName,
            }
          : undefined,
      })),
    })),
    deliveries: row.deliveries.map((delivery) => ({
      id: delivery.id,
      recipientName: delivery.recipientName,
      channel: delivery.channel.toLowerCase(),
      sentAt: delivery.sentAt.toISOString(),
      sentBy: delivery.sentBy.displayName,
      versionIds: delivery.items.map((item) => item.documentVersionId),
    })),
  };
}

async function assertActiveMember(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      deletedAt: null,
      status: "ACTIVE",
      user: { isActive: true, deletedAt: null },
    },
    select: { id: true },
  });
  if (!member) throw notFound("Active organization member", userId);
}

async function getCase(organizationId: string, documentCaseId: string) {
  const row = await prisma.documentCase.findFirst({
    where: { id: documentCaseId, organizationId },
    include: caseInclude,
  });
  if (!row) throw notFound("Document case", documentCaseId);
  return row;
}

async function ensureWorkflowTask(input: {
  organizationId: string;
  documentCaseId: string;
  documentVersionId?: string;
  taskKind: "MANAGER_REVIEW" | "SECRETARY_SEND" | "SECRETARY_PURCHASE_ORDER";
  assignedToId: string;
  createdById: string;
  title: string;
}) {
  const deduplicationKey = `${input.documentCaseId}:${input.taskKind}:${input.documentVersionId ?? "case"}`;
  const existing = await prisma.documentCaseTaskLink.findFirst({
    where: { organizationId: input.organizationId, deduplicationKey },
    select: { id: true },
  });
  if (existing) return;
  const task = await prisma.task.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      assignedToId: input.assignedToId,
      createdById: input.createdById,
      priority: "HIGH",
      linkUrl: `/document-cases/${input.documentCaseId}`,
      linkedEntityType: "DocumentCase",
      linkedEntityId: input.documentCaseId,
    },
  });
  await prisma.documentCaseTaskLink.create({
    data: {
      organizationId: input.organizationId,
      documentCaseId: input.documentCaseId,
      taskId: task.id,
      taskKind: input.taskKind,
      documentVersionId: input.documentVersionId,
      deduplicationKey,
    },
  });
}

async function resolveWorkflowTasks(input: {
  organizationId: string;
  documentCaseId: string;
  actorId: string;
  taskKind: "MANAGER_REVIEW" | "SECRETARY_SEND" | "SECRETARY_PURCHASE_ORDER";
  documentVersionId?: string;
  note: string;
}) {
  const links = await prisma.documentCaseTaskLink.findMany({
    where: {
      organizationId: input.organizationId,
      documentCaseId: input.documentCaseId,
      taskKind: input.taskKind,
      documentVersionId: input.documentVersionId,
      resolvedAt: null,
    },
    select: { id: true, taskId: true },
  });
  if (links.length === 0) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.documentCaseTaskLink.updateMany({
      where: { id: { in: links.map((link) => link.id) } },
      data: { resolvedAt: now },
    }),
    prisma.task.updateMany({
      where: { id: { in: links.map((link) => link.taskId) }, status: { not: "COMPLETED" } },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completedById: input.actorId,
        completionNote: input.note,
      },
    }),
  ]);
}

function latestVersion(row: DocumentCaseRow, type: keyof typeof typeToModel) {
  const document = row.documents.find((entry) => entry.type === typeToModel[type]);
  return document?.versions[0];
}

function findVersion(row: DocumentCaseRow, documentVersionId: string) {
  for (const document of row.documents) {
    const version = document.versions.find((entry) => entry.id === documentVersionId);
    if (version) return { document, version };
  }
  return undefined;
}

export async function listDocumentCases(organizationId: string) {
  const rows = await prisma.documentCase.findMany({
    where: { organizationId },
    include: caseInclude,
    orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(toDto);
}

export async function listDocumentCaseAssignees(organizationId: string) {
  return prisma.organizationMember
    .findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "ACTIVE",
        user: { isActive: true, deletedAt: null },
      },
      select: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { user: { displayName: "asc" } },
    })
    .then((rows) => rows.map((row) => row.user));
}

export async function getDocumentCase(organizationId: string, documentCaseId: string) {
  return toDto(await getCase(organizationId, documentCaseId));
}

export async function createDocumentCase(
  organizationId: string,
  actorId: string,
  input: CreateDocumentCaseInput,
) {
  await Promise.all([
    assertActiveMember(organizationId, input.managerAssigneeId),
    assertActiveMember(organizationId, input.secretaryAssigneeId),
  ]);
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) throw notFound("Customer", input.customerId);
  const existing = await prisma.documentCase.findFirst({
    where: { organizationId, repairReportNumber: input.repairReportNumber },
  });
  if (existing) throw conflict("A document case already exists for this repair report number");
  const row = await prisma.documentCase.create({
    data: {
      organizationId,
      customerId: input.customerId,
      repairReportNumber: input.repairReportNumber,
      workflow: input.workflow === "direct_invoice" ? "DIRECT_INVOICE" : "QUOTE_AND_PURCHASE_ORDER",
      managerAssigneeId: input.managerAssigneeId,
      secretaryAssigneeId: input.secretaryAssigneeId,
    },
    include: caseInclude,
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "document_case.created",
    entityType: "DocumentCase",
    entityId: row.id,
  });
  return toDto(row);
}

export async function appendDocumentVersion(
  organizationId: string,
  documentCaseId: string,
  actorId: string,
  input: AppendDocumentVersionInput,
) {
  const row = await getCase(organizationId, documentCaseId);
  if (row.archivedAt) throw conflict("Archived document cases cannot be changed");
  const type = typeToModel[input.type];
  if (type === "QUOTE") {
    if (row.workflow !== "QUOTE_AND_PURCHASE_ORDER")
      throw badRequest("Quotes are only valid in the quote and purchase-order workflow");
    if (!["DRAFT", "QUOTE_CORRECTION_REQUIRED"].includes(row.status))
      throw conflict("The document case is not ready for a quote version");
  }
  if (type === "PURCHASE_ORDER") {
    if (row.workflow !== "QUOTE_AND_PURCHASE_ORDER")
      throw badRequest("Purchase orders are only valid in the quote and purchase-order workflow");
    if (row.status !== "WAITING_PURCHASE_ORDER")
      throw conflict("The document case is not waiting for a purchase order");
  }
  if (type === "INVOICE") {
    if (!["DRAFT", "INVOICE_CORRECTION_REQUIRED"].includes(row.status))
      throw conflict("The document case is not ready for an invoice version");
    if (row.workflow === "QUOTE_AND_PURCHASE_ORDER" && !latestVersion(row, "purchase_order"))
      throw badRequest("A purchase order version is required before an invoice version");
  }
  let source: "METADATA_ONLY" | "EXISTING_WORK_REPORT" = "METADATA_ONLY";
  if (input.sourceWorkReportId) {
    const report = await prisma.serviceCallWorkReport.findFirst({
      where: { id: input.sourceWorkReportId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!report) throw notFound("Work report", input.sourceWorkReportId);
    source = "EXISTING_WORK_REPORT";
  }
  const document = await prisma.documentCaseDocument.upsert({
    where: { documentCaseId_type: { documentCaseId, type } },
    create: { organizationId, documentCaseId, type },
    update: {},
  });
  const last = await prisma.documentCaseDocumentVersion.findFirst({
    where: { documentId: document.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  await prisma.documentCaseDocumentVersion.create({
    data: {
      organizationId,
      documentId: document.id,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      source,
      sourceWorkReportId: input.sourceWorkReportId,
      displayName: input.displayName,
      externalDocumentNumber: input.externalDocumentNumber,
      documentDate: input.documentDate
        ? new Date(`${input.documentDate}T00:00:00.000Z`)
        : undefined,
      note: input.note,
      createdById: actorId,
    },
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "document_case.version_appended",
    entityType: "DocumentCase",
    entityId: documentCaseId,
    metadata: { type },
  });
  if (type === "PURCHASE_ORDER") {
    await resolveWorkflowTasks({
      organizationId,
      documentCaseId,
      actorId,
      taskKind: "SECRETARY_PURCHASE_ORDER",
      note: "הזמנת הרכש צורפה לתיק.",
    });
    await prisma.documentCase.update({ where: { id: row.id }, data: { status: "DRAFT" } });
  }
  return getDocumentCase(organizationId, documentCaseId);
}

export async function submitForReview(
  organizationId: string,
  documentCaseId: string,
  actorId: string,
  documentVersionId: string,
) {
  const row = await getCase(organizationId, documentCaseId);
  const found = findVersion(row, documentVersionId);
  if (!found) throw notFound("Document version", documentVersionId);
  const { document, version } = found;
  const isQuote = document.type === "QUOTE";
  if (isQuote && row.workflow !== "QUOTE_AND_PURCHASE_ORDER")
    throw badRequest("Quotes are only valid in the quote and purchase-order workflow");
  if (!isQuote && document.type !== "INVOICE")
    throw badRequest("Only quote or invoice versions can be submitted for review");
  if (version !== latestVersion(row, isQuote ? "quote" : "invoice"))
    throw conflict("Only the latest document version can be submitted");
  const hasWorkReport = Boolean(latestVersion(row, "work_report"));
  if (!hasWorkReport) throw badRequest("A work report version is required before review");
  const expectedStatus = isQuote
    ? ["DRAFT", "QUOTE_CORRECTION_REQUIRED"]
    : ["DRAFT", "INVOICE_CORRECTION_REQUIRED"];
  if (!expectedStatus.includes(row.status))
    throw conflict("The document case is not ready for this review");
  if (
    !isQuote &&
    row.workflow === "QUOTE_AND_PURCHASE_ORDER" &&
    !latestVersion(row, "purchase_order")
  )
    throw badRequest("A purchase order version is required before invoice review");
  await prisma.documentCase.update({
    where: { id: row.id },
    data: { status: isQuote ? "QUOTE_REVIEW_REQUIRED" : "INVOICE_REVIEW_REQUIRED" },
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "document_case.review_requested",
    entityType: "DocumentCaseDocumentVersion",
    entityId: version.id,
  });
  await ensureWorkflowTask({
    organizationId,
    documentCaseId,
    documentVersionId,
    taskKind: "MANAGER_REVIEW",
    assignedToId: row.managerAssigneeId,
    createdById: actorId,
    title: `אישור מסמך לתיק ${row.repairReportNumber}`,
  });
  return getDocumentCase(organizationId, documentCaseId);
}

export async function decideDocumentVersion(
  organizationId: string,
  documentCaseId: string,
  actorId: string,
  documentVersionId: string,
  input: DecideDocumentVersionInput,
) {
  const row = await getCase(organizationId, documentCaseId);
  const found = findVersion(row, documentVersionId);
  if (!found) throw notFound("Document version", documentVersionId);
  const { document, version } = found;
  if (version.approval) throw conflict("This version already has a final decision");
  const isQuote = document.type === "QUOTE";
  if (!isQuote && document.type !== "INVOICE")
    throw badRequest("Only quote or invoice versions can be decided");
  const expected = isQuote ? "QUOTE_REVIEW_REQUIRED" : "INVOICE_REVIEW_REQUIRED";
  if (row.status !== expected) throw conflict("The document case is not waiting for this review");
  await prisma.$transaction([
    prisma.documentCaseApproval.create({
      data: {
        organizationId,
        documentCaseId,
        documentVersionId,
        decision: input.decision === "approved" ? "APPROVED" : "RETURNED_FOR_CORRECTION",
        note: input.note,
        decidedById: actorId,
      },
    }),
    prisma.documentCase.update({
      where: { id: row.id },
      data: {
        status:
          input.decision === "approved"
            ? isQuote
              ? "QUOTE_SEND_REQUIRED"
              : "INVOICE_SEND_REQUIRED"
            : isQuote
              ? "QUOTE_CORRECTION_REQUIRED"
              : "INVOICE_CORRECTION_REQUIRED",
      },
    }),
  ]);
  await writeAuditLog({
    organizationId,
    actorId,
    action: "document_case.version_decided",
    entityType: "DocumentCaseDocumentVersion",
    entityId: version.id,
    metadata: { decision: input.decision },
  });
  await resolveWorkflowTasks({
    organizationId,
    documentCaseId,
    actorId,
    documentVersionId,
    taskKind: "MANAGER_REVIEW",
    note: input.decision === "approved" ? "המסמך אושר." : "המסמך הוחזר לתיקון.",
  });
  if (input.decision === "approved") {
    await ensureWorkflowTask({
      organizationId,
      documentCaseId,
      documentVersionId,
      taskKind: "SECRETARY_SEND",
      assignedToId: row.secretaryAssigneeId,
      createdById: actorId,
      title: `תיעוד שליחה לתיק ${row.repairReportNumber}`,
    });
  }
  return getDocumentCase(organizationId, documentCaseId);
}

export async function recordDelivery(
  organizationId: string,
  documentCaseId: string,
  actorId: string,
  input: RecordDeliveryInput,
) {
  const row = await getCase(organizationId, documentCaseId);
  const expectedType =
    row.status === "QUOTE_SEND_REQUIRED"
      ? "QUOTE"
      : row.status === "INVOICE_SEND_REQUIRED"
        ? "INVOICE"
        : undefined;
  if (!expectedType) throw conflict("The document case is not waiting for a delivery record");
  const versions = input.documentVersionIds.map((id) => findVersion(row, id));
  if (new Set(input.documentVersionIds).size !== input.documentVersionIds.length)
    throw badRequest("Each delivered document version may be recorded once");
  if (
    versions.some(
      (entry) =>
        !entry ||
        entry.document.type !== expectedType ||
        entry.version.approval?.decision !== "APPROVED" ||
        entry.version !== latestVersion(row, expectedType === "QUOTE" ? "quote" : "invoice"),
    )
  ) {
    throw badRequest("Only the exact approved version that is ready to send may be recorded");
  }
  const approvedVersions = versions.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== undefined,
  );
  await prisma.$transaction(async (transaction) => {
    const delivery = await transaction.documentCaseDelivery.create({
      data: {
        organizationId,
        documentCaseId,
        sentById: actorId,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        channel: input.channel.toUpperCase() as "EMAIL" | "WHATSAPP" | "OTHER",
        note: input.note,
        sentAt: input.sentAt ? new Date(input.sentAt) : new Date(),
      },
    });
    await transaction.documentCaseDeliveryItem.createMany({
      data: approvedVersions.map((entry) => ({
        deliveryId: delivery.id,
        documentVersionId: entry.version.id,
      })),
    });
    await transaction.documentCase.update({
      where: { id: row.id },
      data:
        expectedType === "QUOTE"
          ? { status: "WAITING_PURCHASE_ORDER" }
          : { status: "ARCHIVED", archivedAt: new Date(), archivedById: actorId },
    });
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "document_case.delivery_recorded",
    entityType: "DocumentCase",
    entityId: documentCaseId,
    metadata: { documentVersionIds: input.documentVersionIds },
  });
  await Promise.all(
    input.documentVersionIds.map((documentVersionId) =>
      resolveWorkflowTasks({
        organizationId,
        documentCaseId,
        actorId,
        documentVersionId,
        taskKind: "SECRETARY_SEND",
        note: "שליחת המסמך תועדה.",
      }),
    ),
  );
  if (expectedType === "QUOTE") {
    await ensureWorkflowTask({
      organizationId,
      documentCaseId,
      taskKind: "SECRETARY_PURCHASE_ORDER",
      assignedToId: row.secretaryAssigneeId,
      createdById: actorId,
      title: `המתנה להזמנת רכש לתיק ${row.repairReportNumber}`,
    });
  }
  return getDocumentCase(organizationId, documentCaseId);
}
