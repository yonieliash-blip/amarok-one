import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit.js";

describe("getClientIp", () => {
  it("prefers the first X-Forwarded-For address", () => {
    expect(getClientIp("203.0.113.1, 10.0.0.1", undefined)).toBe("203.0.113.1");
  });

  it("falls back to X-Real-IP", () => {
    expect(getClientIp(undefined, "198.51.100.2")).toBe("198.51.100.2");
  });
});

describe("checkRateLimit", () => {
  it("allows requests within the window", () => {
    const store = new Map();
    const options = { windowMs: 60_000, max: 2 };
    expect(checkRateLimit(store, "1.2.3.4", options, 1_000).allowed).toBe(true);
    expect(checkRateLimit(store, "1.2.3.4", options, 2_000).allowed).toBe(true);
    expect(checkRateLimit(store, "1.2.3.4", options, 3_000).allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    const store = new Map();
    const options = { windowMs: 1_000, max: 1 };
    expect(checkRateLimit(store, "1.2.3.4", options, 0).allowed).toBe(true);
    expect(checkRateLimit(store, "1.2.3.4", options, 500).allowed).toBe(false);
    expect(checkRateLimit(store, "1.2.3.4", options, 1_001).allowed).toBe(true);
  });
});
