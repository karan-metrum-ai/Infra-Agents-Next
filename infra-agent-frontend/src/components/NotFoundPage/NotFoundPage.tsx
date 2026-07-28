"use client";

import { ArrowLeft, Home } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Plasma } from "@/components/Plasma/Plasma";
import styles from "./NotFoundPage.module.css";

/** Branded 404 page for unknown or unavailable routes. */
export function NotFoundPage() {
  const router = useRouter();

  return (
    <main className={styles.overlay} aria-labelledby="not-found-title">
      <div className={styles.background} aria-hidden="true">
        <Plasma speed={0.45} opacity={0.9} scale={1.15} />
      </div>

      <div className={styles.content}>
        <Image
          src="/metrum-logo-white.webp"
          alt="Metrum AI"
          className={styles.logo}
          width={196}
          height={56}
          draggable={false}
          priority
        />

        <p className={styles.code} aria-hidden="true">
          404
        </p>

        <h1 id="not-found-title" className={styles.title}>
          Page not found
        </h1>

        <p className={styles.subtitle}>
          The page you requested does not exist or is no longer available.
        </p>

        <div className={styles.actions}>
          <Button
            className={styles.actionButton}
            variant="default"
            onClick={() => router.push("/")}
          >
            <Home size={16} data-icon aria-hidden="true" />
            Go to home
          </Button>
          <Button className={styles.actionButton} variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={16} data-icon aria-hidden="true" />
            Go back
          </Button>
        </div>

        <span className={styles.brand}>Metrum InfraAgents</span>
      </div>
    </main>
  );
}

export default NotFoundPage;
