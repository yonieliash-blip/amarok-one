import type {
  AuthRole,
  AuthSession,
  AuthUser,
  Permission as PermissionDto,
} from "@amarok-one/types";
import { unauthorized } from "../../lib/errors.js";
import {
  createRefreshTokenId,
  getAccessTokenTtlSeconds,
  getRefreshTokenTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { hashPassword, hashToken, verifyPassword, verifyTokenHash } from "../../lib/password.js";
import { activeOnly } from "../../lib/mappers.js";
import { prisma } from "../../lib/prisma.js";
import type {
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  SwitchRoleInput,
} from "./auth.schemas.js";

const userRoleInclude = {
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
  organization: true,
} as const;

type LoadedUserRole = Awaited<ReturnType<typeof loadUserRolesForOrganization>>[number];

function toPermissionDto(permission: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}): PermissionDto {
  return {
    id: permission.id,
    slug: permission.slug,
    name: permission.name,
    description: permission.description ?? undefined,
  };
}

function toAuthRole(role: { id: string; slug: string; name: string }): AuthRole {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
  };
}

function extractPermissionsForRole(userRole: LoadedUserRole): PermissionDto[] {
  return userRole.role.rolePermissions.map((entry) => toPermissionDto(entry.permission));
}

function toAuthUser(
  user: { id: string; email: string; displayName: string; lastLoginAt: Date | null },
  organization: { id: string; slug: string; name: string },
  userRoles: LoadedUserRole[],
  activeUserRole: LoadedUserRole,
): AuthUser {
  const roles = userRoles.map((entry) => toAuthRole(entry.role));
  const activeRole = toAuthRole(activeUserRole.role);

  if (!activeRole) {
    throw unauthorized("User has no active organization membership");
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    },
    role: activeRole,
    roles,
    permissions: extractPermissionsForRole(activeUserRole),
  };
}

async function loadUserRolesForOrganization(userId: string, organizationSlug?: string) {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      ...activeOnly,
      role: activeOnly,
      organization: activeOnly,
    },
    include: userRoleInclude,
    orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
  });

  if (userRoles.length === 0) {
    throw unauthorized("User has no active organization membership");
  }

  const organizationId = organizationSlug
    ? userRoles.find((entry) => entry.organization.slug === organizationSlug)?.organizationId
    : userRoles[0]?.organizationId;

  if (!organizationId) {
    throw unauthorized("User is not a member of the requested organization");
  }

  const scopedRoles = userRoles.filter((entry) => entry.organizationId === organizationId);
  if (scopedRoles.length === 0) {
    throw unauthorized("User has no active organization membership");
  }

  return scopedRoles;
}

function buildAccessTokenPayload(
  user: { id: string; email: string },
  userRoles: LoadedUserRole[],
  activeUserRole: LoadedUserRole,
) {
  const organization = activeUserRole.organization;
  const activeRole = activeUserRole.role;

  const roles = userRoles.map((entry) => toAuthRole(entry.role));
  const permissionSlugs = activeUserRole.role.rolePermissions.map(
    (rolePermission) => rolePermission.permission.slug,
  );

  return {
    sub: user.id,
    email: user.email,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    roleId: activeRole.id,
    roleSlug: activeRole.slug,
    roles,
    permissions: permissionSlugs,
  };
}

function resolveActiveUserRole(userRoles: LoadedUserRole[], activeRoleId?: string): LoadedUserRole {
  if (activeRoleId) {
    const selected = userRoles.find((entry) => entry.role.id === activeRoleId);
    if (!selected) {
      throw unauthorized("Role is not assigned to the current user");
    }
    return selected;
  }

  const primary = userRoles[0];
  if (!primary) {
    throw unauthorized("User has no active organization membership");
  }

  return primary;
}

async function createSessionForUser(
  user: { id: string; email: string; displayName: string; lastLoginAt: Date | null },
  userRoles: LoadedUserRole[],
  activeRoleId?: string,
  options?: { rotateRefreshToken?: string },
): Promise<AuthSession> {
  const activeUserRole = resolveActiveUserRole(userRoles, activeRoleId);
  const accessToken = await signAccessToken(
    buildAccessTokenPayload(user, userRoles, activeUserRole),
  );

  let refreshToken: string;
  if (options?.rotateRefreshToken) {
    refreshToken = options.rotateRefreshToken;
  } else {
    const refreshTokenId = createRefreshTokenId();
    refreshToken = await signRefreshToken(user.id, refreshTokenId);
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenTtlSeconds(),
    tokenType: "Bearer",
    user: toAuthUser(user, activeUserRole.organization, userRoles, activeUserRole),
  };
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email.toLowerCase(),
      ...activeOnly,
      isActive: true,
    },
  });

  if (!user?.passwordHash) {
    throw unauthorized("Invalid email or password");
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw unauthorized("Invalid email or password");
  }

  const userRoles = await loadUserRolesForOrganization(user.id, input.organizationSlug);
  const session = await createSessionForUser(user, userRoles);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return session;
}

export async function refreshSession(input: RefreshTokenInput): Promise<AuthSession> {
  let payload;
  try {
    payload = await verifyRefreshToken(input.refreshToken);
  } catch {
    throw unauthorized("Invalid or expired refresh token");
  }

  const candidates = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  let storedToken = null;
  for (const candidate of candidates) {
    if (await verifyTokenHash(input.refreshToken, candidate.tokenHash)) {
      storedToken = candidate;
      break;
    }
  }

  if (!storedToken) {
    throw unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, ...activeOnly, isActive: true },
  });

  if (!user) {
    throw unauthorized("User account is inactive");
  }

  const userRoles = await loadUserRolesForOrganization(user.id);
  const activeUserRole = resolveActiveUserRole(userRoles, input.activeRoleId);
  const accessToken = await signAccessToken(
    buildAccessTokenPayload(user, userRoles, activeUserRole),
  );

  const newRefreshTokenId = createRefreshTokenId();
  const newRefreshToken = await signRefreshToken(user.id, newRefreshTokenId);
  const newTokenHash = await hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    }),
  ]);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: getAccessTokenTtlSeconds(),
    tokenType: "Bearer",
    user: toAuthUser(user, activeUserRole.organization, userRoles, activeUserRole),
  };
}

export async function logout(userId: string, input: LogoutInput): Promise<void> {
  if (input.refreshToken) {
    const candidates = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const candidate of candidates) {
      if (await verifyTokenHash(input.refreshToken, candidate.tokenHash)) {
        await prisma.refreshToken.update({
          where: { id: candidate.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getCurrentUser(
  userId: string,
  organizationId: string,
  activeRoleId?: string,
): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeOnly, isActive: true },
  });

  if (!user) {
    throw unauthorized("User account is inactive");
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      organizationId,
      ...activeOnly,
      role: activeOnly,
      organization: activeOnly,
    },
    include: userRoleInclude,
    orderBy: { createdAt: "asc" },
  });

  if (userRoles.length === 0) {
    throw unauthorized("User has no active membership in the current organization");
  }

  const activeUserRole = resolveActiveUserRole(userRoles, activeRoleId);
  return toAuthUser(user, activeUserRole.organization, userRoles, activeUserRole);
}

export async function switchRole(
  userId: string,
  organizationId: string,
  input: SwitchRoleInput,
): Promise<AuthSession> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeOnly, isActive: true },
  });

  if (!user) {
    throw unauthorized("User account is inactive");
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      organizationId,
      ...activeOnly,
      role: activeOnly,
      organization: activeOnly,
    },
    include: userRoleInclude,
    orderBy: { createdAt: "asc" },
  });

  if (userRoles.length === 0) {
    throw unauthorized("User has no active membership in the current organization");
  }

  const activeUserRole = resolveActiveUserRole(userRoles, input.roleId);
  const accessToken = await signAccessToken(
    buildAccessTokenPayload(user, userRoles, activeUserRole),
  );

  return {
    accessToken,
    refreshToken: "",
    expiresIn: getAccessTokenTtlSeconds(),
    tokenType: "Bearer",
    user: toAuthUser(user, activeUserRole.organization, userRoles, activeUserRole),
  };
}

export { hashPassword };
