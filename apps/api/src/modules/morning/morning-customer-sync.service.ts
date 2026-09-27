import { createHash } from "node:crypto";
import { env } from "../../env.js";
import { writeAuditLog } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import {
  createMorningClient,
  type MorningClient,
  type MorningClientRecord,
} from "./morning-client.js";

const MORNING_PRIMARY_CONTACT_KEY = "morning-primary";

export interface MorningCustomerSyncResult {
  total: number;
  created: number;
  updated: number;
  contactsCreated: number;
  contactsUpdated: number;
  skipped: number;
}

export interface MorningCustomerSyncService {
  syncCustomers(organizationId: string, actorId: string): Promise<MorningCustomerSyncResult>;
}

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text || undefined;
}

function morningCustomerNumber(morningClientId: string): string {
  const hash = createHash("sha256").update(morningClientId).digest("hex").toUpperCase();
  return `M-${hash.slice(0, 24)}`;
}

function mappedCustomer(client: MorningClientRecord) {
  const name = optionalText(client.name);
  if (!name) {
    return undefined;
  }

  return {
    name,
    registrationNumber: optionalText(client.taxId) ?? null,
    email: client.emails?.map(optionalText).find(Boolean) ?? null,
    phone: optionalText(client.phone) ?? optionalText(client.mobile) ?? null,
    address: optionalText(client.address) ?? null,
    city: optionalText(client.city) ?? null,
    country: optionalText(client.country) ?? null,
    status: client.active === false ? ("INACTIVE" as const) : ("ACTIVE" as const),
  };
}

export function createMorningCustomerSyncService(
  morningClient: MorningClient = createMorningClient({
    clientId: env.MORNING_CLIENT_ID,
    clientSecret: env.MORNING_CLIENT_SECRET,
    tokenUrl: env.MORNING_TOKEN_URL,
    apiBaseUrl: env.MORNING_API_BASE_URL,
  }),
): MorningCustomerSyncService {
  return {
    async syncCustomers(
      organizationId: string,
      actorId: string,
    ): Promise<MorningCustomerSyncResult> {
      const clients = await morningClient.listClients();
      const result: MorningCustomerSyncResult = {
        total: clients.length,
        created: 0,
        updated: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        skipped: 0,
      };

      for (const client of clients) {
        const clientId = optionalText(client.id);
        const customer = mappedCustomer(client);
        if (!clientId || !customer) {
          result.skipped += 1;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const now = new Date();
          const existing = await tx.customer.findFirst({
            where: { organizationId, morningClientId: clientId },
            select: { id: true },
          });
          const savedCustomer = existing
            ? await tx.customer.update({
                where: { id: existing.id },
                data: { ...customer, morningLastSyncedAt: now, deletedAt: null },
              })
            : await tx.customer.create({
                data: {
                  organizationId,
                  ...customer,
                  customerNumber: morningCustomerNumber(clientId),
                  morningClientId: clientId,
                  morningLastSyncedAt: now,
                },
              });

          if (existing) {
            result.updated += 1;
          } else {
            result.created += 1;
          }

          const contactName = optionalText(client.contactPerson);
          if (!contactName) {
            return;
          }

          const existingContact = await tx.customerContact.findFirst({
            where: {
              organizationId,
              customerId: savedCustomer.id,
              morningSourceKey: MORNING_PRIMARY_CONTACT_KEY,
            },
            select: { id: true },
          });
          const contactData = {
            name: contactName,
            email: customer.email,
            phone: customer.phone,
          };

          if (existingContact) {
            await tx.customerContact.update({
              where: { id: existingContact.id },
              data: { ...contactData, deletedAt: null },
            });
            result.contactsUpdated += 1;
          } else {
            await tx.customerContact.create({
              data: {
                organizationId,
                customerId: savedCustomer.id,
                ...contactData,
                morningSourceKey: MORNING_PRIMARY_CONTACT_KEY,
              },
            });
            result.contactsCreated += 1;
          }
        });
      }

      await writeAuditLog({
        organizationId,
        actorId,
        action: "morning.customers.synced",
        entityType: "MorningCustomerSync",
        entityId: organizationId,
        metadata: { ...result },
      });

      return result;
    },
  };
}
