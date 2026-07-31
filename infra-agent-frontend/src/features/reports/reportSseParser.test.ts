import { describe, expect, it } from "vitest";
import { parseSseBuffer } from "./reportSseParser";

describe("parseSseBuffer", () => {
  it("parses a single SSE event block", () => {
    const frame = 'event: step_started\ndata: {"step":1,"total":5,"label":"Collecting data"}\n\n';
    const { events, remainder } = parseSseBuffer(frame);
    expect(remainder).toBe("");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("step_started");
    expect(events[0].data).toMatchObject({
      step: 1,
      total: 5,
      label: "Collecting data",
    });
  });

  it("parses multiple events and preserves a partial trailing block", () => {
    const frame =
      "event: step_started\n" +
      'data: {"step":1,"total":5,"label":"A"}\n\n' +
      "event: done\n" +
      'data: {"report_id":"r1","pdf_url":"/x.pdf"}\n\n' +
      "event: step_completed\n" +
      'data: {"step":';
    const { events, remainder } = parseSseBuffer(frame);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("step_started");
    expect(events[1].type).toBe("done");
    expect(remainder).toContain("event: step_completed");
  });

  it("ignores malformed data lines", () => {
    const frame = "event: error\ndata: not-json\n\n";
    const { events } = parseSseBuffer(frame);
    expect(events).toHaveLength(0);
  });
});
