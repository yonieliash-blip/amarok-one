import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";

export interface AccessTokenRole {
  id: string;
  slug: string;
  name: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  organizationSlug: string;
  /** Primary role kept for backward compatibility */
  roleId: string;
  roleSlug: string;
  roles: AccessTokenRole[];
  permissions: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

export function getAccessTokenTtlSeconds(): number {
  return parseDurationToSeconds(env.JWT_EXPIRES_IN);
}

export function getRefreshTokenTtlSeconds(): number {
  return parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
}

export function createRefreshTokenId(): string {
  return randomBytes(32).toString("hex");
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${getAccessTokenTtlSeconds()}s`)
    .sign(accessSecret);
}

export async function signRefreshToken(userId: string, tokenId: string): Promise<string> {
  return new SignJWT({ sub: userId, jti: tokenId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${getRefreshTokenTtlSeconds()}s`)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload as unknown as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (
    payload.type !== "refresh" ||
    typeof payload.jti !== "string" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid refresh token");
  }

  return {
    sub: payload.sub,
    jti: payload.jti,
    type: "refresh",
  };
}
