const DEFAULT_API_URL = "http://localhost:3000";

export const env = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, ""),
} as const;
