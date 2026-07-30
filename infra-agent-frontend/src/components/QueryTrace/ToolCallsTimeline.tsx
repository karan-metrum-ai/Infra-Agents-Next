import type { ParsedToolCall } from "./traceDataParser";
import styles from "./ToolCallsTimeline.module.css";

interface ToolCallsTimelineProps {
  toolCalls: ParsedToolCall[];
}

/**
 * Displays tool calls as a horizontal timeline.
 */
function ToolCallsTimeline({ toolCalls }: ToolCallsTimelineProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={styles.toolCallsSection}>
      <div className={styles.toolCallsLabel}>Tools Used</div>
      <div className={styles.toolCallsTimeline}>
        {toolCalls.map((tool, index) => (
          <div key={`${tool.tool_name}-${index}`} className={styles.toolCallChip}>
            <span className={styles.toolCallName}>{tool.tool_name}</span>
            {tool.status === "completed" && <span className={styles.toolCallCheck}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ToolCallsTimeline;
