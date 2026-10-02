import { describe, expect, it } from "vitest";
import { canonicalParticipants } from "./messages.helpers.js";
import { sendDirectMessageSchema } from "./messages.schemas.js";

describe("direct message input", () => {
  it("accepts a trimmed private message within the safe length limit", () => {
    expect(sendDirectMessageSchema.parse({ body: "  בוקר טוב  " })).toEqual({
      body: "בוקר טוב",
    });
  });

  it("rejects empty messages and messages above the limit", () => {
    expect(() => sendDirectMessageSchema.parse({ body: "   " })).toThrow();
    expect(() => sendDirectMessageSchema.parse({ body: "א".repeat(2001) })).toThrow();
  });

  it("keeps the participant pair canonical regardless of sender order", () => {
    expect(canonicalParticipants("b-user", "a-user")).toEqual(["a-user", "b-user"]);
    expect(canonicalParticipants("a-user", "b-user")).toEqual(["a-user", "b-user"]);
  });
});
