"use client";

import { Component, type ReactNode } from "react";
import styles from "./blocks.module.css";

interface Props {
  blockId: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors from individual block components so a single
 * malformed block does not take down the entire trace panel.
 *
 * Class component is required here — `getDerivedStateFromError` has no
 * hook equivalent; this is the one place React itself mandates a class.
 */
class BlockErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.blockFrame} data-status="failed" data-locked="true">
          <div className={styles.blockHeader}>
            <span
              className={[styles.statusDot, styles.statusFailed].join(" ")}
              aria-hidden="true"
            />
            <span>Render Error</span>
          </div>
          <div className={styles.blockBody}>
            <span className={styles.errorMessage}>
              Block {this.props.blockId} failed to render.
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BlockErrorBoundary;
