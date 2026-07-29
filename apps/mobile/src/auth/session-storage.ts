import * as SecureStore from "expo-secure-store";
import type { AuthSession, AuthUser } from "@amarok-one/types";

const REFRESH_TOKEN_KEY = "amarok_mobile_refresh_token";

export async function persistSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
}

export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearSessionStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export interface AuthState {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
