import type {
  AuthRole,
  AuthSession,
  AuthUser,
  Permission as PermissionDto,
} from "@amarok-one/types";
import { ALL_PERMISSIONS } from "@amarok-one/permissions";
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
import { runWithoutTenantIsolation } from "../../lib/tenant-context.js";
import {
  loadOrganizationMember,
  memberInclude,
  resolveMemberAuthorization,
  type LoadedOrganizationMember,
} from "../../lib/member-access.js";
import type {
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  SwitchRoleInput,
} from "./auth.schemas.js";

const permissionCatalog = new Map(ALL_PERMISSIONS.map((entry) => [entry.slug, entry]));

function toPermissionDto(slug: string): PermissionDto {
  const definition = permissionCatalog.get(slug as (typeof ALL_PERMISSIONS)[number]["slug"]);
  if (definition) {
    return {
      id: definition.slug,
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
    };
  }

  return {
    id: slug,
    slug,
    name: slug,
    description: undefined,
  };
}

function toAuthRole(role: { id: string; slug: string; name: string }): AuthRole {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
  };
}

function toAuthUserFromMember(
  user: { id: string; email: string; displayName: string; lastLoginAt: Date | null },
  member: LoadedOrganizationMember,
  resolved: ReturnType<typeof resolveMemberAuthorization>,
): AuthUser {
  const role = toAuthRole(member.primaryRole);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    organization: {
      id: member.organization.id,
      slug: member.organization.slug,
      name: member.organization.name,
    },
    role,
    roles: [role],
    permissions: resolved.permissions.map(toPermissionDto),
    enabledModules: resolved.enabledModules,
    permissionsVersion: resolved.permissionsVersion,
    isOrganizationOwner: resolved.isOrganizationOwner,
    memberId: member.id,
  };
}

async function loadMemberForOrganization(userId: string, organizationSlug?: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      userId,
      ...activeOnly,
      status: "ACTIVE",
      user: activeOnly,
      primaryRole: activeOnly,
      organization: activeOnly,
    },
    include: memberInclude,
    orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
  });

  if (members.length === 0) {
    throw unauthorized("User has no active organization membership");
  }

  const member = organizationSlug
    ? members.find((entry) => entry.organization.slug === organizationSlug)
    : members[0];

  if (!member) {
    throw unauthorized("User is not a member of the requested organization");
  }

  return member;
}

function buildAccessTokenPayload(
  user: { id: string; email: string },
  member: LoadedOrganizationMember,
  resolved: ReturnType<typeof resolveMemberAuthorization>,
) {
  const role = toAuthRole(member.primaryRole);

  return {
    sub: user.id,
    email: user.email,
    organizationId: member.organizationId,
    organizationSlug: member.organization.slug,
    roleId: member.primaryRoleId,
    roleSlug: member.primaryRole.slug,
    roles: [role],
    permissions: resolved.permissions,
    permissionsVersion: resolved.permissionsVersion,
    enabledModules: resolved.enabledModules,
    isOrganizationOwner: resolved.isOrganizationOwner,
  };
}

async function createSessionForMember(
  user: { id: string; email: string; displayName: string; lastLoginAt: Date | null },
  member: LoadedOrganizationMember,
  options?: { rotateRefreshToken?: string },
): Promise<AuthSession> {
  const resolved = resolveMemberAuthorization(member);
  const accessToken = await signAccessToken(buildAccessTokenPayload(user, member, resolved));

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
    user: toAuthUserFromMember(user, member, resolved),
  };
}

export async function login(input: LoginInput): Promise<AuthSession> {
  return runWithoutTenantIsolation(async () => {
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

    const member = await loadMemberForOrganization(user.id, input.organizationSlug);
    const session = await createSessionForMember(user, member);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return session;
  });
}

export async function refreshSession(input: RefreshTokenInput): Promise<AuthSession> {
  return runWithoutTenantIsolation(async () => {
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

    const member = input.organizationId
      ? await loadOrganizationMember(input.organizationId, user.id)
      : await loadMemberForOrganization(user.id);

    if (!member) {
      throw unauthorized("User has no active organization membership");
    }

    const resolved = resolveMemberAuthorization(member);
    const accessToken = await signAccessToken(buildAccessTokenPayload(user, member, resolved));

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
      user: toAuthUserFromMember(user, member, resolved),
    };
  });
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

export async function getCurrentUser(userId: string, organizationId: string): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeOnly, isActive: true },
  });

  if (!user) {
    throw unauthorized("User account is inactive");
  }

  const member = await loadOrganizationMember(organizationId, userId);
  if (!member) {
    throw unauthorized("User has no active membership in the current organization");
  }

  return toAuthUserFromMember(user, member, resolveMemberAuthorization(member));
}

/** Legacy role switch retained for compatibility — primary role is membership-bound. */
export async function switchRole(
  userId: string,
  organizationId: string,
  _input: SwitchRoleInput,
): Promise<AuthSession> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeOnly, isActive: true },
  });

  if (!user) {
    throw unauthorized("User account is inactive");
  }

  const member = await loadOrganizationMember(organizationId, userId);
  if (!member) {
    throw unauthorized("User has no active membership in the current organization");
  }

  const resolved = resolveMemberAuthorization(member);
  const accessToken = await signAccessToken(buildAccessTokenPayload(user, member, resolved));

  return {
    accessToken,
    refreshToken: "",
    expiresIn: getAccessTokenTtlSeconds(),
    tokenType: "Bearer",
    user: toAuthUserFromMember(user, member, resolved),
  };
}

export { hashPassword };
