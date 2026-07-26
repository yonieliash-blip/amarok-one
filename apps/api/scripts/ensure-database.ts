import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { PrismaClient } from "@prisma/client";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const API_ROOT = path.join(REPO_ROOT, "apps", "api");
const COMPOSE_FILE = path.join(
  REPO_ROOT,
  "infrastructure",
  "docker",
  "docker-compose.postgres.yml",
);
const EMBEDDED_DATA_DIR = path.join(REPO_ROOT, ".data", "postgres");

const EMBEDDED_CONFIG = {
  user: "amarok",
  password: "amarok",
  port: Number(process.env.POSTGRES_PORT ?? 5433),
  database: "amarok_one",
} as const;

const DEFAULT_DATABASE_URL = `postgresql://${EMBEDDED_CONFIG.user}:${EMBEDDED_CONFIG.password}@localhost:${EMBEDDED_CONFIG.port}/${EMBEDDED_CONFIG.database}?schema=public`;

function run(command: string, cwd: string = REPO_ROOT): void {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", cwd, env: process.env, shell: true });
}

function runOptional(command: string, cwd: string = REPO_ROOT): boolean {
  try {
    run(command, cwd);
    return true;
  } catch {
    return false;
  }
}

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

async function isDatabaseReady(databaseUrl: string): Promise<boolean> {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function waitForDatabase(databaseUrl: string, maxAttempts = 45): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await isDatabaseReady(databaseUrl)) {
      console.log("PostgreSQL is ready.");
      return;
    }

    console.log(`Waiting for PostgreSQL... (${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("PostgreSQL did not become ready in time");
}

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

async function startDockerPostgres(): Promise<void> {
  console.log("Starting PostgreSQL via Docker Compose...");
  run(`docker compose -f "${COMPOSE_FILE}" up -d --wait`);
}

async function ensureApplicationDatabase(config: typeof EMBEDDED_CONFIG): Promise<void> {
  for (const adminDatabase of ["postgres", config.user]) {
    const client = new pg.Client({
      host: "localhost",
      port: config.port,
      user: config.user,
      password: config.password,
      database: adminDatabase,
    });

    try {
      await client.connect();
      const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
        config.database,
      ]);

      if (existing.rowCount === 0) {
        console.log(`Creating database "${config.database}" with UTF-8 encoding...`);
        await client.query(
          `CREATE DATABASE "${config.database}" ENCODING 'UTF8' TEMPLATE template0`,
        );
      }

      await client.end();
      return;
    } catch (error) {
      await client.end().catch(() => undefined);
      if (adminDatabase === config.user) {
        throw error;
      }
    }
  }
}

async function startEmbeddedPostgres(): Promise<string> {
  console.log("Docker unavailable — starting embedded PostgreSQL...");
  fs.mkdirSync(EMBEDDED_DATA_DIR, { recursive: true });

  const postgres = new EmbeddedPostgres({
    ...EMBEDDED_CONFIG,
    databaseDir: EMBEDDED_DATA_DIR,
    persistent: true,
  });

  const dataDirReady = fs.existsSync(path.join(EMBEDDED_DATA_DIR, "PG_VERSION"));

  if (!dataDirReady) {
    console.log("Initialising embedded PostgreSQL data directory...");
    await postgres.initialise();
  }

  if (
    !(await isDatabaseReady(
      `postgresql://${EMBEDDED_CONFIG.user}:${EMBEDDED_CONFIG.password}@localhost:${EMBEDDED_CONFIG.port}/postgres?schema=public`,
    ))
  ) {
    await postgres.start();
    console.log(`Embedded PostgreSQL started on port ${EMBEDDED_CONFIG.port}.`);
  } else {
    console.log("Embedded PostgreSQL is already running on port 5432.");
  }

  await ensureApplicationDatabase(EMBEDDED_CONFIG);

  return `postgresql://${EMBEDDED_CONFIG.user}:${EMBEDDED_CONFIG.password}@localhost:${EMBEDDED_CONFIG.port}/${EMBEDDED_CONFIG.database}?schema=public`;
}

async function ensurePostgresRunning(databaseUrl: string): Promise<string> {
  if (await isDatabaseReady(databaseUrl)) {
    console.log("PostgreSQL is already running.");
    return databaseUrl;
  }

  if (dockerAvailable()) {
    await startDockerPostgres();
    await waitForDatabase(databaseUrl);
    return databaseUrl;
  }

  const embeddedUrl = await startEmbeddedPostgres();
  process.env.DATABASE_URL = embeddedUrl;
  await waitForDatabase(embeddedUrl);
  return embeddedUrl;
}

async function main(): Promise<void> {
  let databaseUrl = resolveDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  databaseUrl = await ensurePostgresRunning(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  console.log("Applying Prisma migrations...");
  run("pnpm exec prisma migrate deploy", API_ROOT);

  console.log("Generating Prisma client...");
  if (!runOptional("pnpm exec prisma generate", API_ROOT)) {
    console.warn("Prisma generate skipped — client may already be up to date.");
  }

  console.log("Seeding database...");
  run("pnpm exec tsx --env-file=../../.env prisma/seed.ts", API_ROOT);

  console.log("Database setup complete.");
}

main().catch((error: unknown) => {
  console.error("Database setup failed:", error);
  process.exit(1);
});
