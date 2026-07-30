import { describe, expect, it } from "vitest";
import {
  buildDeviceTriageMap,
  getSubAgentTileLabel,
  isSubAgentSummaryContent,
  lookupDeviceTriage,
  parseSubAgentSummary,
} from "./subAgentTileUtils";
import type { SubAgentBlock } from "../blockStream/types";

describe("subAgentTileUtils", () => {
  it("detects and parses completion summary content", () => {
    const content = "status=warning, findings=11, tools=0, duration=20729ms";
    expect(isSubAgentSummaryContent(content)).toBe(true);
    expect(parseSubAgentSummary(content)).toEqual({
      status: "warning",
      findings: "11",
      tools: "0",
      duration: "20729ms",
    });
  });

  it("uses triage goal text as the parallel tile label", () => {
    const block: SubAgentBlock = {
      id: "sub-1",
      kind: "subagent",
      agent_name: "dell-r740-rr-01",
      content: "Triage compute device dell-r740-rr-01",
      status: "streaming",
      locked: false,
      created_at: 1,
    };
    expect(getSubAgentTileLabel(block)).toBe("Triage compute device dell-r740-rr-01");
  });

  it("builds a device triage lookup from flow sessions", () => {
    const map = buildDeviceTriageMap({
      sessions: [
        {
          turns: [
            {
              structured_data: JSON.stringify({
                device_triage: [
                  {
                    device_id: "dell-r740-rr-01",
                    status: "warning",
                    findings: ["CPU high"],
                    tool_calls: [{ tool_name: "get_metrics", status: "ok" }],
                  },
                ],
              }),
            },
          ],
        },
      ],
    });

    const row = lookupDeviceTriage(map, "dell-r740-rr-01");
    expect(row?.status).toBe("warning");
    expect(row?.findings).toEqual(["CPU high"]);
  });
});
