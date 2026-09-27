import { describe, expect, it, vi } from "vitest";
import { createMorningClient } from "./morning-client.js";

describe("Morning client", () => {
  it("uses one token for every page of a customer search", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "token", expiresAt: 4_102_444_800 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ total: 101, pages: 2, items: [{ id: "one", name: "One" }] }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ total: 101, pages: 2, items: [{ id: "two", name: "Two" }] }),
          {
            status: 200,
          },
        ),
      );

    const client = createMorningClient(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        tokenUrl: "https://auth.example.test/token",
        apiBaseUrl: "https://api.example.test/v1",
      },
      fetchMock,
    );
    await expect(client.listClients()).resolves.toEqual([
      { id: "one", name: "One" },
      { id: "two", name: "Two" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&client_id=client-id&client_secret=client-secret",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ page: 1, pageSize: 100 }),
      headers: { Authorization: "Bearer token" },
    });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({ page: 2, pageSize: 100 }),
      headers: { Authorization: "Bearer token" },
    });
  });
});
