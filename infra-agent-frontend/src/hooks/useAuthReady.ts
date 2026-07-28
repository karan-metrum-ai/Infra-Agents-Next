"use client";

import { useGetSessionQuery } from "@/features/auth/authApi";
import { useAppSelector } from "@/hooks/useAppSelector";
import { selectIsFullyAuthenticated, selectIsLoading } from "@/features/auth/authSelectors";

/**
 * Triggers (and subscribes to) the session bootstrap query, returning true
 * once the user is fully authenticated and their role has been resolved.
 * Use this to gate RTK Query hooks so they do not fire before the session
 * cookie and identity are available.
 */
export function useAuthReady(): boolean {
  useGetSessionQuery();
  const isLoading = useAppSelector(selectIsLoading);
  const isFullyAuthenticated = useAppSelector(selectIsFullyAuthenticated);
  return !isLoading && isFullyAuthenticated;
}
