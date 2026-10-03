import { describe, expect, it } from "vitest";
import {
  createInspirationQuoteSchema,
  updateEmployeeInspirationSchema,
  upsertEmployeeInspirationSchema,
} from "./inspiration.schemas.js";

describe("inspiration schemas", () => {
  it("accepts a general quote and optional author", () => {
    expect(
      createInspirationQuoteSchema.safeParse({ text: "הצלחה מתחילה בעקביות", author: "אמארוק" })
        .success,
    ).toBe(true);
  });

  it("accepts a private employee message", () => {
    expect(
      upsertEmployeeInspirationSchema.safeParse({ text: "עבודה מצוינת היום", isActive: true })
        .success,
    ).toBe(true);
  });

  it("allows only a reversible active-state update for an employee message", () => {
    expect(updateEmployeeInspirationSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateEmployeeInspirationSchema.safeParse({ text: "לא מורשה כאן" }).success).toBe(false);
  });
});
