export interface BulkUploadStepperProps {
  /**
   * Called when the user clicks "Continue" after a successful upload.
   * Omit to hide the continue CTA (e.g. when this stepper is used
   * standalone rather than as one step of a larger wizard).
   */
  onComplete?: () => void;
}
