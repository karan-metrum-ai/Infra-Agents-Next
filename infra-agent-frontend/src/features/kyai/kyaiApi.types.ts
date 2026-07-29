/**
 * Raw KYAI trajectory/evaluation payloads. The backend returns a dynamic
 * object keyed by agent name (plus a `metadata` key) rather than a fixed
 * schema — `EvaluationModal`'s `transformTrajectoryData` helper is what
 * shapes this into the strongly-typed `TrajectoryData` the UI renders, so
 * the RTK Query response type here stays a documented "raw JSON blob"
 * rather than a guessed closed shape.
 */
export type RawTrajectoryPayload = Record<string, unknown>;
