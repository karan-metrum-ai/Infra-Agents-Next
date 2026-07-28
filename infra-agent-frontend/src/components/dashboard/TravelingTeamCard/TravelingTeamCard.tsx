"use client";

/**
 * TravelingTeamCard Component
 *
 * Renders a one-shot visual replica of the *currently active agent's
 * card* on the right (teams panel) and animates it flying along a gentle
 * arc into the server rack on the left. There is no persistent trace —
 * the card itself is the entire visual link between the two panels.
 *
 * The replica reuses the same visual shape as `AgentNode` (avatar frame,
 * card body, header, chips) so the user sees the *exact same* card
 * lifting off and being delivered into the rack. We render a static
 * replica rather than `AgentNode` itself because `AgentNode` mounts
 * ReactFlow `<Handle>` elements that require a `<ReactFlowProvider>`
 * context, which we don't want to spin up just for the flight.
 *
 * Visual story:
 *   1. The team composition on the right "compresses" into a single card.
 *   2. That card travels along a gentle arc from right -> left.
 *   3. It enters the rack (scales down + blurs + fades inside the rack)
 *      and the rack card materializes immediately after to receive it.
 *
 * The animation is one-shot per `trigger` change. While idle the
 * component renders nothing, so it has zero runtime cost when no agent
 * is active.
 *
 * NOTE: the classes this component draws its card "chrome" from
 * (nodeWrapper, avatarFrame, mainCard, card, header, chipsRow,
 * toolsChip, capabilitiesList, etc.) are copied locally into
 * `TravelingTeamCard.module.css` rather than imported from a shared
 * `AgentNode.module.css`, because the Workflow Designer's `AgentNode`
 * hasn't been ported to this app yet (lands in a later phase). Once it
 * exists, consider extracting the shared "agent card" chrome into a
 * common stylesheet both components import.
 */

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import Image from "next/image";
import { AGENT_NAME_TO_LABEL, resolveAgentAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import styles from "./TravelingTeamCard.module.css";
import type { ActiveAgentCardData, TravelingTeamCardProps } from "./TravelingTeamCard.types";

/**
 * Display-name remapping table. Mirrors the `LABEL_MAPPING` used by the
 * site team panel so the traveling card shows the *same* label the
 * source card shows.
 *
 * TODO: this duplicates a mapping table that also lives (or will live)
 * in `SiteTeamPanel`. Once `SiteTeamPanel`/`AgentNode` are ported, unify
 * both into a shared `src/lib/agentLabels.ts`.
 *
 * Keyed by the API's `display_name` field (e.g. "Operations Manager
 * Agent"), maps to the on-screen label / avatar key.
 */
const LABEL_MAPPING: Record<string, string> = {
  "Operations Manager Agent": "Operations Manager",
  "Level 1 Support Agent": "Level 1 Support",
  "Systems Admin Hardware Agent": "Hardware Operations",
  "Systems Admin OS Agent": "OS Operations",
  "WLAN Network Agent": "WLAN Network Specialist",
  "Vast.ai Agent": "NeoCloud Provisioning Agent",
  "MetrumAI Insights Agent": "MetrumAI Insights Agent",
  "Virtualization Agent": "Virtualization Agent",
  storage_agent: "storage_agent",
};

/**
 * Resolve the on-screen label given whatever string we have from the
 * upstream pipeline. Tries (in order):
 *   1. Display-name mapping (cluster team API "display_name").
 *   2. Snake-case mapping (activity endpoint "agent_name").
 *   3. Fallback to the input as-is.
 */
function resolveLabel(value: string): string {
  if (LABEL_MAPPING[value]) return LABEL_MAPPING[value];
  if (AGENT_NAME_TO_LABEL[value]) return AGENT_NAME_TO_LABEL[value];
  return value;
}

// Total flight time, in ms. Matches the `travelArc` keyframes in the
// stylesheet. Long enough to read as a journey but not sluggish.
const FLIGHT_DURATION_MS = 1700;

export function TravelingTeamCard({ trigger, agentData, status }: TravelingTeamCardProps) {
  // We render the card with a `playKey` that bumps each time `trigger`
  // changes — that re-mounts the element so the CSS animation re-runs
  // from the beginning. After the flight completes we unmount the card.
  const [playKey, setPlayKey] = useState<number | null>(null);

  useEffect(() => {
    if (trigger === 0 || !agentData) return;
    setPlayKey(trigger);
    const timer = window.setTimeout(() => {
      setPlayKey(null);
    }, FLIGHT_DURATION_MS + 200);
    return () => window.clearTimeout(timer);
  }, [trigger, agentData]);

  if (playKey === null || !agentData) return null;

  return <TravelingTeamCardFlight key={playKey} agentData={agentData} status={status} />;
}

/** Split out so the `key`-driven remount only affects the flight subtree. */
function TravelingTeamCardFlight({
  agentData,
  status,
}: {
  agentData: ActiveAgentCardData;
  status: TravelingTeamCardProps["status"];
}) {
  const isProcessing = status === "processing";
  const isWaiting = status === "waiting_approval";
  const accentClass = isProcessing
    ? styles.accentProcessing
    : isWaiting
      ? styles.accentWaiting
      : styles.accentNeutral;

  // Resolve a usable label and avatar even if the cluster team config
  // hasn't loaded yet (the activity endpoint can fire first).
  const mappedLabel = resolveLabel(agentData.displayName) || resolveLabel(agentData.agentName);
  const avatarSrc = resolveAgentAvatar(mappedLabel) || resolveAgentAvatar(agentData.agentName);
  const toolsCount = agentData.toolsCount;

  // Cap visible items so the card doesn't grow unbounded for agents
  // with very long tool / capability lists. Matches the static team
  // card's behaviour (which slices capabilities to 4).
  const visibleCapabilities = agentData.capabilities.slice(0, 4);
  const visibleTools = agentData.tools.slice(0, 6);
  const extraTools = Math.max(0, agentData.tools.length - visibleTools.length);

  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={cn(styles.flightWrapper, accentClass)}>
        {/* Inner scale wrapper sizes the full-size agent card
            down so it fits comfortably in the flight space.
            The flightWrapper itself owns the arc animation. */}
        <div className={styles.scaleWrapper}>
          {/* Replica of AgentNode's structure, using the same class
              shapes so the visual is identical. */}
          <div className={styles.nodeWrapper}>
            {/* Oversized avatar */}
            <div className={styles.avatarPosition}>
              <div className={styles.avatarFrame}>
                <Image
                  src={avatarSrc}
                  alt={mappedLabel}
                  width={168}
                  height={168}
                  className={styles.avatarImg}
                  draggable={false}
                  decoding="async"
                />
              </div>
            </div>

            {/* Card body — same shape as the live team card. */}
            <div
              className={cn(styles.mainCard, styles.card, styles.borderDefault, styles.cardChrome)}
            >
              <div className={styles.header}>
                <div className={styles.headerInfo}>
                  <div className={styles.agentName}>{mappedLabel}</div>
                  {agentData.description && (
                    <div className={styles.agentTagline}>{agentData.description}</div>
                  )}
                  <div className={styles.chipsRow}>
                    <div className={styles.toolsChip}>
                      <Zap size={12} aria-hidden="true" />
                      <span>{toolsCount}</span>
                      <span>tool{toolsCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capabilities / skill set — same visual shape (dot +
                  label) as the static card. */}
              {visibleCapabilities.length > 0 && (
                <>
                  <div className={styles.rule} />
                  <div className={styles.capabilitiesList}>
                    {visibleCapabilities.map((cap, i) => (
                      <div key={`cap-${i}`} className={styles.capabilityItem}>
                        <span className={styles.capabilityDot} />
                        <span className={styles.capabilityText}>{cap}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tool list — small chip-row beneath the capabilities so
                  the user can read the actual tools the agent will use. */}
              {visibleTools.length > 0 && (
                <div className={styles.toolsList}>
                  {visibleTools.map((tool, i) => (
                    <span key={`tool-${i}`} className={styles.toolChip}>
                      {tool}
                    </span>
                  ))}
                  {extraTools > 0 && <span className={styles.toolMore}>+{extraTools}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
