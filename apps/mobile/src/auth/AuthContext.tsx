import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, AuthUser } from "@amarok-one/types";
import { isAssignedServiceCallsOnly } from "@amarok-one/permissions";
import { loginRequest, logoutRequest, refreshSessionRequest } from "../api/auth";
import { clearSessionStorage, persistSession, readRefreshToken } from "./session-storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string, organizationSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  isTechnician: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function permissionSlugs(user: AuthUser | null): string[] {
  return user?.permissions.map((permission) => permission.slug) ?? [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const storedRefresh = await readRefreshToken();
        if (cancelled) return;
        if (!storedRefresh) {
          setStatus("unauthenticated");
          return;
        }
        const session = await refreshSessionRequest(storedRefresh);
        if (cancelled) return;
        await persistSession(session);
        setUser(session.user);
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        await clearSessionStorage();
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        setStatus("unauthenticated");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, organizationSlug?: string) => {
    const session = await loginRequest({ email, password, organizationSlug });
    if (!isAssignedServiceCallsOnly(permissionSlugs(session.user))) {
      throw new Error("This app is for field technicians only.");
    }
    await persistSession(session);
    setUser(session.user);
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    if (accessToken) {
      try {
        await logoutRequest(accessToken, refreshToken ?? undefined);
      } catch {
        /* ignore */
      }
    }
    await clearSessionStorage();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setStatus("unauthenticated");
  }, [accessToken, refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      logout,
      isTechnician: isAssignedServiceCallsOnly(permissionSlugs(user)),
    }),
    [status, user, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export type { AuthSession };
