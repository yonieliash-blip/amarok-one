import { describe, expect, it } from "vitest";
import { mapLocationObjects } from "./location-mapping";

describe("mapLocationObjects", () => {
  it("maps valid native samples and rejects malformed coordinates", () => {
    expect(
      mapLocationObjects([
        { coords: { latitude: 32.1, longitude: 34.8, accuracy: 12 }, timestamp: 1_700_000_000_000 },
        { coords: { latitude: Number.NaN, longitude: 34.8, accuracy: null }, timestamp: 1 },
      ]),
    ).toEqual([
      {
        latitude: 32.1,
        longitude: 34.8,
        accuracy: 12,
        recordedAt: "2023-11-14T22:13:20.000Z",
      },
    ]);
  });
});
