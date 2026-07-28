"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LogOut, Building2, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Banner } from "@/components/ui/Banner/Banner";
import { Button } from "@/components/ui/Button/Button";
import { Plasma } from "@/components/Plasma/Plasma";
import { RotatingText } from "@/components/RotatingText/RotatingText";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  login,
  logout,
  useAcceptPolicyMutation,
  useGetCurrentPolicyQuery,
  useGetPolicyAcceptanceQuery,
  useGetSessionQuery,
} from "@/features/auth/authApi";
import {
  selectIsAuthenticated,
  selectIsLoading,
  selectOrganization,
  selectUser,
} from "@/features/auth/authSelectors";
import { cn } from "@/lib/utils";
import styles from "./Landing.module.css";

// Messages for the BFF's `?auth_error=<code>` redirect (infra_agents/auth/client/main.py).
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Your login session expired. Please sign in again.",
  token_exchange_failed: "We couldn't complete sign-in. Please try again.",
  session_creation_failed:
    "We couldn't create your session. Please try again or contact your administrator.",
  pkce_store_failed: "A temporary error occurred starting sign-in. Please try again.",
  access_denied: "Access denied. Contact your administrator if you believe this is a mistake.",
  unauthorized: "Sign-up is disabled on this platform. Contact your administrator for access.",
};

export function Landing() {
  const [isOpen, setIsOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsHint, setShowTermsHint] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (!authError) return;

    toast.error("Sign-in failed", {
      description: AUTH_ERROR_MESSAGES[authError] || `Please try again (${authError}).`,
      duration: 8000,
    });

    const next = new URLSearchParams(searchParams);
    next.delete("auth_error");
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useGetSessionQuery();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const user = useAppSelector(selectUser);
  const organization = useAppSelector(selectOrganization);

  const { data: policyAcceptance } = useGetPolicyAcceptanceQuery(undefined, {
    skip: !isAuthenticated || isLoading,
  });
  const { data: currentPolicy } = useGetCurrentPolicyQuery(undefined, {
    skip: !isAuthenticated || isLoading,
  });
  const [acceptPolicy] = useAcceptPolicyMutation();

  useEffect(() => {
    if (policyAcceptance && !policyAcceptance.requires_renewal) {
      setAgreedToTerms(true);
    }
  }, [policyAcceptance]);

  const handleGoToDashboard = async () => {
    if (!agreedToTerms) {
      setShowTermsHint(true);
      return;
    }

    if (currentPolicy && policyAcceptance?.requires_renewal) {
      setIsAccepting(true);
      try {
        await acceptPolicy({
          policy_id: currentPolicy.id,
          policy_version: currentPolicy.version,
        }).unwrap();
      } catch (err) {
        console.error("Failed to accept privacy policy:", err);
      } finally {
        setIsAccepting(false);
      }
    }

    router.push("/dashboard/live");
  };

  return (
    <div className={styles.container}>
      <div className={styles.bg}>
        <Plasma />
      </div>

      <Banner
        variant="violet"
        position="top"
        icon={<Sparkles size={14} />}
        dismissible
        storageKey="banner-sprint11-features"
      >
        <strong>New Storage & Liquid Cooling Agents</strong>{" "}
        <span className={styles.bannerMuted}>
          are now available in Infra Agents, along with Team Builder Sandbox Evaluation (Beta).
        </span>
      </Banner>

      <section className={styles.navSection}>
        <div className={styles.navContainer}>
          <div className={styles.navWrapper}>
            <div className={styles.navGrid}>
              <div className={styles.navLogo}>
                <Link href="/">
                  <Image
                    src="/metrum-logo-white.webp"
                    alt="Metrum AI"
                    className={styles.logoImage}
                    width={140}
                    height={40}
                    priority
                  />
                </Link>
              </div>

              <div className={styles.navActions}>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={styles.hamburgerMenu}
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isOpen}
                  aria-controls="landing-mobile-menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line
                      x1="3"
                      y1="6"
                      x2="21"
                      y2="6"
                      className={cn(styles.hamburgerLine, isOpen && styles.hamburgerLine1Open)}
                    />
                    <line
                      x1="3"
                      y1="12"
                      x2="21"
                      y2="12"
                      className={cn(styles.hamburgerLine, isOpen && styles.hamburgerLine2Open)}
                    />
                    <line
                      x1="3"
                      y1="18"
                      x2="21"
                      y2="18"
                      className={cn(styles.hamburgerLine, isOpen && styles.hamburgerLine3Open)}
                    />
                  </svg>
                </button>

                {!isLoading && isAuthenticated && (
                  <>
                    {organization && (
                      <div
                        className={styles.orgBadge}
                        title={`Organization: ${organization.display_name}`}
                      >
                        <Building2 size={20} />
                        <span className={styles.orgName}>{organization.display_name}</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => logout()}
                      className={styles.logoutButton}
                      aria-label={`Logged in as ${user?.name || user?.email}. Log out`}
                    >
                      <LogOut data-icon size={20} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  id="landing-mobile-menu"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className={styles.mobileMenu}
                >
                  <div className={styles.mobileMenuContent}>
                    <button
                      type="button"
                      className={styles.mobileGetStartedBtn}
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/onboarding");
                      }}
                    >
                      Get Started
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroRotatingTitle}>
            <span>Infra</span>
            <RotatingText
              texts={["Agents", "Automation", "Monitoring", "Orchestration"]}
              mainClassName={styles.heroRotatingBadge}
              staggerFrom="last"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-120%", opacity: 0 }}
              staggerDuration={0.02}
              splitLevelClassName={styles.heroRotatingSplit}
              transition={{ type: "spring", damping: 22, stiffness: 180, mass: 1.2 }}
              rotationInterval={3000}
            />
          </h1>

          <p className={styles.heroSubtitle}>
            Transform your infrastructure operations with AI-driven automation, intelligent
            monitoring, and seamless orchestration for enterprise-scale efficiency.
          </p>

          <div className={styles.heroActions}>
            {isAuthenticated ? (
              <div className={styles.heroCtaWrapper}>
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleGoToDashboard}
                  disabled={isAccepting}
                  className={cn(styles.heroCta, !agreedToTerms && styles.heroCtaLocked)}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <span>Go to Dashboard</span>
                      <ArrowRight data-icon size={20} />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={() => login()}
                className={styles.heroCta}
              >
                <span>Get Started</span>
                <ArrowRight data-icon size={20} />
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        {isAuthenticated && (
          <div className={styles.termsFooterBlock}>
            <AnimatePresence>
              {showTermsHint && !agreedToTerms && (
                <motion.p
                  className={styles.termsHint}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  Please accept the Terms &amp; Conditions to continue.
                </motion.p>
              )}
            </AnimatePresence>
            <label className={styles.termsCheckboxLabel}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (e.target.checked) setShowTermsHint(false);
                }}
                className={styles.termsCheckbox}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms-and-conditions" className={styles.termsInlineLink}>
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className={styles.termsInlineLink}>
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>
        )}
        <div className={styles.footerInner}>
          <span className={styles.footerCopy}>&copy; {new Date().getFullYear()} Metrum AI</span>
          <span className={styles.footerSep} aria-hidden="true" />
          <Link href="/privacy-policy" className={styles.footerLink}>
            Privacy Policy
          </Link>
          <span className={styles.footerSep} aria-hidden="true" />
          <Link href="/terms-and-conditions" className={styles.footerLink}>
            Terms &amp; Conditions
          </Link>
          <span className={styles.footerSep} aria-hidden="true" />
          <Link href="/system-check" className={styles.footerLink}>
            System Check
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
