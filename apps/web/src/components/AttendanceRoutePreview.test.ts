import { describe, expect, it } from "vitest";
import { buildRoutePolyline } from "../lib/attendance-route-preview";

describe("attendance route preview", () => {
  it("normalizes GPS points into the SVG drawing area", () => {
    const path = buildRoutePolyline([
      { id: "1", recordedAt: "2026-08-20T06:00:00Z", latitude: 32, longitude: 34, accuracy: 10 },
      { id: "2", recordedAt: "2026-08-20T06:05:00Z", latitude: 33, longitude: 35, accuracy: 10 },
    ]);
    expect(path).toBe("24.0,236.0 576.0,24.0");
  });
});
