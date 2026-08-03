"use client";

import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Play,
  Plus,
  Server,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PREDEFINED_PROMPTS, TEAMS_PER_PAGE } from "./evaluationModalConstants";
import styles from "./EvaluationModal.module.css";
import type { TeamOption } from "./EvaluationModal.types";

interface EvaluationTeamSelectionProps {
  availableTeams: TeamOption[];
  teamsLoading: boolean;
  teamsHaveError: boolean;
  onRetryTeams: () => void;
  teamPage: number;
  onTeamPageChange: (page: number) => void;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  selectedPromptId: string | null;
  onSelectPrompt: (promptId: string | null) => void;
  additionalInstructions: string;
  onAdditionalInstructionsChange: (value: string) => void;
  finalPrompt: string;
  hasValidPrompt: boolean;
  onStartEvaluation: () => void;
  isStarting: boolean;
  streamError: string | null;
}

/** Team + prompt selection screen shown before a live evaluation starts.
 * Pure presentation — all selection/pagination state lives in
 * `EvaluationModal`, this component only renders it and forwards events. */
export function EvaluationTeamSelection({
  availableTeams,
  teamsLoading,
  teamsHaveError,
  onRetryTeams,
  teamPage,
  onTeamPageChange,
  selectedTeamId,
  onSelectTeam,
  selectedPromptId,
  onSelectPrompt,
  additionalInstructions,
  onAdditionalInstructionsChange,
  finalPrompt,
  hasValidPrompt,
  onStartEvaluation,
  isStarting,
  streamError,
}: EvaluationTeamSelectionProps) {
  const showSelectionHeader = teamsLoading || teamsHaveError || availableTeams.length === 0;
  const pageCount = Math.ceil(availableTeams.length / TEAMS_PER_PAGE);
  const pagedTeams = availableTeams.slice(
    teamPage * TEAMS_PER_PAGE,
    (teamPage + 1) * TEAMS_PER_PAGE,
  );

  return (
    <div className={styles.teamSelectionContainer}>
      {showSelectionHeader && (
        <div className={styles.teamSelectionHeader}>
          <Brain size={28} className={styles.teamSelectionIcon} aria-hidden="true" />
          <h2 className={styles.teamSelectionTitle}>Select a Team for Evaluation</h2>
          <p className={styles.teamSelectionSubtitle}>
            Choose a running team to evaluate with KYAI. Only deployed and running teams are shown.
          </p>
        </div>
      )}

      {teamsLoading ? (
        <div className={styles.teamSelectionLoading}>
          <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
          <span>Loading available teams...</span>
        </div>
      ) : teamsHaveError ? (
        <div className={styles.teamSelectionError} role="alert">
          <AlertCircle size={32} aria-hidden="true" />
          <span>Failed to load teams. Please try again.</span>
          <button type="button" onClick={onRetryTeams} className="btn-secondary">
            Retry
          </button>
        </div>
      ) : availableTeams.length === 0 ? (
        <div className={styles.teamSelectionEmpty}>
          <Server size={48} aria-hidden="true" />
          <h3>No Teams Available</h3>
          <p>
            There are no teams available. Please create a team first before running KYAI evaluation.
          </p>
        </div>
      ) : (
        <div className={styles.selectionContent}>
          <p className={styles.selectionHint}>
            Select a team and define your evaluation prompt to get started.
          </p>

          <div className={styles.selectionSection}>
            <div className={styles.sectionLabel}>
              <span>1. Select Team</span>
              {selectedTeamId && (
                <CheckCircle size={16} className={styles.sectionComplete} aria-hidden="true" />
              )}
            </div>
            <div className={styles.teamList} role="radiogroup" aria-label="Team">
              {pagedTeams.map((team) => {
                const isRunning = team.is_deployed && team.deployment_status === "running";
                const isSelected = selectedTeamId === team.team_id;
                return (
                  <button
                    key={team.team_id}
                    type="button"
                    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card; a native `<input type="radio">` can't be skinned to this card layout without losing the design system's visual language, so `role="radio"`/`aria-checked` (a standard WAI-ARIA radio pattern) is used instead.
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectTeam(team.team_id)}
                    className={cn(styles.teamCard, isSelected && styles.teamCardSelected)}
                  >
                    <div className={styles.teamCardHeader}>
                      <div className={styles.teamCardInfo}>
                        <h3 className={styles.teamCardTitle}>{team.team_name}</h3>
                        <p className={styles.teamCardDescription}>
                          {team.description || "No description available"}
                        </p>
                      </div>
                      <div className={styles.teamCardStatus}>
                        {isRunning ? (
                          <span className={styles.statusBadgeRunning}>
                            <CheckCircle size={14} aria-hidden="true" />
                            Running
                          </span>
                        ) : (
                          <span className={styles.statusBadgeNotDeployed}>
                            <Circle size={14} aria-hidden="true" />
                            Not Deployed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.teamCardMeta}>
                      <span className={styles.teamCardMetaItem}>
                        <Users size={14} aria-hidden="true" />
                        {team.agent_count} Agents
                      </span>
                      {isRunning && (
                        <span className={styles.teamCardMetaItem}>
                          {team.agents_ready ?? 0}/{team.agents_total ?? team.agent_count} Ready
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {availableTeams.length > TEAMS_PER_PAGE && (
              <div className={styles.teamPagination}>
                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => onTeamPageChange(teamPage - 1)}
                  disabled={teamPage === 0}
                  aria-label="Previous page of teams"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <span className={styles.paginationInfo}>
                  Page {teamPage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => onTeamPageChange(teamPage + 1)}
                  disabled={(teamPage + 1) * TEAMS_PER_PAGE >= availableTeams.length}
                  aria-label="Next page of teams"
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <span className={styles.paginationTotal}>{availableTeams.length} teams</span>
              </div>
            )}
          </div>

          <div className={styles.sectionDivider} />

          <div className={styles.selectionSection}>
            <div className={styles.sectionLabel}>
              <span>2. Select or Create Prompt</span>
              {hasValidPrompt && (
                <CheckCircle size={16} className={styles.sectionComplete} aria-hidden="true" />
              )}
            </div>
            <div className={styles.promptSection}>
              <div className={styles.promptLabel}>Predefined Prompts (optional)</div>
              <div className={styles.promptList} role="radiogroup" aria-label="Predefined prompt">
                {PREDEFINED_PROMPTS.map((prompt) => {
                  const isSelected = selectedPromptId === prompt.id;
                  return (
                    <button
                      key={prompt.id}
                      type="button"
                      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card; see the team radio card above for the same rationale.
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectPrompt(isSelected ? null : prompt.id)}
                      className={cn(styles.promptCard, isSelected && styles.promptCardSelected)}
                    >
                      <div className={styles.promptCardHeader}>
                        <h4 className={styles.promptCardTitle}>{prompt.title}</h4>
                        {isSelected && (
                          <CheckCircle
                            size={16}
                            className={styles.promptCardCheck}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className={styles.promptCardDescription}>{prompt.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className={styles.additionalInstructionsSection}>
                <label className={styles.promptLabel} htmlFor="evaluation-additional-instructions">
                  <Plus size={14} aria-hidden="true" />
                  Additional Instructions{" "}
                  {selectedPromptId ? "(extends selected prompt)" : "(or use as main prompt)"}
                </label>
                <textarea
                  id="evaluation-additional-instructions"
                  className={styles.additionalInstructionsInput}
                  placeholder={
                    selectedPromptId
                      ? "Add specific instructions to extend the selected prompt..."
                      : "Enter your custom evaluation prompt here..."
                  }
                  value={additionalInstructions}
                  onChange={(event) => onAdditionalInstructionsChange(event.target.value)}
                  rows={4}
                />
              </div>
              {hasValidPrompt && (
                <div className={styles.promptPreview}>
                  <div className={styles.promptPreviewLabel}>Final Prompt Preview:</div>
                  <div className={styles.promptPreviewContent}>{finalPrompt}</div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.teamSelectionActions}>
            {selectedTeamId && hasValidPrompt && (
              <div className={styles.selectionSummary}>
                <CheckCircle size={14} className={styles.sectionComplete} aria-hidden="true" />
                <span>
                  Ready to evaluate{" "}
                  <strong>
                    {availableTeams.find((team) => team.team_id === selectedTeamId)?.team_name ??
                      "selected team"}
                  </strong>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onStartEvaluation}
              disabled={!selectedTeamId || !hasValidPrompt || isStarting}
              className="btn-primary"
            >
              {isStarting ? (
                <>
                  <Loader2 size={16} className={styles.loadingIcon} aria-hidden="true" />
                  Starting Evaluation...
                </>
              ) : (
                <>
                  <Play size={16} aria-hidden="true" />
                  Start KYAI Evaluation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {streamError && (
        <div className={styles.teamSelectionErrorMessage} role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          {streamError}
        </div>
      )}
    </div>
  );
}

export default EvaluationTeamSelection;
