import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./env";

describe("resolveApiUrl", () => {
  it("uses and normalizes the configured API URL", () => {
    expect(resolveApiUrl(" https://staging.example.com/// ")).toEqual({
      apiUrl: "https://staging.example.com",
      isConfigured: true,
    });
  });

  it("keeps localhost as a development fallback and marks it as unconfigured", () => {
    expect(resolveApiUrl(undefined)).toEqual({
      apiUrl: "http://localhost:3000",
      isConfigured: false,
    });
  });
});
