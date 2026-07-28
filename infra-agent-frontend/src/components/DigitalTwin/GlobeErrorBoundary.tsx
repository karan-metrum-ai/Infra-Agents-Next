"use client";

/**
 * Catches the THREE.js WebGLRenderer crash (the "error2 is not a function"
 * TypeError) that react-globe.gl can throw mid-render on some GPU/driver
 * combinations, and renders a themed fallback instead of a blank screen.
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import styles from "./DataCenterGlobe.module.css";

interface GlobeErrorBoundaryProps {
  children: ReactNode;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
}

export class GlobeErrorBoundary extends Component<
  GlobeErrorBoundaryProps,
  GlobeErrorBoundaryState
> {
  state: GlobeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobeErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.webglFallback} role="alert">
          <AlertTriangle size={36} className={styles.webglFallbackIcon} aria-hidden="true" />
          <span className={styles.webglFallbackText}>3D globe could not be rendered.</span>
          <span className={styles.webglFallbackHint}>
            WebGL is unavailable in this browser session.
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}
