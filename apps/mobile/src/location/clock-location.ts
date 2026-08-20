import * as Location from "expo-location";
import type { ClockLocation } from "../api/attendance";

/** Attendance remains usable when location permission is denied; the server records that no GPS was captured. */
export async function captureClockLocation(): Promise<ClockLocation | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;
  const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
    ...(result.coords.accuracy === null ? {} : { accuracy: result.coords.accuracy }),
  };
}
