import { describe, expect, it, vi } from "vitest";
import { reserveOperationalNumber } from "./organization-number-sequence.js";

const organizationId = "11111111-1111-4111-8111-111111111111";

describe("reserveOperationalNumber", () => {
  it("formats the first customer number with the AMAROK customer prefix", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextValue: 2 });

    await expect(
      reserveOperationalNumber(
        { organizationNumberSequence: { upsert } } as never,
        organizationId,
        "customer-number",
      ),
    ).resolves.toBe("AM-CU-01");
  });

  it("uses the reserved sequence value for service-call numbers", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextValue: 43 });

    await expect(
      reserveOperationalNumber(
        { organizationNumberSequence: { upsert } } as never,
        organizationId,
        "service-call-number",
      ),
    ).resolves.toBe("AM-SE-42");
  });

  it("does not truncate operational numbers after the first two digits", async () => {
    const upsert = vi.fn().mockResolvedValue({ nextValue: 102 });

    await expect(
      reserveOperationalNumber(
        { organizationNumberSequence: { upsert } } as never,
        organizationId,
        "customer-number",
      ),
    ).resolves.toBe("AM-CU-101");
  });
});
