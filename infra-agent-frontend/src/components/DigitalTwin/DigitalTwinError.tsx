"use client";

/**
 * DigitalTwinError Component
 *
 * Full-screen error state for the Digital Twin / Physical Systems page.
 * Displays when API fetch fails or returns invalid data.
 * Visual language matches the LiveDashboard error states.
 */

import { RefreshCw, WifiOff } from "lucide-react";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import styles from "./DigitalTwinStates.module.css";

interface DigitalTwinErrorProps {
  error: FetchBaseQueryError | SerializedError | { message: string };
  refetch: () => void;
}

function getErrorMessage(
  error: FetchBaseQueryError | SerializedError | { message: string },
): string {
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("status" in error) {
    if (typeof error.status === "number") {
      switch (error.status) {
        case 404:
          return "Infrastructure data endpoint not found (404)";
        case 500:
          return "Server error while fetching infrastructure data (500)";
        case 503:
          return "Infrastructure service unavailable (503)";
        default:
          return `Failed to fetch infrastructure data (${error.status})`;
      }
    }
    if (error.status === "FETCH_ERROR") {
      return "Network error -- unable to reach the server. The backend service may be down or unreachable.";
    }
    if (error.status === "TIMEOUT_ERROR") {
      return "Request timed out -- the server took too long to respond.";
    }
    if (error.status === "PARSING_ERROR") {
      return "Invalid response received from server.";
    }
  }

  return "An unexpected error occurred while loading data.";
}

export function DigitalTwinError({ error, refetch }: DigitalTwinErrorProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className={styles.errorContainer} role="alert" aria-live="assertive">
      <div className={styles.errorIconWrap} aria-hidden="true">
        <WifiOff size={28} />
      </div>

      <h2 className={styles.errorTitle}>Unable to Load Infrastructure Data</h2>

      <p className={styles.errorMessage}>{errorMessage}</p>

      <button type="button" className={styles.retryButton} onClick={refetch}>
        <RefreshCw size={14} aria-hidden="true" />
        Retry Connection
      </button>

      <p className={styles.helpText}>
        If the problem persists, check your network connection
        <br />
        or contact your system administrator.
      </p>
    </div>
  );
}

export default DigitalTwinError;
