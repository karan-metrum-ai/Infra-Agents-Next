import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.overlay}>
      <Spinner size="lg" aria-label="Loading" />
    </div>
  );
}
