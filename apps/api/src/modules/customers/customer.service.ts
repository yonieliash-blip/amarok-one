import type {
  ApiMeta,
  Customer,
  CustomerContact,
  CustomerDetail,
  CustomerStatus,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { conflict, notFound } from "../../lib/errors.js";
import {
  activeOnly,
  fromCustomerStatusDto,
  toCustomerContactDto,
  toCustomerDto,
} from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import { buildCustomerListWhere } from "./customer-filters.js";
import type {
  CreateContactInput,
  CreateCustomerInput,
  UpdateContactInput,
  UpdateCustomerInput,
} from "./customer.schemas.js";

export async function listCustomers(
  organizationId: string,
  pageValue?: string,
  pageSizeValue?: string,
  search?: string,
  status?: CustomerStatus,
) {
  await assertOrganizationExists(organizationId);

  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);
  const where = buildCustomerListWhere({ organizationId, search, status });

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: Customer[] = items.map(toCustomerDto);

  return { data, meta };
}

export async function getCustomerById(
  organizationId: string,
  customerId: string,
): Promise<Customer> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, ...activeOnly },
  });

  if (!customer) {
    throw notFound("Customer", customerId);
  }

  return toCustomerDto(customer);
}

export async function getCustomerDetail(
  organizationId: string,
  customerId: string,
): Promise<CustomerDetail> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, ...activeOnly },
    include: {
      contacts: {
        where: activeOnly,
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!customer) {
    throw notFound("Customer", customerId);
  }

  return {
    ...toCustomerDto(customer),
    contacts: customer.contacts.map(toCustomerContactDto),
  };
}

export async function createCustomer(
  organizationId: string,
  input: CreateCustomerInput,
  actorId?: string,
): Promise<Customer> {
  await assertOrganizationExists(organizationId);

  try {
    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name: input.name,
        legalName: input.legalName,
        registrationNumber: input.registrationNumber,
        customerNumber: input.customerNumber,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        country: input.country,
        notes: input.notes,
        status: input.status ? fromCustomerStatusDto(input.status) : undefined,
      },
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "customer.created",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { customerNumber: customer.customerNumber, name: customer.name },
    });

    return toCustomerDto(customer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Customer number already exists in this organization", {
        customerNumber: input.customerNumber,
      });
    }
    throw error;
  }
}

export async function updateCustomer(
  organizationId: string,
  customerId: string,
  input: UpdateCustomerInput,
  actorId?: string,
): Promise<Customer> {
  await getCustomerById(organizationId, customerId);

  const data: Prisma.CustomerUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
    ...(input.registrationNumber !== undefined
      ? { registrationNumber: input.registrationNumber }
      : {}),
    ...(input.customerNumber !== undefined ? { customerNumber: input.customerNumber } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.country !== undefined ? { country: input.country } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.status !== undefined ? { status: fromCustomerStatusDto(input.status) } : {}),
  };

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "customer.updated",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { fields: Object.keys(input) },
    });

    return toCustomerDto(customer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Customer number already exists in this organization", {
        customerNumber: input.customerNumber,
      });
    }
    throw error;
  }
}

export async function softDeleteCustomer(
  organizationId: string,
  customerId: string,
  actorId?: string,
): Promise<void> {
  const customer = await getCustomerById(organizationId, customerId);
  const deletedAt = new Date();

  await prisma.$transaction([
    prisma.customerContact.updateMany({
      where: { customerId, organizationId, deletedAt: null },
      data: { deletedAt },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt },
    }),
  ]);

  await writeAuditLog({
    organizationId,
    actorId,
    action: "customer.deleted",
    entityType: "Customer",
    entityId: customerId,
    metadata: { customerNumber: customer.customerNumber, name: customer.name },
  });
}

async function assertCustomerExists(organizationId: string, customerId: string): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!customer) {
    throw notFound("Customer", customerId);
  }
}

export async function listContacts(
  organizationId: string,
  customerId: string,
): Promise<CustomerContact[]> {
  await assertCustomerExists(organizationId, customerId);

  const contacts = await prisma.customerContact.findMany({
    where: { organizationId, customerId, ...activeOnly },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return contacts.map(toCustomerContactDto);
}

export async function createContact(
  organizationId: string,
  customerId: string,
  input: CreateContactInput,
  actorId?: string,
): Promise<CustomerContact> {
  await assertCustomerExists(organizationId, customerId);

  const contact = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({
        where: { organizationId, customerId, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    return tx.customerContact.create({
      data: {
        organizationId,
        customerId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        jobTitle: input.jobTitle,
        isPrimary: input.isPrimary ?? false,
        notes: input.notes,
      },
    });
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "customer_contact.created",
    entityType: "CustomerContact",
    entityId: contact.id,
    metadata: { customerId, name: contact.name },
  });

  return toCustomerContactDto(contact);
}

export async function updateContact(
  organizationId: string,
  customerId: string,
  contactId: string,
  input: UpdateContactInput,
  actorId?: string,
): Promise<CustomerContact> {
  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, customerId, organizationId, ...activeOnly },
  });

  if (!existing) {
    throw notFound("CustomerContact", contactId);
  }

  const contact = await prisma.$transaction(async (tx) => {
    if (input.isPrimary === true) {
      await tx.customerContact.updateMany({
        where: { organizationId, customerId, deletedAt: null, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    return tx.customerContact.update({
      where: { id: contactId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "customer_contact.updated",
    entityType: "CustomerContact",
    entityId: contact.id,
    metadata: { customerId, fields: Object.keys(input) },
  });

  return toCustomerContactDto(contact);
}

export async function softDeleteContact(
  organizationId: string,
  customerId: string,
  contactId: string,
  actorId?: string,
): Promise<void> {
  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, customerId, organizationId, ...activeOnly },
  });

  if (!existing) {
    throw notFound("CustomerContact", contactId);
  }

  await prisma.customerContact.update({
    where: { id: contactId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "customer_contact.deleted",
    entityType: "CustomerContact",
    entityId: contactId,
    metadata: { customerId, name: existing.name },
  });
}
