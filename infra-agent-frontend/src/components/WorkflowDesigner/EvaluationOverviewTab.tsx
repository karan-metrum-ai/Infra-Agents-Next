"use client";

import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  formatDimensionLabel,
  formatDuration,
  formatStatusDescription,
  formatStatusTitle,
  getScoreColor,
} from "./evaluationModalFormatters";
import styles from "./EvaluationModal.module.css";
import type { CurrentPhaseStatus, StatusUpdate, TrajectoryData } from "./EvaluationModal.types";

const SCORE_DIMENSIONS = [
  "task_completion",
  "agent_coordination",
  "resource_efficiency",
  "information_quality",
] as const;

interface EvaluationOverviewTabProps {
  trajectoryData: TrajectoryData | null;
  error: string | null;
  isLoading: boolean;
  statusUpdates: StatusUpdate[];
  currentPhaseStatus: CurrentPhaseStatus;
}

function uniqueByStatus(statusUpdates: StatusUpdate[]): StatusUpdate[] {
  return statusUpdates.reduce<StatusUpdate[]>((acc, current, index) => {
    if (index === 0 || current.status !== statusUpdates[index - 1]?.status) acc.push(current);
    return acc;
  }, []);
}

/** "Intelligence Overview" tab: key metrics, score-dimension breakdown, and
 * (while a live evaluation is running) a status timeline built from the SSE
 * `statusUpdates`. */
export function EvaluationOverviewTab({
  trajectoryData,
  error,
  isLoading,
  statusUpdates,
  currentPhaseStatus,
}: EvaluationOverviewTabProps) {
  const score = trajectoryData?.metadata?.overall_task_score;
  const statusDistribution = trajectoryData?.metadata?.status_distribution;
  const successRate = statusDistribution
    ? Math.round(
        (statusDistribution.success /
          (statusDistribution.success + statusDistribution.error || 1)) *
          100,
      )
    : 0;
  const recentUpdates = uniqueByStatus(statusUpdates).slice(-5).toReversed();

  return (
    <div className={styles.overviewTab}>
      {trajectoryData && (
        <div className={styles.keyMetricsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Intelligence Performance</h2>
            <span className={styles.sectionSubtitle}>Core metrics</span>
          </div>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <Target size={40} className={styles.metricIconPrimary} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span
                  className={styles.metricValueLarge}
                  style={{ color: getScoreColor(score?.completion_score ?? 0) }}
                >
                  {score?.completion_score ?? 0}
                  <span className={styles.metricUnit}>/10</span>
                </span>
                <span className={styles.metricLabel}>Overall Score</span>
              </div>
            </div>
            <div className={styles.metricCard}>
              <Clock size={40} className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>
                  {formatDuration(trajectoryData.metadata.total_duration_seconds || 0)}
                </span>
                <span className={styles.metricLabel}>Execution Time</span>
              </div>
            </div>
            <div className={styles.metricCard}>
              <Users size={40} className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>
                  {trajectoryData.metadata.agents_involved?.length ?? 0}
                </span>
                <span className={styles.metricLabel}>Active Agents</span>
              </div>
            </div>
            <div className={styles.metricCard}>
              <TrendingUp size={40} className={styles.metricIconSuccess} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{successRate}%</span>
                <span className={styles.metricLabel}>Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {trajectoryData && score && (
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Performance Analysis</h2>
          </div>
          <div className={styles.analysisGrid}>
            <div className={styles.scoreBreakdownCard}>
              <h3 className={styles.cardTitle}>Intelligence Dimensions</h3>
              <div className={styles.scoreMetrics}>
                {SCORE_DIMENSIONS.map((dimension) => {
                  const value = score[dimension] ?? 0;
                  return (
                    <div key={dimension} className={styles.scoreMetricItem}>
                      <span className={styles.scoreMetricLabel}>
                        {formatDimensionLabel(dimension)}
                      </span>
                      <div className={styles.scoreBarContainer}>
                        <div className={styles.scoreBar}>
                          <div
                            className={styles.scoreBarFill}
                            style={{
                              width: `${value * 10}%`,
                              backgroundColor: getScoreColor(value),
                            }}
                          />
                        </div>
                        <span className={styles.scoreValue}>{value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {score.reasoning && (
              <div className={styles.insightsCard}>
                <h3 className={styles.cardTitle}>AI Insights</h3>
                <div className={styles.reasoningContent}>
                  <p className={styles.reasoningText}>{score.reasoning}</p>
                </div>
                {score.key_strengths?.length > 0 && (
                  <div className={styles.strengthsSection}>
                    <h4 className={styles.subsectionTitle}>Key Strengths</h4>
                    <ul className={styles.bulletList}>
                      {score.key_strengths.map((strength) => (
                        <li key={strength} className={styles.bulletItemSuccess}>
                          <CheckCircle size={14} className={styles.bulletIcon} aria-hidden="true" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {score.areas_for_improvement?.length > 0 && (
                  <div className={styles.improvementSection}>
                    <h4 className={styles.subsectionTitle}>Areas for Enhancement</h4>
                    <ul className={styles.bulletList}>
                      {score.areas_for_improvement.map((area) => (
                        <li key={area} className={styles.bulletItemWarning}>
                          <ArrowRight size={14} className={styles.bulletIcon} aria-hidden="true" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorSection}>
          <div className={styles.errorCard} role="alert">
            <AlertCircle size={24} className={styles.errorIconLarge} aria-hidden="true" />
            <div className={styles.errorContent}>
              <h3 className={styles.errorTitle}>Evaluation Error</h3>
              <p className={styles.errorMessage}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && !trajectoryData && (
        <div className={styles.loadingSection}>
          <div className={styles.loadingCard}>
            <div className={styles.loadingAnimation}>
              <Brain size={40} className={styles.loadingBrain} aria-hidden="true" />
              <div className={styles.loadingPulse} aria-hidden="true" />
            </div>
            <div className={styles.loadingContent}>
              <h3 className={styles.loadingTitle}>{currentPhaseStatus.title}</h3>
              <p className={styles.loadingDescription}>{currentPhaseStatus.description}</p>
              {statusUpdates.length === 0 ? (
                <div className={styles.loadingSkeletons} aria-hidden="true">
                  <div className={styles.skeletonCard} />
                  <div className={styles.skeletonCard} />
                  <div className={styles.skeletonCard} />
                  <div className={styles.skeletonCard} />
                </div>
              ) : (
                <div className={styles.statusTimeline}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelineTitle}>Status Timeline</span>
                    <span className={styles.timelineCount}>{statusUpdates.length} events</span>
                  </div>
                  <div className={styles.timelineList}>
                    {recentUpdates.map((update, index) => {
                      const isLatest = index === 0;
                      return (
                        <div
                          key={`${update.status}-${recentUpdates.length - index}`}
                          className={`${styles.timelineItem} ${isLatest ? styles.active : ""}`}
                        >
                          <div className={styles.timelineIndicator}>
                            {isLatest ? (
                              <Loader2
                                size={16}
                                className={styles.timelineIconSpinning}
                                aria-hidden="true"
                              />
                            ) : update.status.includes("complete") ||
                              update.status.includes("successful") ? (
                              <CheckCircle
                                size={16}
                                className={styles.timelineIconSuccess}
                                aria-hidden="true"
                              />
                            ) : (
                              <div className={styles.timelineDot} aria-hidden="true" />
                            )}
                          </div>
                          <div className={styles.timelineContent}>
                            <span className={styles.timelineItemTitle}>
                              {formatStatusTitle(update.status)}
                            </span>
                            <span className={styles.timelineItemDescription}>
                              {formatStatusDescription(update)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EvaluationOverviewTab;
