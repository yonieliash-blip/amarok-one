import { PrismaClient } from "@prisma/client";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  ORGANIZATION_OWNER_ROLE_SLUG,
  getDefaultModulesForRole,
} from "@amarok-one/permissions";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD?.trim() || "Admin@123456";

const DEMO_USERS = [
  {
    email: "admin@demo.amarok.one",
    displayName: "Demo Owner",
    roleSlugs: ["organization-owner"] as const,
    isOrganizationOwner: true,
  },
  {
    email: "manager@demo.amarok.one",
    displayName: "Demo Service Manager",
    roleSlugs: ["service-manager"] as const,
    isOrganizationOwner: false,
  },
  {
    email: "tech1@demo.amarok.one",
    displayName: "Demo Technician",
    roleSlugs: ["technician"] as const,
    isOrganizationOwner: false,
  },
  {
    email: "warehouse@demo.amarok.one",
    displayName: "Demo Warehouse Employee",
    roleSlugs: ["warehouse-employee"] as const,
    isOrganizationOwner: false,
  },
  {
    email: "accounting@demo.amarok.one",
    displayName: "Demo Accounting",
    roleSlugs: ["accounting"] as const,
    isOrganizationOwner: false,
  },
] as const;

async function ensureDemoOrganizationMember(input: {
  organizationId: string;
  userId: string;
  primaryRoleId: string;
  roleSlug: string;
  isOrganizationOwner: boolean;
}): Promise<void> {
  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    update: {
      primaryRoleId: input.primaryRoleId,
      isOrganizationOwner: input.isOrganizationOwner,
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      primaryRoleId: input.primaryRoleId,
      isOrganizationOwner: input.isOrganizationOwner,
      status: "ACTIVE",
    },
  });

  for (const moduleKey of getDefaultModulesForRole(input.roleSlug)) {
    await prisma.memberModuleAccess.upsert({
      where: {
        organizationMemberId_moduleKey: {
          organizationMemberId: member.id,
          moduleKey,
        },
      },
      create: {
        organizationId: input.organizationId,
        organizationMemberId: member.id,
        moduleKey,
        enabled: true,
      },
      update: {
        enabled: true,
      },
    });
  }
}

async function main(): Promise<void> {
  console.log("Seeding database...");

  await prisma.$executeRawUnsafe(`SET client_encoding TO 'UTF8'`);

  const organization = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Organization" },
    create: {
      name: "Demo Organization",
      slug: "demo",
    },
  });

  const permissions = await Promise.all(
    ALL_PERMISSIONS.map((permission) =>
      prisma.permission.upsert({
        where: { slug: permission.slug },
        update: {
          name: permission.name,
          description: permission.description,
        },
        create: permission,
      }),
    ),
  );

  const permissionBySlug = new Map(permissions.map((permission) => [permission.slug, permission]));

  const roles = await Promise.all(
    DEFAULT_ROLES.map((role) =>
      prisma.role.upsert({
        where: {
          organizationId_slug: {
            organizationId: organization.id,
            slug: role.slug,
          },
        },
        update: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem ?? false,
          isOwner: role.isOwner ?? false,
        },
        create: {
          organizationId: organization.id,
          slug: role.slug,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem ?? false,
          isOwner: role.isOwner ?? false,
        },
      }),
    ),
  );

  async function assignPermissions(roleSlug: string, slugs: readonly string[]): Promise<void> {
    const role = roles.find((entry) => entry.slug === roleSlug);
    if (!role) {
      throw new Error(`Role '${roleSlug}' was not created during seed`);
    }

    const permissionIds: string[] = [];
    for (const slug of slugs) {
      const permission = permissionBySlug.get(slug);
      if (!permission) {
        throw new Error(`Permission '${slug}' was not created during seed`);
      }
      permissionIds.push(permission.id);
    }

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: permissionIds },
      },
    });

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }

  await Promise.all(
    DEFAULT_ROLES.map((roleDefinition) =>
      assignPermissions(roleDefinition.slug, roleDefinition.permissions),
    ),
  );

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const seededUsers = new Map<string, { id: string; email: string }>();

  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        displayName: demoUser.displayName,
        passwordHash,
        isActive: true,
      },
      create: {
        email: demoUser.email,
        displayName: demoUser.displayName,
        passwordHash,
        isActive: true,
      },
    });

    seededUsers.set(demoUser.email, { id: user.id, email: user.email });

    await prisma.userRole.deleteMany({
      where: {
        organizationId: organization.id,
        userId: user.id,
      },
    });

    for (const roleSlug of demoUser.roleSlugs) {
      const role = roles.find((entry) => entry.slug === roleSlug);
      if (!role) {
        throw new Error(`Role '${roleSlug}' was not created during seed`);
      }

      await prisma.userRole.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    const primaryRoleSlug = demoUser.roleSlugs[0];
    const primaryRole = roles.find((entry) => entry.slug === primaryRoleSlug);
    if (!primaryRole) {
      throw new Error(`Primary role '${primaryRoleSlug}' was not created during seed`);
    }

    await ensureDemoOrganizationMember({
      organizationId: organization.id,
      userId: user.id,
      primaryRoleId: primaryRole.id,
      roleSlug: primaryRole.slug,
      isOrganizationOwner:
        demoUser.isOrganizationOwner || primaryRole.slug === ORGANIZATION_OWNER_ROLE_SLUG,
    });
  }

  await prisma.role.updateMany({
    where: {
      organizationId: organization.id,
      slug: "company-owner",
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  await prisma.user.updateMany({
    where: {
      OR: [
        {
          displayName: "Demo Technician",
          email: { not: "tech1@demo.amarok.one" },
        },
        {
          email: { in: ["tech@demo.amarok.one"] },
        },
      ],
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  const canonicalTechnician = seededUsers.get("tech1@demo.amarok.one");
  if (canonicalTechnician) {
    await prisma.userRole.updateMany({
      where: {
        organizationId: organization.id,
        role: { slug: "technician" },
        userId: { not: canonicalTechnician.id },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  const owner = seededUsers.get("admin@demo.amarok.one");
  const technician = seededUsers.get("tech1@demo.amarok.one");

  if (!owner) {
    throw new Error("Owner demo user was not created during seed");
  }

  if (!technician) {
    throw new Error("Technician demo user was not created during seed");
  }

  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      organizationId: organization.id,
      action: "organization.seeded",
    },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: owner.id,
        action: "organization.seeded",
        entityType: "Organization",
        entityId: organization.id,
        metadata: {
          source: "prisma-seed",
          slug: organization.slug,
        },
      },
    });
  }

  const company = await prisma.company.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "DEMO-CO",
      },
    },
    update: {
      name: "Demo Company",
      legalName: "Demo Company Ltd.",
    },
    create: {
      organizationId: organization.id,
      name: "Demo Company",
      code: "DEMO-CO",
      legalName: "Demo Company Ltd.",
    },
  });

  const branch = await prisma.branch.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "HQ",
      },
    },
    update: {
      name: "Headquarters",
      city: "Demo City",
      country: "Demo Country",
    },
    create: {
      organizationId: organization.id,
      companyId: company.id,
      name: "Headquarters",
      code: "HQ",
      addressLine1: "1 Demo Street",
      city: "Demo City",
      country: "Demo Country",
    },
  });

  const demoCustomers = [
    {
      customerNumber: "CUST-001",
      name: "Nordic Lift Services",
      legalName: "Nordic Lift Services AB",
      registrationNumber: "556123-4567",
      email: "info@nordiclift.example",
      phone: "+46 8 123 4567",
      address: "Industrivägen 12",
      city: "Stockholm",
      country: "Sweden",
      notes: "Preferred partner for forklift maintenance.",
      status: "ACTIVE" as const,
      contacts: [
        {
          name: "Erik Johansson",
          email: "erik.johansson@nordiclift.example",
          phone: "+46 70 111 2233",
          jobTitle: "Operations Manager",
          isPrimary: true,
        },
      ],
    },
    {
      customerNumber: "CUST-002",
      name: "Baltic Construction Co.",
      legalName: "Baltic Construction Co. OÜ",
      registrationNumber: "12345678",
      email: "contact@balticconstruction.example",
      phone: "+372 612 3456",
      address: "Harju 45",
      city: "Tallinn",
      country: "Estonia",
      status: "ACTIVE" as const,
      contacts: [
        {
          name: "Liis Kask",
          email: "liis.kask@balticconstruction.example",
          jobTitle: "Site Supervisor",
          isPrimary: true,
        },
      ],
    },
    {
      customerNumber: "CUST-003",
      name: "Metro Warehouse Group",
      email: "sales@metrowarehouse.example",
      phone: "+358 9 876 5432",
      city: "Helsinki",
      country: "Finland",
      status: "PROSPECT" as const,
      contacts: [],
    },
    {
      customerNumber: "CUST-004",
      name: "Legacy Equipment Ltd",
      legalName: "Legacy Equipment Limited",
      email: "accounts@legacyequip.example",
      city: "Riga",
      country: "Latvia",
      status: "INACTIVE" as const,
      contacts: [
        {
          name: "Janis Berzins",
          email: "janis@legacyequip.example",
          isPrimary: true,
        },
      ],
    },
  ] as const;

  for (const entry of demoCustomers) {
    const customer = await prisma.customer.upsert({
      where: {
        organizationId_customerNumber: {
          organizationId: organization.id,
          customerNumber: entry.customerNumber,
        },
      },
      update: {
        name: entry.name,
        legalName: entry.legalName,
        registrationNumber: entry.registrationNumber,
        email: entry.email,
        phone: entry.phone,
        address: entry.address,
        city: entry.city,
        country: entry.country,
        notes: entry.notes,
        status: entry.status,
      },
      create: {
        organizationId: organization.id,
        customerNumber: entry.customerNumber,
        name: entry.name,
        legalName: entry.legalName,
        registrationNumber: entry.registrationNumber,
        email: entry.email,
        phone: entry.phone,
        address: entry.address,
        city: entry.city,
        country: entry.country,
        notes: entry.notes,
        status: entry.status,
      },
    });

    for (const contact of entry.contacts) {
      const existingContact = await prisma.customerContact.findFirst({
        where: {
          organizationId: organization.id,
          customerId: customer.id,
          name: contact.name,
          deletedAt: null,
        },
      });

      if (!existingContact) {
        await prisma.customerContact.create({
          data: {
            organizationId: organization.id,
            customerId: customer.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            jobTitle: contact.jobTitle,
            isPrimary: contact.isPrimary,
          },
        });
      }
    }
  }

  const demoEquipmentTypes = [
    {
      code: "FORKLIFT",
      name: "Forklift",
      description: "Industrial lift trucks and warehouse forklifts",
    },
    {
      code: "MOBILE_CRANE",
      name: "Mobile Crane",
      description: "All-terrain and truck-mounted cranes",
    },
    { code: "TOWER_CRANE", name: "Tower Crane", description: "Fixed and climbing tower cranes" },
    { code: "EXCAVATOR", name: "Excavator", description: "Tracked and wheeled excavators" },
    {
      code: "WHEEL_LOADER",
      name: "Wheel Loader",
      description: "Front-end loaders for bulk material",
    },
    {
      code: "TELEHANDLER",
      name: "Telehandler",
      description: "Telescopic handlers for construction sites",
    },
  ] as const;

  const equipmentTypeByCode = new Map<string, { id: string; code: string }>();

  for (const entry of demoEquipmentTypes) {
    const equipmentType = await prisma.equipmentType.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: entry.code,
        },
      },
      update: {
        name: entry.name,
        description: entry.description,
      },
      create: {
        organizationId: organization.id,
        code: entry.code,
        name: entry.name,
        description: entry.description,
      },
    });
    equipmentTypeByCode.set(entry.code, equipmentType);
  }

  const demoEquipment = [
    {
      internalNumber: "EQ-001",
      name: "Toyota 8FGU25 Forklift",
      serialNumber: "TF-8FGU25-2019-4421",
      manufacturer: "Toyota",
      model: "8FGU25",
      year: 2019,
      typeCode: "FORKLIFT",
      customerNumber: "CUST-001",
      status: "ACTIVE" as const,
      engineHours: 4820.5,
      registrationNumber: "FL-2019-001",
      warrantyEndDate: new Date("2026-06-30"),
      location: "Nordic Lift — Stockholm yard",
      notes: "2.5t capacity, LPG. Annual service due Q3.",
    },
    {
      internalNumber: "EQ-002",
      name: "Hyster H50FT Forklift",
      serialNumber: "HY-H50FT-2021-1187",
      manufacturer: "Hyster",
      model: "H50FT",
      year: 2021,
      typeCode: "FORKLIFT",
      customerNumber: "CUST-003",
      status: "IN_SERVICE" as const,
      engineHours: 2150,
      location: "Metro Warehouse — Helsinki staging",
      notes: "Currently under planned maintenance.",
    },
    {
      internalNumber: "EQ-003",
      name: "Liebherr LTM 1100-4.2 Mobile Crane",
      serialNumber: "LB-LTM1100-2018-0093",
      manufacturer: "Liebherr",
      model: "LTM 1100-4.2",
      year: 2018,
      typeCode: "MOBILE_CRANE",
      customerNumber: "CUST-002",
      status: "ACTIVE" as const,
      engineHours: 6120,
      mileage: 48200,
      registrationNumber: "CR-2018-042",
      warrantyEndDate: new Date("2025-12-31"),
      location: "Baltic Construction — Tallinn site",
      notes: "100t capacity mobile crane with 60m boom.",
    },
    {
      internalNumber: "EQ-004",
      name: "Potain MDT 219 J12 Tower Crane",
      serialNumber: "PT-MDT219-2020-7712",
      manufacturer: "Potain",
      model: "MDT 219 J12",
      year: 2020,
      typeCode: "TOWER_CRANE",
      customerNumber: "CUST-002",
      branchCode: "HQ",
      status: "ACTIVE" as const,
      engineHours: 8900,
      location: "HQ depot — assembly ready",
      notes: "12t max load. Stored between projects.",
    },
    {
      internalNumber: "EQ-005",
      name: "CAT 320 GC Excavator",
      serialNumber: "CAT-320GC-2017-5560",
      manufacturer: "Caterpillar",
      model: "320 GC",
      year: 2017,
      typeCode: "EXCAVATOR",
      customerNumber: "CUST-002",
      status: "ACTIVE" as const,
      engineHours: 9340,
      registrationNumber: "EX-2017-320",
      location: "Baltic Construction — Harju project",
      notes: "20t class excavator with quick coupler.",
    },
    {
      internalNumber: "EQ-006",
      name: "Volvo L120H Wheel Loader",
      serialNumber: "VO-L120H-2022-3344",
      manufacturer: "Volvo",
      model: "L120H",
      year: 2022,
      typeCode: "WHEEL_LOADER",
      branchCode: "HQ",
      status: "ACTIVE" as const,
      engineHours: 1280,
      warrantyEndDate: new Date("2027-03-15"),
      location: "Demo HQ yard",
      notes: "Company-owned loader for internal logistics.",
    },
    {
      internalNumber: "EQ-007",
      name: "JCB 540-170 Telehandler",
      serialNumber: "JCB-540170-2016-9021",
      manufacturer: "JCB",
      model: "540-170",
      year: 2016,
      typeCode: "TELEHANDLER",
      customerNumber: "CUST-001",
      status: "OUT_OF_SERVICE" as const,
      engineHours: 7650,
      location: "Nordic Lift — repair bay",
      notes: "Hydraulic leak under investigation.",
    },
    {
      internalNumber: "EQ-008",
      name: "Komatsu PC210 LC-11 Excavator",
      serialNumber: "KO-PC210-2015-4410",
      manufacturer: "Komatsu",
      model: "PC210 LC-11",
      year: 2015,
      typeCode: "EXCAVATOR",
      customerNumber: "CUST-004",
      status: "RETIRED" as const,
      engineHours: 18420,
      location: "Legacy Equipment — Riga storage",
      notes: "Retired from active fleet. Parts donor.",
    },
  ] as const;

  for (const entry of demoEquipment) {
    const equipmentType = equipmentTypeByCode.get(entry.typeCode);
    if (!equipmentType) {
      throw new Error(`Equipment type '${entry.typeCode}' was not seeded`);
    }

    let customerId: string | undefined;
    if ("customerNumber" in entry && entry.customerNumber) {
      const customer = await prisma.customer.findFirst({
        where: {
          organizationId: organization.id,
          customerNumber: entry.customerNumber,
          deletedAt: null,
        },
      });
      customerId = customer?.id;
    }

    let branchId: string | undefined;
    if ("branchCode" in entry && entry.branchCode) {
      branchId = entry.branchCode === "HQ" ? branch.id : undefined;
    }

    await prisma.equipment.upsert({
      where: {
        organizationId_internalNumber: {
          organizationId: organization.id,
          internalNumber: entry.internalNumber,
        },
      },
      update: {
        name: entry.name,
        serialNumber: entry.serialNumber,
        manufacturer: entry.manufacturer,
        model: entry.model,
        year: entry.year,
        equipmentTypeId: equipmentType.id,
        customerId: customerId ?? null,
        branchId: branchId ?? null,
        status: entry.status,
        engineHours: entry.engineHours,
        mileage: "mileage" in entry ? entry.mileage : null,
        registrationNumber: "registrationNumber" in entry ? entry.registrationNumber : null,
        warrantyEndDate: "warrantyEndDate" in entry ? entry.warrantyEndDate : null,
        location: entry.location,
        notes: entry.notes,
      },
      create: {
        organizationId: organization.id,
        equipmentTypeId: equipmentType.id,
        customerId,
        branchId,
        name: entry.name,
        internalNumber: entry.internalNumber,
        serialNumber: entry.serialNumber,
        manufacturer: entry.manufacturer,
        model: entry.model,
        year: entry.year,
        status: entry.status,
        engineHours: entry.engineHours,
        mileage: "mileage" in entry ? entry.mileage : undefined,
        registrationNumber: "registrationNumber" in entry ? entry.registrationNumber : undefined,
        warrantyEndDate: "warrantyEndDate" in entry ? entry.warrantyEndDate : undefined,
        location: entry.location,
        notes: entry.notes,
      },
    });
  }

  async function findCustomerId(customerNumber: string): Promise<string> {
    const customer = await prisma.customer.findFirst({
      where: { organizationId: organization.id, customerNumber, deletedAt: null },
    });
    if (!customer) {
      throw new Error(`Customer '${customerNumber}' not found for service call seed`);
    }
    return customer.id;
  }

  async function findEquipmentId(internalNumber: string): Promise<string> {
    const equipment = await prisma.equipment.findFirst({
      where: { organizationId: organization.id, internalNumber, deletedAt: null },
    });
    if (!equipment) {
      throw new Error(`Equipment '${internalNumber}' not found for service call seed`);
    }
    return equipment.id;
  }

  const demoServiceCalls = [
    {
      serviceCallNumber: "SC-001",
      title: "תקלת הידraulics במלגזה",
      description: "לחץ שמן נמוך ורעש חריג במשאבה ההידraulית.",
      status: "OPEN" as const,
      priority: "HIGH" as const,
      customerNumber: "CUST-001",
      equipmentInternalNumber: "EQ-001",
      contactName: "אריק יוהנסון",
      contactPhone: "+46 70 111 2233",
      location: "חצר Nordic Lift — Stockholm",
      notes: "הלקוח דיווח על דליפת שמן קלה.",
      openedAt: new Date("2026-07-10T08:30:00.000Z"),
    },
    {
      serviceCallNumber: "SC-002",
      title: "שירות תקופתי למנוף נייד",
      description: "בדיקת בטיחות ושימון לפני העברה לאתר חדש.",
      status: "SCHEDULED" as const,
      priority: "NORMAL" as const,
      customerNumber: "CUST-002",
      equipmentInternalNumber: "EQ-003",
      scheduledAt: new Date("2026-07-22T06:00:00.000Z"),
      contactName: "Liis Kask",
      contactPhone: "+372 612 3456",
      location: "אתר Baltic Construction — Tallinn",
      openedAt: new Date("2026-07-12T09:00:00.000Z"),
    },
    {
      serviceCallNumber: "SC-003",
      title: "תיקון מערכת היגוי במחפר",
      description: "תגובה איטית בזרוע ובקרת סיבוב.",
      status: "IN_PROGRESS" as const,
      priority: "URGENT" as const,
      customerNumber: "CUST-002",
      equipmentInternalNumber: "EQ-005",
      assignedUserId: technician.id,
      contactName: "Liis Kask",
      location: "פרויקט Harju — Tallinn",
      openedAt: new Date("2026-07-15T07:15:00.000Z"),
      scheduledAt: new Date("2026-07-16T08:00:00.000Z"),
    },
    {
      serviceCallNumber: "SC-004",
      title: "המתנה לחלק חלופי — Telehandler",
      description: "צינור הידraulics הוזמן — צפוי להגיע בעוד 3 ימים.",
      status: "WAITING_FOR_PARTS" as const,
      priority: "HIGH" as const,
      customerNumber: "CUST-001",
      equipmentInternalNumber: "EQ-007",
      assignedUserId: technician.id,
      contactName: "Erik Johansson",
      location: "Nordic Lift — repair bay",
      openedAt: new Date("2026-07-08T11:00:00.000Z"),
    },
    {
      serviceCallNumber: "SC-005",
      title: "בדיקה לאחר תיקון מלגזה",
      description: "אימות תקינות לאחר החלפת מסנן ושמן.",
      status: "COMPLETED" as const,
      priority: "LOW" as const,
      customerNumber: "CUST-003",
      equipmentInternalNumber: "EQ-002",
      assignedUserId: technician.id,
      location: "Metro Warehouse — Helsinki",
      openedAt: new Date("2026-07-01T10:00:00.000Z"),
      completedAt: new Date("2026-07-05T14:30:00.000Z"),
    },
    {
      serviceCallNumber: "SC-006",
      title: "ביטול קריאה כפולה",
      description: "נפתחה קריאה כפולה בטעות — בוטלה על ידי מנהל.",
      status: "CANCELLED" as const,
      priority: "NORMAL" as const,
      customerNumber: "CUST-002",
      equipmentInternalNumber: "EQ-004",
      location: "HQ depot",
      openedAt: new Date("2026-07-14T13:00:00.000Z"),
    },
  ] as const;

  for (const entry of demoServiceCalls) {
    const customerId = await findCustomerId(entry.customerNumber);
    const equipmentId = await findEquipmentId(entry.equipmentInternalNumber);

    await prisma.serviceCall.upsert({
      where: {
        organizationId_serviceCallNumber: {
          organizationId: organization.id,
          serviceCallNumber: entry.serviceCallNumber,
        },
      },
      update: {
        title: entry.title,
        description: entry.description,
        status: entry.status,
        priority: entry.priority,
        openedAt: entry.openedAt,
        scheduledAt: "scheduledAt" in entry ? entry.scheduledAt : null,
        completedAt: "completedAt" in entry ? entry.completedAt : null,
        customerId,
        equipmentId,
        branchId: branch.id,
        assignedUserId: "assignedUserId" in entry ? entry.assignedUserId : null,
        contactName: "contactName" in entry ? entry.contactName : null,
        contactPhone: "contactPhone" in entry ? entry.contactPhone : null,
        location: entry.location,
        notes: "notes" in entry ? entry.notes : null,
      },
      create: {
        organizationId: organization.id,
        serviceCallNumber: entry.serviceCallNumber,
        title: entry.title,
        description: entry.description,
        status: entry.status,
        priority: entry.priority,
        openedAt: entry.openedAt,
        scheduledAt: "scheduledAt" in entry ? entry.scheduledAt : undefined,
        completedAt: "completedAt" in entry ? entry.completedAt : undefined,
        customerId,
        equipmentId,
        branchId: branch.id,
        assignedUserId: "assignedUserId" in entry ? entry.assignedUserId : undefined,
        contactName: "contactName" in entry ? entry.contactName : undefined,
        contactPhone: "contactPhone" in entry ? entry.contactPhone : undefined,
        location: entry.location,
        notes: "notes" in entry ? entry.notes : undefined,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Organization: ${organization.slug} (${organization.id})`);
  console.log(`  Company: ${company.code} (${company.id})`);
  console.log(`  Branch: ${branch.code} (${branch.id})`);
  console.log(`  Customers: ${demoCustomers.length} demo records`);
  console.log(`  Equipment types: ${demoEquipmentTypes.length}`);
  console.log(`  Equipment: ${demoEquipment.length} demo records`);
  console.log(`  Service calls: ${demoServiceCalls.length} demo records`);
  for (const demoUser of DEMO_USERS) {
    const seeded = seededUsers.get(demoUser.email);
    console.log(`  ${demoUser.displayName}: ${demoUser.email} (${seeded?.id ?? "missing"})`);
  }
  console.log(`  Demo password: ${DEMO_PASSWORD}`);
  console.log(`  Permissions: ${permissions.length}`);
  console.log(`  Roles: ${roles.map((role) => role.slug).join(", ")}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
