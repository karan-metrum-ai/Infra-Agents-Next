import { describe, expect, it } from "vitest";
import type { AgentGroup } from "./groupBlocksByAgent";
import { isParallelDeviceSubAgent, segmentTimelineGroups } from "./segmentTimelineGroups";
import type { TimelineSegment } from "./segmentTimelineGroups";
import type { SubAgentBlock } from "./blockStream/types";

function deviceSub(id: string, goal: string): SubAgentBlock {
  return {
    id,
    kind: "subagent",
    agent_name: id,
    content: goal,
    status: "streaming",
    locked: false,
    created_at: Date.now(),
  };
}

function subagentGroup(sub: SubAgentBlock): AgentGroup {
  return {
    id: `group-${sub.id}`,
    agentName: sub.agent_name,
    displayName: sub.agent_name,
    role: "subagent",
    blocks: [sub],
  };
}

function primaryGroup(name: string): AgentGroup {
  return {
    id: `group-${name}`,
    agentName: name,
    displayName: "Level 1 Support",
    role: "primary",
    blocks: [],
  };
}

describe("isParallelDeviceSubAgent", () => {
  it("accepts device-id sub-agents", () => {
    expect(
      isParallelDeviceSubAgent(
        deviceSub("dell-r740-rr-01", "Triage compute device dell-r740-rr-01"),
      ),
    ).toBe(true);
  });

  it("rejects primary and specialist agents", () => {
    expect(
      isParallelDeviceSubAgent({
        ...deviceSub("level1_support", "Triage fleet"),
        agent_name: "level1_support",
      }),
    ).toBe(false);
    expect(
      isParallelDeviceSubAgent({
        ...deviceSub("cooling", "Investigate CDU"),
        agent_name: "liquid_cooling_agent",
      }),
    ).toBe(false);
  });
});

describe("segmentTimelineGroups", () => {
  it("clusters consecutive device sub-agents into one segment", () => {
    const groups = [
      primaryGroup("level1_support"),
      subagentGroup(deviceSub("dev-a", "Triage compute device dev-a")),
      subagentGroup(deviceSub("dev-b", "Triage network device dev-b")),
      subagentGroup(deviceSub("dev-c", "Triage compute device dev-c")),
    ];

    const segments = segmentTimelineGroups(groups);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ kind: "agent", group: groups[0] });
    expect(segments[1]?.kind).toBe("parallel_cluster");
    const cluster = segments[1] as Extract<TimelineSegment, { kind: "parallel_cluster" }>;
    expect(cluster.agents.map((a) => a.id)).toEqual(["dev-a", "dev-b", "dev-c"]);
  });

  it("splits parallel runs around other agent groups", () => {
    const specialist = subagentGroup({
      ...deviceSub("lc", "Investigate"),
      agent_name: "liquid_cooling_agent",
    });
    const groups = [
      subagentGroup(deviceSub("a", "Triage device a")),
      specialist,
      subagentGroup(deviceSub("b", "Triage device b")),
    ];

    const segments = segmentTimelineGroups(groups);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.kind).toBe("parallel_cluster");
    expect(segments[1]).toEqual({ kind: "agent", group: specialist });
    expect(segments[2]?.kind).toBe("parallel_cluster");
  });
});
