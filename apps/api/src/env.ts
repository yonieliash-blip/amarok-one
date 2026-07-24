const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";
const DEFAULT_DATABASE_URL = `postgresql://amarok:amarok@localhost:${process.env.POSTGRES_PORT ?? "5433"}/amarok_one?schema=public`;
const DEFAULT_JWT_EXPIRES_IN = "15m";
const DEFAULT_JWT_REFRESH_EXPIRES_IN = "7d";
const DEFAULT_SEED_ADMIN_PASSWORD = "Admin@123456";

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
}

function requireSecret(value: string | undefined, name: string, minLength: number): string {
  const secret = value?.trim();
  if (!secret || secret.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} characters`);
  }
  return secret;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  HOST: process.env.HOST ?? DEFAULT_HOST,
  PORT: parsePort(process.env.PORT),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL,
  JWT_SECRET: requireSecret(process.env.JWT_SECRET, "JWT_SECRET", 32),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: requireSecret(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET", 32),
  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN?.trim() || DEFAULT_JWT_REFRESH_EXPIRES_IN,
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD?.trim() || DEFAULT_SEED_ADMIN_PASSWORD,
} as const;
