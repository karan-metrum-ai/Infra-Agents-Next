"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetSessionQuery, login } from "@/features/auth/authApi";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  selectIsAuthenticated,
  selectIsLoading,
  selectIsOrgResolved,
  selectUserRole,
} from "@/features/auth/authSelectors";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./AuthGuard.module.css";
import type { AuthGuardProps } from "./AuthGuard.types";

/**
 * Protects a route segment behind session authentication and (optionally)
 * a role allow-list.
 *
 * SECURITY NOTE: This is a UX convenience only. The real authorization
 * boundary is the backend Casbin policy, which rejects requests from
 * unauthorized roles regardless of what the frontend allows.
 *
 * Privacy-policy acceptance gating (present in the Vite AuthGuard) is
 * deferred until Phase 4 wires up the legal pages / PrivacyPolicyModal.
 */
export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const router = useRouter();
  useGetSessionQuery();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const isOrgResolved = useAppSelector(selectIsOrgResolved);
  const userRole = useAppSelector(selectUserRole);

  const roleMismatch =
    Boolean(requiredRoles?.length) &&
    isOrgResolved &&
    !requiredRoles?.some((role) => role === userRole);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (roleMismatch) {
      router.replace("/dashboard/live");
    }
  }, [roleMismatch, router]);

  const isPending = isLoading || !isOrgResolved || !isAuthenticated || roleMismatch;

  if (isPending) {
    return (
      <output className={styles.loading} aria-live="polite">
        <Spinner size="lg" aria-label="Checking session" />
      </output>
    );
  }

  return children;
}
