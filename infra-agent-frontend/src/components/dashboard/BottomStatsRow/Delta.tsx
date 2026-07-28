import styles from "./BottomStatsRow.module.css";

interface DeltaProps {
  value: number;
  invert?: boolean;
  suffix?: string;
}

export function Delta({ value, invert, suffix = "" }: DeltaProps) {
  if (value === 0) {
    return (
      <span className={styles.deltaFlat} title="No change">
        —
      </span>
    );
  }
  const isUp = value > 0;
  const isGood = invert ? !isUp : isUp;
  return (
    <span className={isGood ? styles.deltaGood : styles.deltaBad}>
      {isUp ? "▲" : "▼"} {Math.abs(value)}
      {suffix}
    </span>
  );
}

export default Delta;
