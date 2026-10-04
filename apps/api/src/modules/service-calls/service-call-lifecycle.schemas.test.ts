import { describe, expect, it } from "vitest";
import { saveWorkReportSchema } from "./service-call-lifecycle.schemas.js";

describe("saveWorkReportSchema", () => {
  it("accepts inventory and manual repair-order parts together", () => {
    const result = saveWorkReportSchema.safeParse({
      parts: [
        {
          inventoryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          quantity: 2,
        },
        {
          manualName: "אטם הידראולי",
          manualPartNumber: "HYD-441",
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a manual part without a description", () => {
    const result = saveWorkReportSchema.safeParse({
      parts: [{ manualName: "", quantity: 1 }],
    });

    expect(result.success).toBe(false);
  });
});
