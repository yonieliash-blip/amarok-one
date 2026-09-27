import { AppError } from "../../lib/errors.js";

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const CLIENT_PAGE_SIZE = 100;

export interface MorningClientRecord {
  id: string;
  name: string;
  active?: boolean;
  taxId?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  mobile?: string;
  emails?: string[];
  contactPerson?: string;
}

interface AccessTokenResponse {
  accessToken: string;
  expiresAt: number;
}

interface SearchClientsResponse {
  total: number;
  pages: number;
  items: MorningClientRecord[];
}

export interface MorningClient {
  listClients(): Promise<MorningClientRecord[]>;
}

export interface MorningClientConfig {
  clientId?: string;
  clientSecret?: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

export function createMorningClient(
  config: MorningClientConfig,
  fetchImpl: typeof fetch = fetch,
): MorningClient {
  let cachedToken: { value: string; expiresAtMs: number } | undefined;

  async function accessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
      return cachedToken.value;
    }

    if (!config.clientId || !config.clientSecret) {
      throw new AppError(
        "MORNING_INTEGRATION_NOT_CONFIGURED",
        "Morning customer sync is not configured for this environment",
        503,
      );
    }

    let response: Response;
    try {
      response = await fetchImpl(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
      });
    } catch {
      throw new AppError("MORNING_UNAVAILABLE", "Could not reach Morning", 502);
    }

    if (!response.ok) {
      throw new AppError(
        "MORNING_AUTH_FAILED",
        "Morning rejected the integration credentials",
        502,
      );
    }

    const payload = (await response.json()) as Partial<AccessTokenResponse>;
    if (typeof payload.accessToken !== "string" || typeof payload.expiresAt !== "number") {
      throw new AppError(
        "MORNING_INVALID_RESPONSE",
        "Morning returned an invalid access token",
        502,
      );
    }

    cachedToken = { value: payload.accessToken, expiresAtMs: payload.expiresAt * 1000 };
    return cachedToken.value;
  }

  async function getClientPage(page: number): Promise<SearchClientsResponse> {
    const token = await accessToken();
    let response: Response;
    try {
      response = await fetchImpl(`${config.apiBaseUrl}/clients/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page, pageSize: CLIENT_PAGE_SIZE }),
      });
    } catch {
      throw new AppError("MORNING_UNAVAILABLE", "Could not reach Morning", 502);
    }

    if (!response.ok) {
      throw new AppError("MORNING_REQUEST_FAILED", "Morning could not return customers", 502);
    }

    const payload = (await response.json()) as Partial<SearchClientsResponse>;
    if (
      !Number.isInteger(payload.total) ||
      !Number.isInteger(payload.pages) ||
      !Array.isArray(payload.items)
    ) {
      throw new AppError("MORNING_INVALID_RESPONSE", "Morning returned invalid customer data", 502);
    }

    return payload as SearchClientsResponse;
  }

  return {
    async listClients(): Promise<MorningClientRecord[]> {
      const firstPage = await getClientPage(1);
      const clients = [...firstPage.items];

      for (let page = 2; page <= firstPage.pages; page += 1) {
        const nextPage = await getClientPage(page);
        clients.push(...nextPage.items);
      }

      return clients;
    },
  };
}
