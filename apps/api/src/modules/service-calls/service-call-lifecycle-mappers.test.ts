import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_STATE_FROM_DTO,
  LIFECYCLE_STATE_TO_DTO,
  toServiceCallLifecycleStateDto,
} from "./service-call-lifecycle-mappers.js";

describe("service-call-lifecycle-mappers", () => {
  it("round-trips lifecycle states", () => {
    for (const dto of Object.keys(
      LIFECYCLE_STATE_FROM_DTO,
    ) as (keyof typeof LIFECYCLE_STATE_FROM_DTO)[]) {
      const prisma = LIFECYCLE_STATE_FROM_DTO[dto];
      expect(toServiceCallLifecycleStateDto(prisma)).toBe(dto);
      expect(LIFECYCLE_STATE_TO_DTO[prisma]).toBe(dto);
    }
  });
});
