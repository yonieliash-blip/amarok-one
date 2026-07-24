import { describe, expect, it } from "vitest";
import { interpolate, translatePermission } from "./translate.js";
import { he } from "./locales/he.js";

describe("translate", () => {
  it("interpolates template variables", () => {
    expect(interpolate("שלום {{name}}", { name: "Amarok" })).toBe("שלום Amarok");
  });

  it("translates permission slugs with fallback", () => {
    expect(translatePermission(he, "customers:read", "Read Customers")).toBe("צפייה בלקוחות");
    expect(translatePermission(he, "unknown:permission", "Fallback")).toBe("Fallback");
  });
});
