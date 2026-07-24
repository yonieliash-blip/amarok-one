import { createContext } from "react";
import type { AuthUser } from "@amarok-one/types";
import type { LoginCredentials } from "../lib/auth-api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  switchRole: (roleId: string) => Promise<AuthUser>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
