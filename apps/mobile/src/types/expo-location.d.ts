declare module "expo-location" {
  export enum Accuracy {
    Balanced = 3,
  }
  export interface LocationObject {
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  }
  export interface LocationSubscription {
    remove(): void;
  }
  export function requestForegroundPermissionsAsync(): Promise<{ status: string }>;
  export function requestBackgroundPermissionsAsync(): Promise<{ status: string }>;
  export function getCurrentPositionAsync(options?: {
    accuracy?: Accuracy;
  }): Promise<LocationObject>;
  export function watchPositionAsync(
    options: { accuracy?: Accuracy; timeInterval?: number; distanceInterval?: number },
    callback: (location: LocationObject) => void,
  ): Promise<LocationSubscription>;
  export function hasStartedLocationUpdatesAsync(taskName: string): Promise<boolean>;
  export function startLocationUpdatesAsync(
    taskName: string,
    options: {
      accuracy?: Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
      deferredUpdatesInterval?: number;
      deferredUpdatesDistance?: number;
      pausesUpdatesAutomatically?: boolean;
      showsBackgroundLocationIndicator?: boolean;
      foregroundService?: { notificationTitle: string; notificationBody: string };
    },
  ): Promise<void>;
  export function stopLocationUpdatesAsync(taskName: string): Promise<void>;
}
