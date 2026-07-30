import { createContext } from "react";

/**
 * Whether the enclosing trace is a live/executing flow. Defaults to
 * ``true`` so any consumer rendered outside a provider keeps today's
 * expanded-by-default behavior — only `LiveBlockStream` provides the
 * real value, scoped to completed/replayed flows.
 */
export const TraceLivenessContext = createContext<boolean>(true);
