import { describe, expect, it } from "vitest";
import {
  availabilityRangeQuerySchema,
  updateTechnicianAvailabilitySchema,
} from "./technician-availability.schemas.js";

describe("technician availability schemas", () => {
  it("accepts a bounded calendar-date range", () => {
    expect(availabilityRangeQuerySchema.parse({ from: "2026-10-03", to: "2026-10-10" })).toEqual({
      from: "2026-10-03",
      to: "2026-10-10",
    });
  });

  it("rejects invalid, reversed, and overly broad ranges", () => {
    expect(
      availabilityRangeQuerySchema.safeParse({ from: "2026-02-31", to: "2026-03-01" }).success,
    ).toBe(false);
    expect(
      availabilityRangeQuerySchema.safeParse({ from: "2026-10-04", to: "2026-10-03" }).success,
    ).toBe(false);
    expect(
      availabilityRangeQuerySchema.safeParse({ from: "2026-10-01", to: "2026-11-15" }).success,
    ).toBe(false);
  });

  it("accepts only explicit availability states", () => {
    expect(
      updateTechnicianAvailabilitySchema.parse({ status: "unavailable", note: "חופשה" }),
    ).toEqual({ status: "unavailable", note: "חופשה" });
    expect(updateTechnicianAvailabilitySchema.safeParse({ status: "away" }).success).toBe(false);
  });
});
