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
  export function getCurrentPositionAsync(options?: {
    accuracy?: Accuracy;
  }): Promise<LocationObject>;
  export function watchPositionAsync(
    options: { accuracy?: Accuracy; timeInterval?: number; distanceInterval?: number },
    callback: (location: LocationObject) => void,
  ): Promise<LocationSubscription>;
}
