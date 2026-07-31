"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Search, Upload } from "lucide-react";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import { Separator } from "@/components/ui/Separator/Separator";
import { BulkUploadStepper } from "@/components/BulkUploadStepper/BulkUploadStepper";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import styles from "./OnboardingFlow.module.css";

type DiscoveryMode = "bulk" | "auto" | "manual";

/**
 * `/onboarding` — Infrastructure Discovery Hub.
 *
 * Ported from the Vite app's `components/OnboardingFlow.tsx` (1322 LOC),
 * narrowed to what's actually reachable in the shipped product. The Vite
 * source's `currentStep` state machine had 5 states
 * (`welcome/method/manual/discovery/topology`) but only ever initializes to
 * `'discovery'` and **never transitions away from it anywhere in the file**
 * (confirmed by grepping every `setCurrentStep` call site: two exist, both
 * inside the `'topology'` branch itself, which is therefore unreachable
 * dead code -- same "confirmed zero live code path" bar this migration
 * already applied to `TeamBuilder.tsx`/`RecommendedTeamDisplay.tsx`/
 * `GhostTechnician`). Similarly, the Auto Discovery and Manual Entry tabs
 * both render with a hardcoded `disabled` attribute (not a conditional) in
 * the source, so `discoveryMode` can only ever be `'bulk'` in the running
 * app -- their large scan/topology implementations (`lib/discoveryApi.ts`,
 * `infrastructureSlice.ts`, `useInfrastructurePersistence.ts`,
 * `generateAdvancedTopology`, a second full-screen React-Flow canvas step)
 * are not ported for the same reason: nothing in the live UI can ever
 * reach them. The tabs themselves ARE ported (visibly present, disabled,
 * matching the real shipped UI exactly) so a future phase can wire them up
 * without redesigning this shell.
 *
 * Sans-effect: zero direct `useEffect` calls. `discoveryMode` is plain
 * `useState` driven entirely by click handlers (Pattern 3); there is no
 * data fetching or external-system sync in this component at all -- the
 * only genuine async work (the CSV upload itself) lives inside
 * `BulkUploadStepper`.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const { markStepComplete } = useOnboardingStatus();
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("bulk");

  const handleBulkUploadComplete = () => {
    markStepComplete("discovery");
    router.push("/digital-twin");
  };

  return (
    <div className={styles.onboardingFlow}>
      <div className={styles.topBar}>
        <div className={styles.logoPanel}>
          <CenterNavPanel />
          <Image
            src="/metrum-logo-white.webp"
            alt="Metrum AI"
            width={120}
            height={28}
            className={styles.logo}
            priority
            decoding="async"
          />
          <Image
            src="/android-chrome-512x512.png"
            alt="Metrum AI"
            width={22}
            height={22}
            className={styles.logoIcon}
            decoding="async"
          />
          <Separator orientation="vertical" className={styles.separatorSm} />
          <h1 className={styles.title}>ONBOARDING</h1>
        </div>
        <div className={styles.rightPanel}>
          <ProfileAvatar position="inline" />
        </div>
      </div>

      <div className={styles.onboardingContent}>
        <div className={styles.hudContainer}>
          <div className={styles.hudHeader}>
            <h1 className={styles.hudTitle}>Infrastructure Discovery Hub</h1>
            <p className={styles.hudSubtitle}>Discover and map your infrastructure devices</p>
          </div>

          <div className={styles.mainTabs} role="tablist" aria-label="Discovery mode">
            <button
              type="button"
              role="tab"
              aria-selected={discoveryMode === "bulk"}
              onClick={() => setDiscoveryMode("bulk")}
              className={`${styles.mainTab} ${discoveryMode === "bulk" ? styles.mainTabActive : ""}`}
            >
              <Upload className={styles.mainTabIcon} aria-hidden="true" />
              <div className={styles.mainTabContent}>
                <span className={styles.mainTabTitle}>Bulk Upload</span>
                <span className={styles.mainTabDesc}>Upload one combined CSV</span>
              </div>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              disabled
              title="Auto Discovery — coming soon"
              className={styles.mainTab}
            >
              <Search className={styles.mainTabIcon} aria-hidden="true" />
              <div className={styles.mainTabContent}>
                <span className={styles.mainTabTitle}>Auto Discovery</span>
                <span className={styles.mainTabDesc}>Scan network automatically</span>
              </div>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              disabled
              title="Manual Entry — coming soon"
              className={styles.mainTab}
            >
              <Plus className={styles.mainTabIcon} aria-hidden="true" />
              <div className={styles.mainTabContent}>
                <span className={styles.mainTabTitle}>Manual Entry</span>
                <span className={styles.mainTabDesc}>Add devices manually</span>
              </div>
            </button>
          </div>

          <div className={styles.contentArea} role="tabpanel">
            <div className={styles.bulkUploadContent}>
              <div className={styles.bulkUploadCard}>
                <BulkUploadStepper onComplete={handleBulkUploadComplete} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
