import { describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors.js";
import { parseDispatchRange } from "./service-call-dispatch.js";

describe("parseDispatchRange", () => {
  it("accepts a single operational day", () => {
    const range = parseDispatchRange("2026-10-02T00:00:00.000Z", "2026-10-03T00:00:00.000Z");

    expect(range.scheduledFrom.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(range.scheduledTo.toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });

  it("rejects reversed and overlong ranges", () => {
    expect(() =>
      parseDispatchRange("2026-10-03T00:00:00.000Z", "2026-10-02T00:00:00.000Z"),
    ).toThrow(AppError);
    expect(() =>
      parseDispatchRange("2026-10-01T00:00:00.000Z", "2026-10-04T00:00:00.000Z"),
    ).toThrow(AppError);
  });
});
