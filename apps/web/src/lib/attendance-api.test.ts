import { afterEach, describe, expect, it, vi } from "vitest";
import { endWorkDayRequest, getCurrentWorkDayRequest, startWorkDayRequest } from "./attendance-api";

const workDay = {
  id: "work-day-1",
  status: "ACTIVE" as const,
  startedAt: "2026-10-02T07:00:00.000Z",
  endedAt: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubApiResponse(data: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("attendance API", () => {
  it("loads the current employee work day", async () => {
    const fetchMock = stubApiResponse(workDay);

    await expect(getCurrentWorkDayRequest("org-1", "access-token")).resolves.toEqual(workDay);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/org-1/attendance/current"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });

  it("sends the selected location only with an explicit start or end action", async () => {
    const fetchMock = stubApiResponse(workDay);
    const location = { latitude: 32.0853, longitude: 34.7818, accuracy: 12 };

    await startWorkDayRequest("org-1", "access-token", location);
    await endWorkDayRequest("org-1", "access-token", null);

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/organizations/org-1/attendance/start");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ location }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/organizations/org-1/attendance/end");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ location: null }),
    });
  });
});
