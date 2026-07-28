import Image from "next/image";
import { agentAvatarUrl } from "@/utils/agentAvatars";
import { cn } from "@/lib/utils";
import styles from "./BottomStatsRow.module.css";

interface AgentAvatarStackProps {
  members: Array<{ agent_name: string; display_name: string | null }>;
  isLive: boolean;
}

export function AgentAvatarStack({ members, isLive }: AgentAvatarStackProps) {
  const visible = members.slice(0, isLive ? 3 : 2);
  if (visible.length === 0) return null;

  return (
    <div className={styles.avatarStack} aria-label="Team agents">
      {visible.map((member, i) => (
        <div
          key={`${member.agent_name}-${i}`}
          className={styles.avatarStackItemWrap}
          style={{ zIndex: visible.length - i }}
        >
          <div
            className={cn(
              styles.avatarStackItem,
              isLive && i === 0 ? styles.avatarStackItemActive : styles.avatarStackItemIdle,
            )}
          >
            <Image
              src={agentAvatarUrl(member.agent_name)}
              alt=""
              width={20}
              height={20}
              className={styles.avatar}
              unoptimized
            />
          </div>
          <span className={styles.avatarTooltip} role="tooltip">
            {member.display_name || member.agent_name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default AgentAvatarStack;
