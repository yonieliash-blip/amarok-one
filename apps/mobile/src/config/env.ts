const DEFAULT_API_URL = "http://localhost:3000";

export function resolveApiUrl(value: string | undefined): {
  apiUrl: string;
  isConfigured: boolean;
} {
  const configuredUrl = value?.trim();
  return {
    apiUrl: (configuredUrl || DEFAULT_API_URL).replace(/\/+$/, ""),
    isConfigured: Boolean(configuredUrl),
  };
}

const api = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);

export const env = {
  apiUrl: api.apiUrl,
  isApiConfigured: api.isConfigured,
} as const;
