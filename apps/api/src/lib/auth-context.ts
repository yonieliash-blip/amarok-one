import type { AccessTokenPayload } from "./jwt.js";

export interface AuthContext {
  user: AccessTokenPayload;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export function getAuth(context: { get(key: "auth"): AuthContext }): AuthContext {
  return context.get("auth");
}
