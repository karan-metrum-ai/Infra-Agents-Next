export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, waitMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), waitMs);
  };
}
