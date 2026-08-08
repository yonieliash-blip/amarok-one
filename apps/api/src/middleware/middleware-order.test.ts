import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

describe("protected route middleware order", () => {
  it("establishes tenant context before permission re-resolution DB queries", () => {
    const routesPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../routes.ts");
    const source = readFileSync(routesPath, "utf8");
    const chain = source.match(/\.use\("\*", jwtGuard\)[\s\S]*?\.route\("\/organizations"/)?.[0];

    expect(chain).toBeTruthy();
    const jwtIndex = chain!.indexOf("jwtGuard");
    const tenantIndex = chain!.indexOf("tenantContextMiddleware");
    const permissionsIndex = chain!.indexOf("permissionsResolutionMiddleware");

    expect(jwtIndex).toBeGreaterThanOrEqual(0);
    expect(tenantIndex).toBeGreaterThan(jwtIndex);
    expect(permissionsIndex).toBeGreaterThan(tenantIndex);
  });
});
