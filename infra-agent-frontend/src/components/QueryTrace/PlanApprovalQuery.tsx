"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatEscalationQuery } from "@/utils/formatEscalationQuery";
import MarkdownRenderer from "./MarkdownRenderer";
import { usePlanQueryOverflow } from "./usePlanQueryOverflow";
import styles from "./PlanApprovalCard.module.css";

interface PlanApprovalQueryProps {
  query: string;
}

/**
 * Collapsible "Query" row inside `PlanApprovalCard`.
 *
 * Split out as its own component so the parent renders it with
 * `key={query}` — the original Vite version reset its `queryExpanded`
 * local state via a `useEffect(() => setQueryExpanded(false), [rawQuery])`;
 * a `key`-based remount (`.cursor/skills/sans-effect` Pattern 5) gives
 * the same "fresh collapsed state per query" behavior without an effect.
 */
function PlanApprovalQuery({ query }: PlanApprovalQueryProps) {
  const [queryExpanded, setQueryExpanded] = useState(false);
  const formattedQuery = useMemo(() => formatEscalationQuery(query), [query]);
  const { ref: queryBodyRef, overflows: queryOverflows } = usePlanQueryOverflow(
    formattedQuery,
    queryExpanded,
  );

  return (
    <div className={styles.queryRow}>
      <span className={styles.queryLabel}>Query</span>
      <div
        ref={queryBodyRef}
        className={queryExpanded ? styles.queryTextExpanded : styles.queryTextClamped}
      >
        <MarkdownRenderer content={formattedQuery} context="query_header" />
      </div>
      {(queryOverflows || queryExpanded) && (
        <button
          type="button"
          className={styles.queryToggleBtn}
          onClick={() => setQueryExpanded((prev) => !prev)}
          aria-expanded={queryExpanded}
        >
          <span>{queryExpanded ? "Show less" : "Show more"}</span>
          {queryExpanded ? (
            <ChevronUp size={12} strokeWidth={2} />
          ) : (
            <ChevronDown size={12} strokeWidth={2} />
          )}
        </button>
      )}
    </div>
  );
}

export default PlanApprovalQuery;
