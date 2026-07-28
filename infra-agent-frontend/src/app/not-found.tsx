import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1>404</h1>
      <p>This page doesn&apos;t exist.</p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Back to home
      </Button>
    </div>
  );
}
