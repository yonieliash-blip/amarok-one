import type { LocationObject } from "expo-location";
import type { TrackedLocation } from "../api/attendance";

export function mapLocationObjects(locations: LocationObject[]): TrackedLocation[] {
  return locations
    .filter(
      (location) =>
        Number.isFinite(location.coords.latitude) &&
        Number.isFinite(location.coords.longitude) &&
        Number.isFinite(location.timestamp),
    )
    .map((location) => ({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      recordedAt: new Date(location.timestamp).toISOString(),
      ...(location.coords.accuracy === null ? {} : { accuracy: location.coords.accuracy }),
    }));
}
