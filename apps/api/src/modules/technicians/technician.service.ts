import { prisma } from "../../lib/prisma.js";

/** List technician members belonging to the active organization only. */
export async function listTechnicians(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      deletedAt: null,
      primaryRole: { slug: "technician", deletedAt: null },
      user: { deletedAt: null },
    },
    include: {
      user: true,
      primaryRole: true,
    },
    orderBy: [{ status: "asc" }, { user: { displayName: "asc" } }],
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    displayName: member.user.displayName,
    email: member.user.email,
    status: member.status,
    isActive: member.user.isActive && member.status === "ACTIVE",
    role: {
      id: member.primaryRole.id,
      slug: member.primaryRole.slug,
      name: member.primaryRole.name,
    },
  }));
}
