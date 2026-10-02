import * as SecureStore from "expo-secure-store";
import type { AuthSession, AuthUser } from "@amarok-one/types";

const REFRESH_TOKEN_KEY = "amarok_mobile_refresh_token";
const SHIFT_TRACKING_SESSION_KEY = "amarok_mobile_shift_tracking_session";

export interface ShiftTrackingSession {
  organizationId: string;
  workDayStartedAt: string;
  accessToken: string;
}

export async function persistSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
}

export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearSessionStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await clearShiftTrackingSession();
}

export async function persistShiftTrackingSession(session: ShiftTrackingSession): Promise<void> {
  await SecureStore.setItemAsync(SHIFT_TRACKING_SESSION_KEY, JSON.stringify(session));
}

export async function readShiftTrackingSession(): Promise<ShiftTrackingSession | null> {
  const stored = await SecureStore.getItemAsync(SHIFT_TRACKING_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ShiftTrackingSession;
  } catch {
    await clearShiftTrackingSession();
    return null;
  }
}

export async function clearShiftTrackingSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SHIFT_TRACKING_SESSION_KEY);
}

export interface AuthState {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
