declare module "expo-location" {
  export enum Accuracy {
    Balanced = 3,
  }
  export interface LocationObject {
    coords: { latitude: number; longitude: number; accuracy: number | null };
  }
  export function requestForegroundPermissionsAsync(): Promise<{ status: string }>;
  export function getCurrentPositionAsync(options?: {
    accuracy?: Accuracy;
  }): Promise<LocationObject>;
}
