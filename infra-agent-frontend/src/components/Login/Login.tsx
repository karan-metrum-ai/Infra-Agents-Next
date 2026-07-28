"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, useGetSessionQuery } from "@/features/auth/authApi";
import { useAppSelector } from "@/hooks/useAppSelector";
import { selectIsAuthenticated, selectIsLoading } from "@/features/auth/authSelectors";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./Login.module.css";

/** Redirects to the BFF login endpoint, or onward per onboarding status if already signed in. */
export function Login() {
  useGetSessionQuery();
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const { isLoading: isOnboardingLoading, getPostLoginRedirect } = useOnboardingStatus();

  useEffect(() => {
    if (isLoading || isOnboardingLoading) return;

    if (isAuthenticated) {
      router.replace(getPostLoginRedirect());
    } else {
      login();
    }
  }, [isAuthenticated, isLoading, isOnboardingLoading, getPostLoginRedirect, router]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <Spinner size="xl" />
        <p className={styles.subtitle}>Redirecting to login...</p>
      </div>
    </div>
  );
}

export default Login;
