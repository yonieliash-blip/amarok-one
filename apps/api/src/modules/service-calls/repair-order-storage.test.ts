import { describe, expect, it } from "vitest";
import { assertImageUpload, hasExpectedImageSignature } from "./repair-order-storage.js";

describe("repair-order photo upload validation", () => {
  it("accepts matching JPEG, PNG, WEBP and HEIC signatures", () => {
    expect(hasExpectedImageSignature("image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toBe(
      true,
    );
    expect(
      hasExpectedImageSignature("image/png", Buffer.from("89504e470d0a1a0a00000000", "hex")),
    ).toBe(true);
    expect(hasExpectedImageSignature("image/webp", Buffer.from("RIFF0000WEBP", "ascii"))).toBe(
      true,
    );
    expect(
      hasExpectedImageSignature("image/heic", Buffer.from("000000006674797068656963", "hex")),
    ).toBe(true);
  });

  it("rejects a client-declared image with a non-image payload", () => {
    expect(() =>
      assertImageUpload("fault", { type: "image/jpeg" }, Buffer.from("not an image")),
    ).toThrow("תוכן הצילום אינו תואם לסוג הקובץ שנבחר.");
  });
});
