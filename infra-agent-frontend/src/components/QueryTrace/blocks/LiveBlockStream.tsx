"use client";

import { useMemo, useRef } from "react";
import BlockSkeleton from "./BlockSkeleton";
import AgentBlockGroup from "./AgentBlockGroup";
import ParallelAgentCluster from "./ParallelAgentCluster";
import PinnedTodoBar from "./PinnedTodoBar";
import ProgressSummary from "./ProgressSummary";
import { groupBlocksByAgent } from "../groupBlocksByAgent";
import { selectTopLevelBlocks } from "../queryTraceV2Gating";
import { segmentTimelineGroups } from "../segmentTimelineGroups";
import { parsedAgentToGroup } from "./v1AgentAdapter";
import { TraceLivenessContext } from "./traceLivenessContext";
import { useAutoScrollTail } from "./useAutoScrollTail";
import { useScrollFade } from "@/hooks/useScrollFade";
import type { ParsedAgentTrace } from "../traceDataParser";
import {
  useActiveBlockId,
  useBlockOrder,
  useBlockStream,
  useTodoList,
} from "../blockStream/useBlockStream";
import agentStyles from "./agentSection.module.css";

/** Stable empty-array reference so the `supplementalAgents` default prop never re-creates on render. */
const EMPTY_SUPPLEMENTAL_AGENTS: ParsedAgentTrace[] = [];

interface LiveBlockStreamProps {
  /** Block ID to exclude from rendering (used to hoist the final
   *  response into a dedicated card outside the stream). */
  excludeBlockId?: string | null;
  /** True when the flow is actively running. When false (replay /
   *  history), all accordions default to open. */
  isLive?: boolean;
  /** True while an approved plan is executing assigned tasks. */
  planExecuting?: boolean;
  /** v1 trace rows missing from the block store — rendered in v2 style. */
  supplementalAgents?: ParsedAgentTrace[];
}

/**
 * Renders the ordered list of blocks from the external block store,
 * grouped by agent. Orchestrator, Level 1, and named specialists
 * render as full timeline sections. Device triage sub-agents spawned
 * by ``triage_devices_parallel`` collapse into a compact parallel
 * grid (``ParallelAgentCluster``).
 */
function LiveBlockStream({
  excludeBlockId = null,
  isLive = true,
  planExecuting = false,
  supplementalAgents = EMPTY_SUPPLEMENTAL_AGENTS,
}: LiveBlockStreamProps) {
  const order = useBlockOrder();
  const activeId = useActiveBlockId();
  const snapshot = useBlockStream();
  const todoList = useTodoList();
  const containerRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const scrollFade = useScrollFade(containerRef, { fadeSize: 24 });
  const { handleScroll } = useAutoScrollTail({
    containerRef,
    tailRef,
    correlationId: snapshot.correlation_id,
    isLive,
    orderLength: order.length,
    activeId,
  });

  // Hide child blocks whose parent exists in the store. When every
  // block is nested, fall back to flat rendering so the stream is
  // not empty (orphans from SSE reconnect still stay top-level).
  const allBlocks = order
    .map((id) => snapshot.byId[id])
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .filter((b) => b.id !== excludeBlockId);
  const blocks = selectTopLevelBlocks(allBlocks, snapshot.byId);

  const agentGroups = useMemo(() => groupBlocksByAgent(blocks), [blocks]);
  const supplementalGroups = useMemo(
    () => supplementalAgents.map(parsedAgentToGroup),
    [supplementalAgents],
  );
  const timelineGroups = useMemo(
    () => [...agentGroups, ...supplementalGroups],
    [agentGroups, supplementalGroups],
  );
  const timelineSegments = useMemo(() => segmentTimelineGroups(timelineGroups), [timelineGroups]);

  const hasOrchestratorGroup = agentGroups.some((g) => g.role === "orchestrator");
  const showFloatingTodos = todoList.length > 0 && !hasOrchestratorGroup;
  const showProgressSummary = todoList.length > 0 && hasOrchestratorGroup;

  const showInitialSkeleton =
    blocks.length === 0 && (snapshot.phase === "planning" || snapshot.phase === "executing");

  const activeUnseen = activeId && !snapshot.byId[activeId] ? activeId : null;

  return (
    <TraceLivenessContext.Provider value={isLive}>
      <div
        className={agentStyles.traceView}
        ref={containerRef}
        onScroll={handleScroll}
        style={scrollFade}
      >
        {showProgressSummary && <ProgressSummary todoList={todoList} agentGroups={agentGroups} />}
        {showFloatingTodos && <PinnedTodoBar items={todoList} />}
        <div className={agentStyles.traceTimeline}>
          {timelineSegments.map((segment, idx) => {
            const isRecent = !isLive || idx >= timelineSegments.length - 3;
            if (segment.kind === "parallel_cluster") {
              return (
                <div
                  key={`parallel-${segment.agents[0]?.id ?? idx}`}
                  className={agentStyles.agentNode}
                  data-role="specialist"
                >
                  <div className={agentStyles.agentNodeDot} />
                  <div className={agentStyles.agentNodeContent} data-depth={0}>
                    <ParallelAgentCluster agents={segment.agents} />
                  </div>
                </div>
              );
            }
            return (
              <AgentBlockGroup
                key={segment.group.id}
                group={segment.group}
                depth={0}
                isRecent={isRecent}
                pinnedTodos={todoList}
                planExecuting={planExecuting && segment.group.role === "orchestrator"}
              />
            );
          })}
        </div>
        {activeUnseen && <BlockSkeleton kind="text" />}
        {showInitialSkeleton && (
          <>
            <BlockSkeleton kind="todo" />
            <BlockSkeleton kind="text" />
          </>
        )}
        <div ref={tailRef} aria-hidden="true" />
      </div>
    </TraceLivenessContext.Provider>
  );
}

export default LiveBlockStream;
