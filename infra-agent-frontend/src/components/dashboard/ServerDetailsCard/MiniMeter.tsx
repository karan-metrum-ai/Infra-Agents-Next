import styles from "./MiniMeter.module.css";

interface MiniMeterProps {
  value: number | null | undefined;
  color?: string;
}

/** Slim horizontal progress bar, 0-100%. */
export function MiniMeter({ value, color = "var(--primary)" }: MiniMeterProps) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default MiniMeter;
