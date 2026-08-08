import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AuthSession, AuthUser } from "@amarok-one/types";
import {
  clearStoredSession,
  persistActiveRoleId,
  persistRefreshToken,
  readStoredSession,
  registerPermissionsStaleHandler,
} from "../lib/api-client";
import {
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
  switchRoleRequest,
} from "../lib/auth-api";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

const REFRESH_BUFFER_MS = 60_000;

function applySession(
  session: AuthSession,
  setAccessToken: (token: string) => void,
  setUser: (user: AuthUser) => void,
): void {
  setAccessToken(session.accessToken);
  setUser(session.user);
  persistActiveRoleId(session.user.role.id);
  if (session.refreshToken) {
    persistRefreshToken(session.refreshToken, session.user.role.id);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const stored = readStoredSession();
    if (!stored) {
      setAccessToken(null);
      accessTokenRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    try {
      const session = await refreshSessionRequest(
        stored.refreshToken,
        userRef.current?.organization.id ?? stored.activeRoleId,
      );
      applySession(
        session,
        (token) => {
          setAccessToken(token);
          accessTokenRef.current = token;
        },
        setUser,
      );
      setStatus("authenticated");
      return session.accessToken;
    } catch {
      clearStoredSession();
      setAccessToken(null);
      accessTokenRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (expiresInSeconds: number) => {
      clearRefreshTimer();
      const delay = Math.max(expiresInSeconds * 1000 - REFRESH_BUFFER_MS, 5_000);
      refreshTimerRef.current = window.setTimeout(() => {
        void refreshSession();
      }, delay);
    },
    [clearRefreshTimer, refreshSession],
  );

  const login = useCallback(
    async (credentials: Parameters<AuthContextValue["login"]>[0]) => {
      const session = await loginRequest(credentials);
      applySession(
        session,
        (token) => {
          setAccessToken(token);
          accessTokenRef.current = token;
        },
        setUser,
      );
      setStatus("authenticated");
      scheduleRefresh(session.expiresIn);
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();
    const token = accessTokenRef.current;
    const stored = readStoredSession();

    if (token) {
      try {
        await logoutRequest(token, stored?.refreshToken);
      } catch {
        // Clear local session even if remote logout fails.
      }
    }

    clearStoredSession();
    setAccessToken(null);
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
  }, [clearRefreshTimer]);

  const switchRole = useCallback(
    async (roleId: string): Promise<AuthUser> => {
      const token = accessTokenRef.current;
      if (!token) {
        throw new Error("Not authenticated");
      }

      const session = await switchRoleRequest(token, roleId);
      setAccessToken(session.accessToken);
      accessTokenRef.current = session.accessToken;
      setUser(session.user);
      persistActiveRoleId(session.user.role.id);
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [scheduleRefresh],
  );

  useEffect(() => {
    registerPermissionsStaleHandler(() => {
      void refreshSession();
    });
    return () => registerPermissionsStaleHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      const stored = readStoredSession();

      if (!stored) {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
        return;
      }

      try {
        const session = await refreshSessionRequest(
          stored.refreshToken,
          userRef.current?.organization.id ?? stored.activeRoleId,
        );
        if (cancelled) {
          return;
        }

        applySession(
          session,
          (token) => {
            setAccessToken(token);
            accessTokenRef.current = token;
          },
          setUser,
        );
        setStatus("authenticated");
        scheduleRefresh(session.expiresIn);
      } catch {
        if (!cancelled) {
          clearStoredSession();
          setStatus("unauthenticated");
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, scheduleRefresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      logout,
      refreshSession,
      switchRole,
    }),
    [status, user, accessToken, login, logout, refreshSession, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
