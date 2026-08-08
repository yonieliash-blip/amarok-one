import { describe, expect, it } from "vitest";
import {
  buildServiceCallsListUrl,
  parseServiceCallsListSearchParams,
} from "./service-calls-list-url";

describe("service-calls-list-url", () => {
  it("builds a filtered service calls list URL", () => {
    expect(
      buildServiceCallsListUrl({
        bucket: "in_progress",
        search: "SC-003",
        priority: "urgent",
        assigneeId: "tech-1",
      }),
    ).toBe("/service-calls?bucket=in_progress&search=SC-003&priority=urgent&assignee=tech-1");
  });

  it("parses dashboard drill-down search params", () => {
    const params = new URLSearchParams(
      "bucket=waiting_for_parts&search=telehandler&priority=high&assignee=unassigned",
    );
    expect(parseServiceCallsListSearchParams(params)).toEqual({
      bucket: "waiting_for_parts",
      search: "telehandler",
      priority: "high",
      assigneeId: "unassigned",
    });
  });

  it("ignores invalid bucket and priority values", () => {
    const params = new URLSearchParams("bucket=invalid&priority=unknown&search=test");
    expect(parseServiceCallsListSearchParams(params)).toEqual({
      search: "test",
    });
  });
});
