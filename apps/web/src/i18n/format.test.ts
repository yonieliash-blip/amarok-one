import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPhone } from "./format.js";

describe("format", () => {
  it("formats dates for Hebrew locale", () => {
    const formatted = formatDate("2026-07-18T12:00:00.000Z", "he");
    expect(formatted).toMatch(/18/);
    expect(formatted).toMatch(/2026/);
  });

  it("formats date and time for Hebrew locale", () => {
    const formatted = formatDateTime("2026-07-18T14:30:00.000Z", "he");
    expect(formatted).toMatch(/18/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/1[4-7]/);
  });

  it("formats Israeli phone numbers", () => {
    expect(formatPhone("+972501234567", "he")).toBe("050-123-4567");
  });

  it("formats currency in ILS", () => {
    const formatted = formatCurrency(1250, "he");
    expect(formatted).toContain("1");
    expect(formatted).toMatch(/₪|ILS/);
  });

  it("formats numbers with locale grouping", () => {
    expect(formatNumber(1234567, "he")).toBe("1,234,567");
  });
});
