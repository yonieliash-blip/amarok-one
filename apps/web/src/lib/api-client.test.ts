import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredSession,
  persistActiveRoleId,
  persistRefreshToken,
  readStoredSession,
} from "./api-client";

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("session storage", () => {
  beforeEach(() => {
    globalThis.sessionStorage = createSessionStorageMock();
  });

  afterEach(() => {
    clearStoredSession();
  });

  it("persists refresh token and active role across reads", () => {
    persistRefreshToken("refresh-token-value", "role-123");
    const session = readStoredSession();

    expect(session?.refreshToken).toBe("refresh-token-value");
    expect(session?.activeRoleId).toBe("role-123");
  });

  it("updates active role without requiring a new refresh token", () => {
    persistRefreshToken("refresh-token-value", "role-123");
    persistActiveRoleId("role-456");

    expect(readStoredSession()?.activeRoleId).toBe("role-456");
  });

  it("clears active role on logout", () => {
    persistRefreshToken("refresh-token-value", "role-123");
    clearStoredSession();

    expect(readStoredSession()).toBeNull();
  });
});
